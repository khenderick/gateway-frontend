import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";

@inject(API, BindingSignaler, I18N, Element, EventAggregator)
export class Energy extends BaseI18N {
    constructor(api, signaler, i18n, element, ea) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadModuleInformation().then(() => {
                signaler.signal('reload-moduleinformation');
            }).catch(() => {
            });
            this.loadVersions().then(() => {
                signaler.signal('reload-versions');
            }).catch(() => {
            });
        }, 5000);

        this.modules = {
            output: 0,
            dimmer: 0,
            sensor: 0,
            input: 0,
            gateway: 1,
            power: 0,
            energy: 0,
            shutter: 0
        };
        this.modulesLoading = true;
        this.versions = {
            system: undefined,
            masterhardware: undefined,
            masterfirmware: undefined
        };
        this.versionsLoading = true;
        this.time = undefined;
        this.timezone = undefined;
    };

    loadVersions() {
        let version = this.api.getVersion()
            .then((data) => {
                this.versions.system = data.version;
            });
        let status = this.api.getStatus()
            .then((data) => {
                this.versions.masterhardware = data['hw_version'];
                this.versions.masterfirmware = data.version;
                this.time = data.time;
            });
        let timezone = this.api.getTimezone()
            .then((data) => {
                this.timezone = data.timezone;
            });
        return Promise.all([version, status, timezone]);
    }

    loadModuleInformation() {
        let modules = {
            output: 0,
            dimmer: 0,
            sensor: 0,
            input: 0,
            gateway: 1,
            power: 0,
            energy: 0,
            shutter: 0
        };
        let masterModules = this.api.getModules()
            .then((data) => {
                for (let type of data.outputs) {
                    if (type === 'O') {
                        modules.output++;
                    } else if (type === 'D') {
                        modules.dimmer++;
                    } else if (type === 'R' || type === 'S') {
                        modules.shutter++;
                    }
                }
                for (let type of data.shutters) {
                    if (type === 'R' || type === 'S') {
                        modules.shutter++;
                    }
                }
                for (let type of data.inputs) {
                    if (type === 'T') {
                        modules.sensor++;
                    } else if (type === 'I') {
                        modules.input++;
                    }
                }
            })
            .catch(() => {
                console.error('Could not load Module information');
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
            .catch(() => {
                console.error('Could not load Energy Module information');
            });
        return Promise.all([masterModules, energyModules])
            .then(() => {
                this.modules = modules;
                this.modulesLoading = false;
            });
    };

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
