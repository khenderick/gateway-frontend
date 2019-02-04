/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import {inject, Factory, computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {EventsWebSocketClient} from "../components/websocket-events";
import {GlobalThermostat} from "../containers/thermostat-global";
import {Thermostat} from "../containers/thermostat";

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
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            let now = Toolbox.getTimestamp();
            if (
                this.webSocket.lastDataReceived < now - (1000 * 10) ||
                this.lastThermostatData < now - (1000 * 30)
            ) {
                await this.loadThermostats();
                this.signaler.signal('reload-thermostats');
            }
        }, 5000);

        this.initVariables();
    };

    initVariables() {
        this.thermostatsLoading = true;
        this.globalThermostatDefined = false;
        this.globalThermostat = undefined;
        this.heatingThermostats = [];
        this.coolingThermostats = [];
        this.installationHasUpdated = false;
        this.lastThermostatData = 0;
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
    };

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
        switch (event.type) {
            case 'THERMOSTAT_CHANGE': {
                return this.loadThermostats();
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
                    return this.thermostatFactory(id, 'heating');
                }, 'mappingConfiguration');
                Toolbox.crossfiller(coolingData.config, this.coolingThermostats, 'id', (id) => {
                    return this.thermostatFactory(id, 'cooling');
                }, 'mappingConfiguration');
            }
            if (this.globalThermostat.isHeating) {
                Toolbox.crossfiller(statusData.status, this.heatingThermostats, 'id', (id) => {
                    return this.thermostatFactory(id, 'heating');
                }, 'mappingStatus');
            } else {
                Toolbox.crossfiller(statusData.status, this.coolingThermostats, 'id', (id) => {
                    return this.thermostatFactory(id, 'cooling');
                }, 'mappingStatus');
            }
            this.heatingThermostats.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.coolingThermostats.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.thermostatsLoading = false;
            this.lastThermostatData = Toolbox.getTimestamp();
        } catch (error) {
            console.error(`Could not load Thermostats: ${error.message}`);
        }
    };

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            console.error(`Could not start websocket for realtime data: ${error}`);
        }
    };

    deactivate() {
        this.refresher.stop();
        this.webSocket.close();
    };
}
