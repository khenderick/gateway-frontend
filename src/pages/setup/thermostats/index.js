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
import './setpoint-configure';
import $ from 'jquery';
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Thermostat} from 'containers/gateway/thermostat';
import {GlobalThermostat} from 'containers/gateway/thermostat-global';
import {Sensor} from 'containers/sensor';
import {Output} from 'containers/output';
import {PumpGroup} from 'containers/pumpgroup';
import {Room} from 'containers/room';
import {ConfigureGlobalThermostatWizard} from 'wizards/configureglobalthermostat/index';
import {ConfigureThermostatWizard} from 'wizards/configurethermostat/index';

@inject(DialogService, Factory.of(Output), Factory.of(Sensor), Factory.of(Thermostat), Factory.of(GlobalThermostat), Factory.of(PumpGroup), Factory.of(Room))
export class Thermostats extends Base {
    constructor(dialogService, outputFactory, sensorFactory, thermostatFactory, globalThermostatFactory, pumpGroupFactory, roomFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.outputFactory = outputFactory;
        this.sensorFactory = sensorFactory;
        this.thermostatFactory = thermostatFactory;
        this.globalThermostatFactory = globalThermostatFactory;
        this.pumpGroupFactory = pumpGroupFactory;
        this.roomFactory = roomFactory;
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadRooms().catch(() => {});
            this.loadThermostats().then(() => {
                this.signaler.signal('reload-thermostats');
            });
            this.loadSensors().then(() => {
                this.signaler.signal('reload-sensors');
            });
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadPumpGroups().then(() => {
                this.signaler.signal('reload-pumpgroups');
            })
        }, 500000);
        this.initVariables();
    }

    initVariables() {
        this.globalThermostatDefined = false;
        this.heatingThermostats = [];
        this.coolingThermostats = [];
        this.thermostatsLoading = true;
        this.thermostatsTypeCopyLoading = undefined;
        this.activeThermostat = undefined;
        this.thermostatsList = [];
        this.capabilities = [];
        this.thermostats = [];
        this.copyTemperature = { heating: {}, cooling: {} };
        this.outputs = [];
        this.outputMap = {};
        this.sensors = [];
        this.sensorMap = {};
        this.heatingPumpGroups = [];
        this.heatingPumpGroupsMap = {};
        this.coolingPumpGroups = [];
        this.coolingPumpGroupsMap = {};
        this.filters = ['configured', 'unconfigured'];
        this.filter = ['configured', 'unconfigured'];
        this.outputsLoading = true;
        this.sensorsLoading = true;
        this.installationHasUpdated = false;
        this.pumpGroupSupport = false;
        this.pumpGroupsUpdated = undefined;
        this.rooms = [];
        this.roomsMap = {};
        this.roomsLoading = true;
    }

    async loadThermostats() {
        try {
            let [thermostatStatus, globalConfiguration, thermostatConfiguration, coolingConfiguration] = await Promise.all([
                this.api.getThermostatsStatus(), this.api.getGlobalThermostatConfiguration(),
                this.api.getThermostatConfigurations(), this.api.getCoolingConfigurations(),
            ]);
            this.api.getGlobalThermostatConfiguration();
            if (this.globalThermostatDefined === false) {
                this.globalThermostat = this.globalThermostatFactory();
                this.globalThermostatDefined = true;
            }
            if (!this.capabilities.includes('heating') && thermostatConfiguration.config.length) this.capabilities.push('heating');
            if (!this.capabilities.includes('cooling') && coolingConfiguration.config.length) this.capabilities.push('cooling');
            this.thermostats = thermostatStatus.status;
            this.thermostatsList = this.thermostats.map(({ name }) => name);
            this.globalThermostat.fillData(thermostatStatus, false);
            this.globalThermostat.fillData(globalConfiguration.config, false);
            Toolbox.crossfiller(thermostatConfiguration.config, this.heatingThermostats, 'id', (id) => {
                return this.thermostatFactory(id, 'heating');
            }, 'mappingConfiguration');
            Toolbox.crossfiller(coolingConfiguration.config, this.coolingThermostats, 'id', (id) => {
                return this.thermostatFactory(id, 'cooling');
            }, 'mappingConfiguration');
            if (this.globalThermostat.isHeating) {
                Toolbox.crossfiller(thermostatStatus.status, this.heatingThermostats, 'id', undefined, 'mappingStatus');
            } else {
                Toolbox.crossfiller(thermostatStatus.status, this.coolingThermostats, 'id', undefined, 'mappingStatus');
            }
            this.heatingThermostats.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.coolingThermostats.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            setTimeout(() => {
                this.drawSetpointConfiguration();
            }, 1000);
            this.thermostatsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Thermostats: ${error.message}`);
        }
    }

    async loadPumpGroups() {
        try {
            let [pumpGroupConfiguration, coolingPumpGroupConfiguration] = await Promise.all([
                this.api.getPumpGroupConfigurations(), this.api.getCoolingPumpGroupConfigurations()
            ]);
            Toolbox.crossfiller(pumpGroupConfiguration.config, this.heatingPumpGroups, 'id', (id, entry) => {
                let pumpGroup = this.pumpGroupFactory(id, 'heating');
                pumpGroup.fillData(entry);
                if (!pumpGroup.inUse) {
                    return undefined;
                }
                this.pumpGroupSupport = true;
                return pumpGroup;
            });
            let heatingPumpGroupsMap = {};
            for (let pumpGroup of this.heatingPumpGroups) {
                for (let output of pumpGroup.outputs) {
                    if (heatingPumpGroupsMap[output] === undefined) {
                        heatingPumpGroupsMap[output] = [];
                    }
                    heatingPumpGroupsMap[output].push(pumpGroup.output);
                    heatingPumpGroupsMap[output].sort();
                }
            }
            this.heatingPumpGroupsMap = heatingPumpGroupsMap;
            this.heatingPumpGroupsLoading = false;
            Toolbox.crossfiller(coolingPumpGroupConfiguration.config, this.coolingPumpGroups, 'id', (id, entry) => {
                let pumpGroup = this.pumpGroupFactory(id, 'cooling');
                pumpGroup.fillData(entry);
                if (!pumpGroup.inUse) {
                    return undefined;
                }
                this.pumpGroupSupport = true;
                return pumpGroup;
            });
            let coolingPumpGroupsMap = {};
            for (let pumpGroup of this.coolingPumpGroups) {
                for (let output of pumpGroup.outputs) {
                    if (coolingPumpGroupsMap[output] === undefined) {
                        coolingPumpGroupsMap[output] = [];
                    }
                    coolingPumpGroupsMap[output].push(pumpGroup.output);
                    coolingPumpGroupsMap[output].sort();
                }
            }
            this.coolingPumpGroupsMap = coolingPumpGroupsMap;
            this.coolingPumpGroupsLoading = false;
            this.pumpGroupsUpdated = Toolbox.getTimestamp();
        } catch (error) {
            Logger.error(`Could not load Pump Group configurations: ${error.message}`);
        }
    }

    async saveConfig(type) {
        try {
            this.thermostatsTypeCopyLoading = type;
            const setConfiguration = type === 'heating' ? 'setThermostatConfiguration' : 'setCoolingConfiguration';
            const { from, to } = this.copyTemperature[type];
            if (from === to) throw Error('Chosen the same thermostats');
            const fromThermostat = this[`${type}Thermostats`].find(({ name }) => name === from);
            const toThermostat = this[`${type}Thermostats`].find(({ name }) => name === to);
            if (!fromThermostat && !toThermostat) throw Error('Thermostats doesn\'t exist');

            await this.api[setConfiguration](
                toThermostat.id,
                {
                    monday: fromThermostat.autoMonday.systemSchedule,
                    tuesday: fromThermostat.autoTuesday.systemSchedule,
                    wednesday: fromThermostat.autoWednesday.systemSchedule,
                    thursday: fromThermostat.autoThursday.systemSchedule,
                    friday: fromThermostat.autoFriday.systemSchedule,
                    saturday: fromThermostat.autoSaturday.systemSchedule,
                    sunday: fromThermostat.autoSunday.systemSchedule
                },
                toThermostat.name,
                toThermostat.output0Id,
                toThermostat.output1Id,
                {
                    P: toThermostat.pidP,
                    I: toThermostat.pidI,
                    D: toThermostat.pidD,
                    int: toThermostat.pidInt
                },
                toThermostat.sensorId,
                toThermostat.room,
                {
                    0: fromThermostat.setpoint0,
                    1: fromThermostat.setpoint1,
                    2: fromThermostat.setpoint2,
                    3: fromThermostat.setpoint3,
                    4: fromThermostat.setpoint4,
                    5: fromThermostat.setpoint5
                }
            );
            this.thermostatsTypeCopyLoading = undefined;
        } catch (error) {
            Logger.error(`Could not set Thermostat configuration: ${error.message}`);
            this.thermostatsTypeCopyLoading = undefined;
        }
    }

    async loadRooms() {
        try {
            let rooms = await this.api.getRooms();
            Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                this.roomsMap[id] = room;
                return room;
            });
            this.roomsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    async loadOutputs() {
        try {
            let data = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[id] = output;
                return output;
            });
            this.outputs.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Ouptut configurations: ${error.message}`);
        }
    }

    async loadSensors() {
        try {
            let [configuration, temperature] = await Promise.all([this.api.getSensorConfigurations(), this.api.getSensorTemperatureStatus()]);
            Toolbox.crossfiller(configuration.config, this.sensors, 'id', (id) => {
                let sensor = this.sensorFactory(id);
                this.sensorMap[id] = sensor;
                return sensor;
            });
            for (let sensor of this.sensors) {
                sensor.temperature = temperature.status[sensor.id];
            }
            this.sensors.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.sensorsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Sensor configurations and statusses: ${error.message}`);
        }
    }

    @computedFrom('activeThermostat')
    get activeThermostatPumpGroupsMap() {
        if (this.activeThermostat === undefined) {
            return {};
        }
        let pumpGroupsMap = this.coolingPumpGroupsMap;
        if (this.activeThermostat.type === 'heating') {
            pumpGroupsMap = this.heatingPumpGroupsMap;
        }
        return pumpGroupsMap;
    }

    @computedFrom('heatingThermostats')
    get filteredHeatingThermostats() {
        let thermostats = [];
        for (let thermostat of this.heatingThermostats) {
            if ((this.filter.contains('unconfigured') && !thermostat.isConfigured) ||
                (this.filter.contains('configured') && thermostat.isConfigured)) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    @computedFrom('coolingThermostats')
    get filteredCoolingThermostats() {
        let thermostats = [];
        for (let thermostat of this.coolingThermostats) {
            if ((this.filter.contains('unconfigured') && !thermostat.isConfigured) ||
                (this.filter.contains('configured') && thermostat.isConfigured)) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    drawSetpointConfiguration() {
        [...this.filteredHeatingThermostats, ...this.filteredCoolingThermostats].forEach(thermostat => {
            if (!thermostat.isConfigured) {
                return;
            }
            const options = {
                prefix: "th",
                type: thermostat.type,
                id: thermostat.id,
                title: thermostat.name,
                // is_changed: thermostat_info.is_changed,
                is_changed: false,
                width: 530,
                height: 190,
                background_color: '#f5f5f5',
                handle_width: 40,
                temp_unit: "&nbsp;&deg;C",
                min: 15,
                max: 25,
                auto_mon : thermostat.autoMonday.systemSchedule,
                auto_tue : thermostat.autoTuesday.systemSchedule,
                auto_wed : thermostat.autoWednesday.systemSchedule,
                auto_thu : thermostat.autoThursday.systemSchedule,
                auto_fri : thermostat.autoFriday.systemSchedule,
                auto_sat : thermostat.autoSaturday.systemSchedule,
                auto_sun : thermostat.autoSunday.systemSchedule,
                // simple: thermostat_info.simple,
                simple: false,
                data_change: (thermostat_data) => {
                    const changedThermostat = [...this.filteredHeatingThermostats, ...this.filteredCoolingThermostats]
                        .find(({ id, type }) => id === thermostat_data.id && type === thermostat_data.type);

                    if (changedThermostat) {
                        changedThermostat.autoMonday.systemSchedule = thermostat_data.auto_mon;
                        changedThermostat.autoTuesday.systemSchedule = thermostat_data.auto_tue;
                        changedThermostat.autoWednesday.systemSchedule = thermostat_data.auto_wed;
                        changedThermostat.autoThursday.systemSchedule = thermostat_data.auto_thu;
                        changedThermostat.autoFriday.systemSchedule = thermostat_data.auto_fri;
                        changedThermostat.autoSaturday.systemSchedule = thermostat_data.auto_sat;
                        changedThermostat.autoSunday.systemSchedule = thermostat_data.auto_sun;
                        changedThermostat.save();
                    }
                },
                label_class: { active: "label label-info", inactive: "label" },
            };
            $(`#thermostatbox_${thermostat.type}_${thermostat.id}`).thermostat(options);
        })
    }

    filterText(filter) {
        return this.i18n.tr(`pages.setup.thermostats.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-thermostats');
    }

    selectThermostat(thermostatId, type) {
        let foundThermostat = undefined;
        if (type === 'heating') {
            for (let thermostat of this.heatingThermostats) {
                if (thermostat.id === thermostatId) {
                    foundThermostat = thermostat;
                    break;
                }
            }
        } else {
            for (let thermostat of this.coolingThermostats) {
                if (thermostat.id === thermostatId) {
                    foundThermostat = thermostat;
                    break;
                }
            }
        }
        this.activeThermostat = foundThermostat;
    }

    editGlobalThermostat() {
        if (this.globalThermostat === undefined || this.thermostatsLoading) {
            return;
        }
        this.dialogService.open({ viewModel: ConfigureGlobalThermostatWizard, model: { thermostat: this.globalThermostat } }).whenClosed((response) => {
            if (response.wasCancelled) {
                this.globalThermostat.cancel();
                Logger.info('The ConfigureGlobalThermostatWizard was cancelled');
            }
        });
    }

    editThermostat() {
        if (this.activeThermostat === undefined || this.thermostatsLoading) {
            return;
        }
        this.dialogService.open({ viewModel: ConfigureThermostatWizard, model: { thermostat: this.activeThermostat } }).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeThermostat.cancel();
                Logger.info('The ConfigureThermostatWizard was cancelled');
            }
        });
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
    }

    deactivate() {
        this.refresher.stop();
    }
}
