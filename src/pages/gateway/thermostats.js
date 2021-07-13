/*
 * Copyright (C) 2016 OpenMotics BV
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import '../cloud/thermostats/thermostats-ui';
import $ from 'jquery';
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {EventsWebSocketClient} from '../../components/websocket-events';
import {GlobalThermostat} from '../../containers/gateway/thermostat-global';
import {Thermostat} from '../../containers/gateway/thermostat';

@inject(Factory.of(Thermostat), Factory.of(GlobalThermostat))
export class Thermostats extends Base {
    constructor(thermostatFactory, globalThermostatFactory, ...rest) {
        super(...rest);
        this.thermostatFactory = thermostatFactory;
        this.globalThermostatFactory = globalThermostatFactory;
        this.webSocket = new EventsWebSocketClient(['THERMOSTAT_CHANGE']);
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
            if (!this.webSocket.isAlive(30)) {
                await this.loadThermostats();
                this.signaler.signal('reload-thermostats');
                setTimeout(() => this.drawThermostats(), 1000);
            }
        }, 60000);

        this.initVariables();
    }

    initVariables() {
        this.thermostatsLoading = true;
        this.globalThermostatDefined = false;
        this.globalThermostat = undefined;
        this.heatingThermostats = [];
        this.heatingThermostatMap = {};
        this.coolingThermostats = [];
        this.coolingThermostatMap = {};
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
    }

    @computedFrom('globalThermostat', 'globalThermostat.isHeating', 'heatingThermostats', 'coolingThermostats')
    get temperatureThermostats() {
        let thermostats = [];
        let allThermostats = this.globalThermostat !== undefined && this.globalThermostat.isHeating ? this.heatingThermostats : this.coolingThermostats;
        for (let thermostat of allThermostats) {
            if (!thermostat.isRelay) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    @computedFrom('globalThermostat', 'globalThermostat.isHeating', 'heatingThermostats', 'coolingThermostats')
    get onOffThermostats() {
        let thermostats = [];
        let allThermostats = this.globalThermostat !== undefined && this.globalThermostat.isHeating ? this.heatingThermostats : this.coolingThermostats;
        for (let thermostat of allThermostats) {
            if (thermostat.isRelay) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    @computedFrom('heatingThermostats', 'coolingThermostats')
    get hasThermostats() {
        for (let thermostat of this.heatingThermostats) {
            if (thermostat.isConfigured) {
                return true;
            }
        }
        for (let thermostat of this.coolingThermostats) {
            if (thermostat.isConfigured) {
                return true;
            }
        }
        return false;
    }

    async processEvent(event) {
        // TODO replace with gateway event subscriptions
        const gatewayId = event.data.location?.gateway_id;
        if (gatewayId !== undefined && gatewayId != this.shared.openMoticGateway?.id) {
            return;
        }
        switch (event.type) {
            case 'THERMOSTAT_CHANGE': {
                for (let map of [this.heatingThermostatMap, this.coolingThermostatMap]) {
                    let thermostat = map[event.data.id];
                    if (thermostat !== undefined) {
                        thermostat.actualTemperature = event.data.status['actual_temperature'];
                        thermostat.currentSetpoint = event.data.status['current_setpoint'];
                        thermostat.output0Value = event.data.status['output_0'];
                        thermostat.output1Value = event.data.status['output_1'];
                    }
                }
                break;
            }
        }
    }

    async loadThermostats() {
        try {
            let [statusData, thermostatData, coolingData] = await Promise.all([
                this.api.getThermostatsStatus(),
                this.api.getThermostatConfigurations(),
                this.api.getCoolingConfigurations()
            ]);
            if (this.globalThermostatDefined === false) {
                this.globalThermostat = this.globalThermostatFactory();
                this.globalThermostatDefined = true;
            }
            this.globalThermostat.fillData(statusData, false);
            if (thermostatData !== undefined && coolingData !== undefined) {
                Toolbox.crossfiller(thermostatData.config, this.heatingThermostats, 'id', (id) => {
                    let thermostat = this.thermostatFactory(id, 'heating');
                    this.heatingThermostatMap[id] = thermostat;
                    return thermostat;
                }, 'mappingConfiguration');
                Toolbox.crossfiller(coolingData.config, this.coolingThermostats, 'id', (id) => {
                    let thermostat = this.thermostatFactory(id, 'cooling');
                    this.coolingThermostatMap[id] = thermostat;
                    return thermostat;
                }, 'mappingConfiguration');
            }
            if (this.globalThermostat.isHeating) {
                Toolbox.crossfiller(statusData.status, this.heatingThermostats, 'id', () => {
                    return undefined;
                }, 'mappingStatus');
            } else {
                Toolbox.crossfiller(statusData.status, this.coolingThermostats, 'id', () => {
                    return undefined;
                }, 'mappingStatus');
            }
            this.heatingThermostats.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.coolingThermostats.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.thermostatsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Thermostats: ${error.message}`);
        }
    }

    drawThermostats() {
        this.temperatureThermostats.forEach(thermostat => {
            const { id, name, configuration, status, currentSetpoint, actualTemperature } = thermostat;
            const options = {
                id: `cUIc_${id}`,
                isHeating: this.globalThermostat.isHeating,
                currentSetpoint,
                actualTemperature,
                thermostat,
                name,
                configuration,
                status,
                width: 250,
                height: 200,
                background_color: '#f5f5f5',
                arc_background_color: '#dddddd',
                hot_color: '#B94A48',
                cool_color: '#3A87AD',
                thickness: 32,
                arcOffset: 60,
                min: 6,
                max: 32,
                simple: false,
                global: this.globalThermostat,
            };
            $(`#${options.id}`).thermostat_ui(options);
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.webSocket.close();
    }
}
