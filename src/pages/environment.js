import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {DiscoverWizard} from "../wizards/discover/index";

export class Energy extends Base {
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
            input: 0,
            virtalInput: 0,
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
        this.timezone = undefined;
        this.discovery = false;
    };

    loadVersions() {
        let version = this.api.getVersion()
            .then((data) => {
                this.versions.system = data.version;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Version');
                }
            });
        let status = this.api.getStatus()
            .then((data) => {
                this.versions.masterhardware = data['hw_version'];
                this.versions.masterfirmware = data.version;
                this.time = data.time;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Status');
                }
            });
        let timezone = this.api.getTimezone()
            .then((data) => {
                this.timezone = data.timezone;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Timezone');
                }
            });
        return Promise.all([version, status, timezone]);
    }

    loadModuleInformation() {
        let modules = {
            output: 0,
            virtualOutput: 0,
            dimmer: 0,
            virtualDimmer: 0,
            sensor: 0,
            input: 0,
            virtualInput: 0,
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
