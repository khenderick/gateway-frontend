/*
 * Copyright (C) 2019 OpenMotics BV
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
import './thermostats-ui';
import $ from 'jquery';
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {EventsWebSocketClient} from 'components/websocket-events';
import {ThermostatGroup} from 'containers/cloud/thermostat-group';
import {Thermostat} from 'containers/cloud/thermostat';

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
    }

    @computedFrom('thermostatsLoading', 'allThermostats', 'globalThermostat.isHeating')
    get temperatureThermostats() {
        let thermostats = [];
        if (this.globalThermostat !== undefined) {
            for (let thermostat of this.allThermostats) {
                if (!thermostat.isRelay && this.globalThermostat.isHeating && thermostat.hasHeating) {
                    thermostats.push(thermostat);
                }
                if (!thermostat.isRelay && !this.globalThermostat.isHeating && thermostat.hasCooling) {
                    thermostats.push(thermostat);
                }
            }
        }
        return thermostats;
    }

    @computedFrom('allThermostats.length')
    get globalPreset() {
        let presetCount = 0;
        let globalPreset = undefined;
        if (this.allThermostats.length !== 0) {
            for(let thermostat of this.allThermostats) {
                if (globalPreset !== thermostat.preset.toLowerCase()) {
                    globalPreset = thermostat.preset.toLowerCase();
                    presetCount++;
                }
                if(presetCount > 1) {
                    globalPreset = undefined;
                    break;
                }
            }
        }
        return globalPreset;
    }

    set globalPreset(value) {
        // This value itself is read only, but needed to allow binding
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
        try {
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
        } catch (error){
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

        const options = {
            id: 'cUIc', // thermostat_nr(),
            current_setpoint: 24, // current_setpoint(),
            name: 'Test name', // name(),
            width: 250,
            height: 200,
            background_color: 'yellow', // $('#well_bgc').css('backgroundColor'),
            arc_background_color: '#dddddd',
            hot_color: '#B94A48',
            cool_color: '#3A87AD',
            thickness: 32,
            arcOffset: 60,
            min: 6, //min_value(),
            max: 32, //max_value(),
            simple: true, //is_simple()
        };
        console.log($('#cUIc'));
        $('#cUIc').thermostat_ui(options);
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
