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
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {Output} from "../containers/output";
import {Plugin} from "../containers/plugin";
import {GlobalThermostat} from "../containers/thermostat-global";

export class Dashboard extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadPlugins().then(() => {
                this.signaler.signal('reload-plugins');
            });
            this.loadGlobalThermostat().then(() => {
                this.signaler.signal('reload-thermostat');
            })
        }, 5000);
        this.loadModules().then(() => {
            this.signaler.signal('reload-modules');
        });

        this.outputs = [];
        this.outputsLoading = true;
        this.plugins = [];
        this.pluginsLoading = true;
        this.globalThermostat = undefined;
        this.globalThermostatDefined = false;
        this.hasMasterModules = true;
        this.hasEnergyModules = true;
    };

    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    };

    get activeLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.inUse && output.isOn === true) {
                lights.push(output);
            }
        }
        return lights;
    }

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return new Output(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return new Output(id);
                });
                this.outputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouput configurations and states');
                }
            });
    };

    loadPlugins() {
        return this.api.getPlugins()
            .then((data) => {
                Toolbox.crossfiller(data.plugins, this.plugins, 'name', (name) => {
                    return new Plugin(name)
                });
                this.pluginsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Plugins');
                }
            });
    }

    loadGlobalThermostat() {
        return this.api.getThermostatsStatus()
            .then((data) => {
                if (this.globalThermostatDefined === false) {
                    this.globalThermostat = new GlobalThermostat();
                    this.globalThermostatDefined = true;
                }
                this.globalThermostat.fillData(data, false);
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Global Thermostat');
                }
            });
    }

    loadModules() {
        let masterModules = this.api.getModules()
            .then((data) => {
                this.hasMasterModules = data.outputs.length > 0 ||
                    data.shutters.length > 0 ||
                    data.inputs.length > 0 ||
                    (data.can_inputs !== undefined && data.can_inputs.length > 0);
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Module information');
                }
            });
        let energyModules = this.api.getPowerModules()
            .then((data) => {
                this.hasEnergyModules = data.modules.length > 0;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Energy Module information');
                }
            });
        return Promise.all([masterModules, energyModules]);
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
