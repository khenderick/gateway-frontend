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
import _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';
import {inject, Factory, computedFrom, bindable, bindingMode} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {EventsWebSocketClient} from 'components/websocket-events';
import {ThermostatGroup} from 'containers/cloud/thermostat-group';
import {Thermostat} from 'containers/cloud/thermostat';

@bindable({
    name: 'until',
    defaultBindingMode: bindingMode.twoWay
})
@inject(Factory.of(Thermostat), Factory.of(ThermostatGroup))
export class Thermostats extends Base {
    constructor(thermostatFactory, thermostatGroupFactory, ...rest) {
        super(...rest);
        this.thermostatFactory = thermostatFactory;
        this.globalThermostatFactory = thermostatGroupFactory;
        this.currentPreset = undefined;
        this.pickerOptions = {
            format: 'YYYY-MM-DD, HH:mm',
        };
        this.untilValue = '';
        this.webSocket = new EventsWebSocketClient(['THERMOSTAT_CHANGE']);
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
        }, 10000);
        this.initVariables();
    }

    async initVariables() {
        this.thermostatsLoading = true;
        this.globalThermostatDefined = false;
        this.globalThermostat = undefined;
        this.themostatIdLoading = undefined;
        this.allThermostats = [];
        this.prevUnitsData = [];
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
        this.globalThermostats = [];
        this.presets = ['AUTO', 'AWAY', 'VACATION', 'PARTY'];
        await this.loadThermostats();
        await this.loadThermostatUnits();
        this.signaler.signal('reload-thermostats');
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
                    this.currentPreset = globalPreset;
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
        this.currentPreset = value;
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

    untilChanged() {
        if (this.untilValue) {
            this.until.methods.date(this.untilValue);
        }
        this.until.events.onShow = e => {
            this.until.methods.minDate(moment().add(10, 'm'));
        }
        this.until.events.onChange = (e) => {
            const until = moment.utc(e.date).unix();
            if (until > moment().unix()) {
                this.api.setThermostatPreset(this.currentPreset.toUpperCase(), until);
            }
        };
    }

    async loadThermostatUnits() {
        try {
            const { data } = await this.api.getThermostatUnits();
            Toolbox.crossfiller(data, this.allThermostats, 'id', (id) => {
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
            const isEqual = this.isArrayEqual(this.prevUnitsData, data);
            if (!isEqual) {
                setTimeout(() => this.drawThermostats(), 100);
            }
            this.prevUnitsData = data;
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
            const preset = this.globalThermostat.schedule.preset;
            if (preset) {
                this.untilValue = +Object.keys(preset)[0] + new Date().getTimezoneOffset() * 60;
            }
        } catch (error) {
            Logger.error(`Could not load Thermostats: ${error.message}`);
        } finally {
            this.thermostatsLoading = false;
        }
    }

    async changePreset(thermostat, preset) {
        const { id } = thermostat;
        try {
            this.themostatIdLoading = id;
            const data = await this.api.setUnitThermostatPreset(id, preset);
            thermostat.status.preset = preset;
            this.themostatIdLoading = '';
        } catch (error) {
            this.themostatIdLoading = '';
            Logger.error(`Could not change Preset: ${error.message}`);
        }
    }

    onPresetChange({ detail: { preset } }) {
        this.temperatureThermostats.forEach(thermostat => {
            thermostat.status.preset = preset.toUpperCase();
        });
        this.drawThermostats();
    }

    onGroupChange() {
        setTimeout(() => this.drawThermostats(), 100);
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

    async processEvent(event) {
        switch (event.type) {
            case 'THERMOSTAT_CHANGE': {
                const { id, status } = event.data;
                const index = this.temperatureThermostats.findIndex(thermostat => thermostat.id === id);
                if (index !== -1) {
                    this.temperatureThermostats[index].status = status;
                    this.temperatureThermostats[index].actualTemperature = status.actual_temperature;
                    this.temperatureThermostats[index].currentSetpoint = status.current_setpoint;
                    this.drawThermostats();
                }
                break;
            }
        }
    }

    isArrayEqual(x, y) {
        if (x.length !== y.length) {
            return false;
        }
        return x.length !== y.length || _(x).differenceWith(y, _.isEqual).isEmpty();
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
    }

    getNLSetUntilText(preset) {
        return this.i18n.tr('pages.setup.thermostats.setuntil').replace('[preset]', preset);
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
