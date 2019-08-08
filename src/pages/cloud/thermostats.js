/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {EventsWebSocketClient} from '../../components/websocket-events';
import {ThermostatGroup} from '../../containers/cloud/thermostat-group';
import {Thermostat} from '../../containers/cloud/thermostat';

@inject(Factory.of(Thermostat), Factory.of(ThermostatGroup))
export class Thermostats extends Base {
    constructor(thermostatFactory, thermostatGroupFactory, ...rest) {
        super(...rest);
        this.thermostatFactory = thermostatFactory;
        this.globalThermostatFactory = thermostatGroupFactory;
        this.webSocket = new EventsWebSocketClient(['THERMOSTAT_CHANGE']);
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            if (!this.webSocket.isAlive(30)) {
                await this.loadThermostats();
                await this.loadThermostatUnits();
                this.signaler.signal('reload-thermostats');
            }
        }, 5000);
        this.initVariables();
    }

    initVariables() {
        this.thermostatsLoading = true;
        this.globalThermostatDefined = false;
        this.globalThermostat = undefined;
        this.allThermostats = [];
        this.installationHasUpdated = false;
        this.globalThermostats = [];
        this.globalPreset = undefined;
    }

    @computedFrom('thermostatsLoading', 'allThermostats', 'globalThermostat.isHeating')
    get temperatureThermostats() {
        let thermostats = [];
        if (this.globalThermostat !== undefined) {
            for (let thermostat of this.allThermostats) {
                if (!thermostat.isRelay && this.globalThermostat.mode === 'HEATING' && thermostat.hasHeating) {
                    thermostats.push(thermostat);
                }

                if (!thermostat.isRelay && this.globalThermostat.mode === 'COOLING' && thermostat.hasCooling) {
                    thermostats.push(thermostat);
                }
            }
            let presetCount = 0;
            if (thermostats.length !== 0) {
                for(let thermostat of thermostats) {
                    if (this.globalPreset !== thermostat.preset.toLowerCase()) {
                        this.globalPreset = thermostat.preset.toLowerCase();
                        presetCount++;
                    }
                    if(presetCount > 1) {
                        this.globalPreset = undefined;
                        break;
                    }
                }
            }
        }
        return thermostats;
    }

    @computedFrom('thermostatsLoading', 'allThermostats', 'globalThermostat.isHeating')
    get onOffThermostats() {
        let thermostats = [];
        if (this.globalThermostat !== undefined) {
            for (let thermostat of this.allThermostats) {
                if (thermostat.isRelay) {
                    thermostats.push(thermostat);
                }
            }
        }
        return thermostats;
    }

    async loadThermostatUnits() {
        try{
            var data = await this.api.getThermostatUnits();
            Toolbox.crossfiller(data.data, this.allThermostats, 'id', (id) => {
                return this.thermostatFactory(id);
            });
            for (let thermostat of this.allThermostats) {
                if (this.globalThermostat.isHeating) {
                    if (thermostat.hasHeating) {
                        thermostat.sensorId = thermostat.configuration.heating.sensor_id;
                    }
                } else {
                    if (thermostat.hasCooling) {
                        thermostat.sensorId = thermostat.configuration.cooling.sensor_id;
                    }
                }
            }
        } catch(error){
            Logger.error(`Unable to get thermostat units: ${error}`);
        } finally {
            this.thermostatsLoading = false;
        }
    }

    async loadThermostats() {
        try {
            let data = await this.api.getThermostatGroups();
            Toolbox.crossfiller(data.data, this.globalThermostats, 'id', (id) => {
                return this.globalThermostatFactory(id);
            });
            this.globalThermostat = this.globalThermostats[0];
            this.globalThermostatDefined = true;
        } catch (error) {
            Logger.error(`Could not load Thermostats: ${error.message}`);
        } finally {
            this.thermostatsLoading = false;    
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
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
