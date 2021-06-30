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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Output} from 'containers/output';
import {GlobalThermostat} from 'containers/gateway/thermostat-global';
import {ThermostatGroup} from 'containers/cloud/thermostat-group';
import {Thermostat} from 'containers/cloud/thermostat';

@inject(Factory.of(Output), Factory.of(GlobalThermostat), Factory.of(ThermostatGroup), Factory.of(Thermostat))
export class Dashboard extends Base {
    constructor(outputFactory, globalThermostatFactory, thermostatGroupFactory, thermostatFactory, ...rest) {
        super(...rest);
        this.outputFactory = outputFactory;
        this.thermostatFactory = thermostatFactory;
        this.isCloud = this.shared.target === 'cloud';
        if (!this.isCloud) {
            this.globalThermostatFactory = globalThermostatFactory;
        } else {
            this.thermostatFactory = thermostatFactory;
            this.globalThermostatFactory = thermostatGroupFactory;
        }
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.shared.installation.refresh().then(() => {
                    this.initVariables();
                });
            }
            if (this.gatewayHasUpdated) {
                this.initVariables();
            }
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
                if (this.isCloud) {
                    this.loadFloors();
                }
            });
            this.loadGlobalThermostat().then(() => {
                this.signaler.signal('reload-thermostat');
            })
            if (this.isCloud) {
                this.loadThermostatUnits();
            }
        }, 500000);
        if (!this.isCloud || (this.shared.installation !== undefined && this.shared.installation.configurationAccess)) {
            this.loadModules().then(() => {
                this.signaler.signal('reload-modules');
            });
        }
        this.initVariables();
        this.hasMasterModules = true;
        this.hasEnergyModules = true;
    }

    initVariables() {
        this.outputs = [];
        this.outputsLoading = true;
        this.floors = [];
        this.allThermostats = [];
        this.thermostatLoading = true;
        this.thermostats = [];
        this.globalThermostat = undefined;
        this.globalThermostatDefined = false;
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
        this.globalPreset = undefined;
    }

    @computedFrom('outputs')
    get activeLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.inUse && output.isOn === true) {
                lights.push(output);
            }
        }
        return lights;
    }

    async loadThermostatUnits() {
        try {
            var data = await this.api.getThermostatUnits();
            Toolbox.crossfiller(data.data, this.allThermostats, 'id', (id) => {
                return this.thermostatFactory(id);
            });
            for (let thermostat of this.allThermostats) {
                if (this.globalThermostat && this.globalThermostat.isHeating) {
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

    async loadOutputs() {
        if (!this.isAdmin) {
            return;
        }
        try {
            const requests = [this.apiCloud.getOutputs({})];
            if (this.isAdmin) {
                requests.push(this.api.getOutputConfigurations());
            }
            let data = await Promise.all(requests);
            if (this.isAdmin) {
                Toolbox.crossfiller(data[1].config, this.outputs, 'id', (id) => {
                    return this.outputFactory(id);
                });
            }
            data[0].data.forEach(status => {
                const output = this.outputs.find(item => item.id === status.local_id);
                if (output) {
                    output.locked = status.status?.locked;
                    output.status = status.status?.on ? 1 : 0;
                    output.dimmer = status.status?.value;
                }
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Output configurations and states: ${error.message}`);
        }
    }

    async loadFloors() {
        try {
            const { data: lights } = await this.api.getOutputs();
            const { data } = await this.api.getFloors({ size: 'MEDIUM' });
            this.floors = data.map(({ id, ...rest }) => {
                const floorLights = lights.filter(({ location: { floor_id } }) => floor_id === id);
                return {
                    ...rest,
                    floorLights,
                    activeLights: floorLights.filter(({ status }) => (status || {}).on),
                };
            }).sort((a, b) => a.sequence - b.sequence);
            setTimeout(() =>
                Array.from(document.getElementsByClassName('image-wrapper-dashboard')).forEach(({ clientHeight }, index) => {
                    this.floors[index].image.containerHeight = clientHeight;
                },
            ), 500);
        } catch (error) {
            Logger.error(`Could not load Floors: ${error.message}`);
        }
    }

    isTimeBased(thermostat) {
        if (!this.globalThermostat) return;
        const configuration = thermostat.configuration[this.globalThermostat.mode.toLowerCase()];
        return configuration ? configuration.sensor_id === 240 : false;
    }

    removeActiveLight(id, activeLights) {
        const activeIndex = activeLights.findIndex(({ id: lightId }) => id === lightId);
        activeLights.splice(activeIndex, 1);
    }

    async offLights(floor) {
        const { floorLights, activeLights } = floor;
        const sourceLights = [...activeLights];
        if (!sourceLights.length) {
            return;
        }
        try {
            floor.isUpdating = true;
            const promises = [];
            sourceLights.forEach(light => promises.push(this.toggleLight({ floorLights, activeLights }, light)));
            await Promise.all(promises);
            floor.isUpdating = false;
        } catch (error) {
            Logger.error(`Could not toggle all Lights: ${error.message}`);
        }
    }

    async toggleLight({ activeLights, floorLights }, { id, status }) {
        if (!status) return;
        try {
            const index = floorLights.findIndex(({ id: lightId }) => id === lightId);
            floorLights[index].status.on = !status.on;
            const isActive = activeLights.findIndex(({ id: lightId }) => id === lightId) !== -1;
            if (isActive) {
                this.removeActiveLight(id, activeLights);
            } else {
                activeLights.push(floorLights[index]);
            }
            await this.api.toggleOutput(id);
        } catch (error) {
            floorLights[index].status.on = status.on;
            this.removeActiveLight(id, activeLights);
            Logger.error(`Could not toggle Light: ${error.message}`);
        }
    }

    async loadGlobalThermostat() {
        if (this.shared.target !== 'cloud') {
            try {
                let data = await this.api.getThermostatsStatus();
                if (this.globalThermostatDefined === false) {
                    this.globalThermostat = this.globalThermostatFactory();
                    this.globalThermostatDefined = true;
                }
                this.globalThermostat.fillData(data, false);
            } catch (error) {
                Logger.error(`Could not load Global Thermostat: ${error.message}`);
            } finally {
                this.thermostatLoading = false;
            }
        } else {
            try {
                if (this.globalThermostatDefined === false) {
                    let thermostatList = [];
                    let data = await this.api.getThermostatGroups();
                    Toolbox.crossfiller(data.data, thermostatList, 'id', (id) => {
                        return this.globalThermostatFactory(id);
                    });
                    this.globalThermostat = thermostatList[0];
                    let hasThermostatUnits = await this.hasThermostatUnits();
                    if (hasThermostatUnits && this.globalThermostat !== undefined) {
                        this.globalThermostatDefined = true;
                    }
                }
            } catch (error) {
                Logger.error(`Could not load Global Thermostat: ${error.message}`);
            } finally {
                this.thermostatLoading = false;
            }
        }
    }

    @computedFrom('shared.installation')
    get isAdmin() {
        return this.shared.installation && this.shared.installation.configurationAccess || false;
    }

    @computedFrom('thermostats.length')
    get globalPreset() {
        let presetCount = 0;
        let globalPreset = undefined;
        if (this.thermostats.length !== 0) {
            for (let thermostat of this.thermostats) {
                if (globalPreset !== thermostat.preset.toLowerCase()) {
                    globalPreset = thermostat.preset.toLowerCase();
                    presetCount++;
                }
                if (presetCount > 1) {
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

    async hasThermostatUnits() {
        try {
            let data = await this.api.getThermostatUnits();
            Toolbox.crossfiller(data.data, this.thermostats, 'id', (id) => {
                return this.thermostatFactory(id);
            });
        } catch (error) {
            Logger.error(`Unable to get thermostat units: ${error}`);
        } finally {
            return this.thermostats.length > 0;
        }
    }

    async loadModules() {
        let masterModules = (async () => {
            try {
                if (!this.isSuperUser) {
                    console.warn('Modules is not enabled')
                }
                let data = await this.api.getModules();
                this.hasMasterModules = data.outputs.length > 0 ||
                    data.shutters.length > 0 ||
                    data.inputs.length > 0 ||
                    (data.can_inputs !== undefined && data.can_inputs.length > 0);
            } catch (error) {
                Logger.error(`Could not load Module information: ${error.message}`);
            }
        })();
        let energyModules = (async () => {
            try {
                let data = await this.api.getPowerModules();
                this.hasEnergyModules = data.modules.length > 0;
            } catch (error) {
                Logger.error(`Could not load Energy Module information: ${error.message}`);
            }
        })();
        return Promise.all([masterModules, energyModules]);
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
    }

    deactivate() {
        this.refresher.stop();
    }
}
