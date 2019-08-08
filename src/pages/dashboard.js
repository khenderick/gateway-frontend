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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from '../resources/base';
import {Refresher} from '../components/refresher';
import {Toolbox} from '../components/toolbox';
import {Logger} from '../components/logger';
import {Output} from '../containers/output';
import {App} from '../containers/app';
import {GlobalThermostat} from '../containers/gateway/thermostat-global';
import {ThermostatGroup} from '../containers/cloud/thermostat-group';
import {Thermostat} from '../containers/cloud/thermostat';

@inject(Factory.of(Output), Factory.of(App), Factory.of(GlobalThermostat), Factory.of(ThermostatGroup), Factory.of(Thermostat))
export class Dashboard extends Base {
    constructor(outputFactory, appFactory, globalThermostatFactory, thermostatGroupFactory, thermostatFactory, ...rest) {
        super(...rest);
        this.outputFactory = outputFactory;
        this.appFactory = appFactory;
        if (this.shared.target !== 'cloud') {
            this.globalThermostatFactory = globalThermostatFactory;
        } else {
            this.thermostatFactory = thermostatFactory;
            this.globalThermostatFactory = thermostatGroupFactory;
        }
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            if (this.shared.installation.configurationAccess) {
                this.loadApps().then(() => {
                    this.signaler.signal('reload-apps');
                });
            }
            this.loadGlobalThermostat().then(() => {
                this.signaler.signal('reload-thermostat');
                this.getGlobalPreset();
            })
        }, 5000);
        if (this.shared.installation.configurationAccess) {
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
        this.apps = [];
        this.appsLoading = true;
        this.thermostatLoading = true;
        this.thermostats = [];
        this.globalThermostat = undefined;
        this.globalThermostatDefined = false;
        this.installationHasUpdated = false;
        this.globalPreset = undefined;
    }

    @computedFrom('outputs')
    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
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

    async loadOutputs() {
        try {
            let data = await Promise.all([
                this.api.getOutputConfigurations(),
                this.api.getOutputStatus()
            ]);
            Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                return this.outputFactory(id);
            });
            Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                return this.outputFactory(id);
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Output configurations and states: ${error.message}`);
        }
    }

    async loadApps() {
        try {
            let data = await this.api.getApps();
            Toolbox.crossfiller(data.plugins, this.apps, 'name', (name) => {
                return this.appFactory(name)
            });
            this.appsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Apps: ${error.message}`);
        }
    }

    async loadGlobalThermostat() {
        if (this.shared.target !== 'cloud') {
            try {
                this.thermostatLoading = true;
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
                this.thermostatLoading = true;
                if (this.globalThermostatDefined === false) {
                    let thermostatList = [];
                    let data = await this.api.getThermostatGroups();
                    Toolbox.crossfiller(data.data, thermostatList, 'id', (id) => {
                        return this.globalThermostatFactory(id);
                    });
                    this.globalThermostat = thermostatList[0];
                    let stuff = await this.hasThermostatUnits();
                    if (stuff){
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

    getGlobalPreset() {
        let presetCount = 0;
        if (this.thermostats.length !== 0) {
            for(let thermostat of this.thermostats) {
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

    async hasThermostatUnits() {
        try{
            let data = await this.api.getThermostatUnits();
            Toolbox.crossfiller(data.data, this.thermostats, 'id', (id) => {
                return this.thermostatFactory(id);
            });
        } catch(error){
            Logger.error(`Unable to get thermostat units: ${error}`);
        } finally {
            return this.thermostats.length > 0;
        }
    }

    async loadModules() {
        let masterModules = (async () => {
            try {
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
        this.loadModules().then(() => {
            this.signaler.signal('reload-modules');
        });
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
