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
import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {DiscoverWizard} from "../../wizards/discover/index";

export class Environment extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.dialogService = Shared.get('dialogService');
        this.refresher = new Refresher(() => {
            this.loadModuleInformation();
            this.loadVersions();
            this.api.moduleDiscoverStatus()
                .then((running) => {
                    this.discovery = running;
                })
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
        this.versions = {
            system: undefined,
            masterhardware: undefined,
            masterfirmware: undefined
        };
        this.versionsLoading = true;
        this.time = undefined;
        this.timezone = 'UTC';
        this.timezones = [
            'UTC',
            'Pacific/Honolulu', 'Pacific/Noumea', 'Pacific/Auckland',
            'Europe/London', 'Europe/Moscow', 'Europe/Paris',
            'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin', 'Australia/Sydney',
            'Asia/Dhaka', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Karachi', 'Asia/Tokyo',
            'America/Anchorage', 'America/Caracas', 'America/Chicago', 'America/Denver',
            'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo',
            'Africa/Cairo'];
        this.updatingTimezone = false;
        this.discovery = false;
    };

    loadVersions() {
        let promises = [];
        promises.push(this.api.getVersion()
            .then((data) => {
                this.versions.system = data.version;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Version');
                }
            }));
        promises.push(this.api.getStatus()
            .then((data) => {
                this.versions.masterhardware = data['hw_version'];
                this.versions.masterfirmware = data.version;
                this.time = data.time;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Status');
                }
            }));
        if (this.updatingTimezone === false) {
            promises.push(this.api.getTimezone()
                .then((data) => {
                    this.timezone = data.timezone;
                })
                .catch((error) => {
                    if (!this.api.isDeduplicated(error)) {
                        console.error('Could not load Timezone');
                    }
                }));
        }
        return Promise.all(promises);
    }

    loadModuleInformation() {
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
        let masterModules = this.api.getModules()
            .then((data) => {
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
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Module information');
                }
            });
        let energyModules = this.api.getPowerModules()
            .then((data) => {
                for (let module of data.modules) {
                    if (module.version === 12) {
                        modules.energy++;
                    } else if (module.version === 8) {
                        modules.power++;
                    }
                }
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Energy Module information');
                }
            });
        return Promise.all([masterModules, energyModules])
            .then(() => {
                this.modules = modules;
                this.modulesLoading = false;
            });
    };

    setTimezone(event) {
        this.updatingTimezone = true;
        this.timezone = event.detail.value;
        this.api.setTimezone(event.detail.value)
            .then(() => {
                this.updatingTimezone = false;
            })
            .catch(() => {
                this.updatingTimezone = false;
            });
    }

    startDiscover() {
        this.dialogService.open({viewModel: DiscoverWizard, model: {}}).then((response) => {
            if (!response.wasCancelled) {
                this.api.moduleDiscoverStart()
                    .then(() => {
                        this.originalModules = Object.assign({}, this.modules);
                        this.discovery = true;
                    });
            } else {
                console.info('The DiscoverWizard was cancelled');
            }
        });
    }

    stopDiscover() {
        this.api.moduleDiscoverStop()
            .then(() => {
                this.discovery = false;
            });
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
