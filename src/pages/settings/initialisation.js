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
import {DialogService} from "aurelia-dialog";
import {inject} from "aurelia-framework";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {DiscoverWizard} from "../../wizards/discover/index";

@inject(DialogService)
export class Initialisation extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.refresher = new Refresher(() => {
            this.loadModuleInformation().catch(() => {});
            this.api.moduleDiscoverStatus().then((running) => {
                this.moduleDiscovery = running;
            });
            this.api.energyDiscoverStatus().then((running) => {
                this.energyDiscovery = running;
            });
        }, 5000);

        this.modules = {
            output: 0,
            virtualOutput: 0,
            dimmer: 0,
            virtualDimmer: 0,
            sensor: 0,
            canSensor: 0,
            input: 0,
            virtalInput: 0,
            canInput: 0,
            gateway: 1,
            power: 0,
            energy: 0,
            shutter: 0,
            can: 0
        };
        this.originalModules = undefined;
        this.modulesLoading = true;
        this.masterDiscovery = false;
        this.energyDiscovery = false;
    };

    async loadModuleInformation() {
        let modules = {
            output: 0,
            virtualOutput: 0,
            dimmer: 0,
            virtualDimmer: 0,
            sensor: 0,
            canSensor: 0,
            input: 0,
            virtualInput: 0,
            canInput: 0,
            gateway: 1,
            power: 0,
            energy: 0,
            shutter: 0,
            can: 0
        };
        let masterModules = (async () => {
            try {
                let data = await this.api.getModules();
                for (let type of data.outputs) {
                    if (type === 'O') {
                        modules.output++;
                    } else if (type === 'o') {
                        modules.virtualOutput++;
                    } else if (type === 'D') {
                        modules.dimmer++;
                    } else if (type === 'd') {
                        modules.virtualDimmer++;
                    } else if (type === 'R') {
                        modules.shutter++;
                    } else if (type === 'C') {
                        modules.can++;
                    }
                }
                for (let type of data.shutters) {
                    if (type === 'S') {
                        modules.shutter++;
                    }
                }
                for (let type of data.inputs) {
                    if (type === 'T') {
                        modules.sensor++;
                    } else if (type === 'I') {
                        modules.input++;
                    } else if (type === 'i') {
                        modules.virtualInput++;
                    }
                }
                if (data.can_inputs !== undefined) {
                    for (let type of data.can_inputs) {
                        if (type === 'T') {
                            modules.canSensor++;
                        } else if (type === 'I') {
                            modules.canInput++;
                        }
                    }
                }
            } catch (error) {
                console.error(`Could not load Module information: ${error.message}`);
            }
        })();
        let energyModules = (async () => {
            try {
                let data = await this.api.getPowerModules();
                for (let module of data.modules) {
                    if (module.version === 12) {
                        modules.energy++;
                    } else if (module.version === 8) {
                        modules.power++;
                    }
                }
            } catch (error) {
                console.error(`Could not load Energy Module information: ${error.message}`);
            }
        })();
        await Promise.all([masterModules, energyModules]);
        this.modules = modules;
        this.modulesLoading = false;
    };

    startDiscover() {
        this.dialogService.open({viewModel: DiscoverWizard, model: {}}).whenClosed(async (response) => {
            if (!response.wasCancelled) {
                let moduleDiscover = (async () => {
                    await this.api.moduleDiscoverStart();
                    this.moduleDiscovery = true;
                })();
                let energyDiscover = (async () => {
                    await this.api.energyDiscoverStart();
                    this.energyDiscovery = true;
                })();
                await Promise.all([moduleDiscover, energyDiscover]);
                this.originalModules = Object.assign({}, this.modules);
            } else {
                console.info('The DiscoverWizard was cancelled');
            }
        });
    }

    async stopDiscover() {
        (async () => {
            await this.api.moduleDiscoverStop();
            this.moduleDiscovery = false;
        })();
        (async () => {
            await this.api.energyDiscoverStop();
            this.energyDiscovery = false;
        })();
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
