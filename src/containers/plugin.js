import {inject, computedFrom} from "aurelia-framework";
import {BaseObject} from "./baseobject";
import {PluginConfig} from "../containers/plugin-config";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";

@inject(API)
export class PluginFactory {
    constructor(api) {
        this.api = api;
    }

    makePlugin() {
        return new Plugin(this.api, ...arguments);
    }
}

export class Plugin extends BaseObject {
    constructor(api, name) {
        super();
        this._freeze = false;
        this.refresher = new Refresher(() => {
            this.loadLogs();
        }, 1000);
        this.api = api;
        this.key = 'name';
        this.name = name;
        this.version = undefined;
        this.interfaces = [];
        this.mapping = {
            name: 'name',
            version: 'version',
            interfaces: 'interfaces'
        };
        this.config = undefined;
        this.logs = [];
        this.logsLoading = false;
        this.lastLogEntry = undefined;
    }

    @computedFrom('interfaces', 'config')
    get hasConfig() {
        for (let int of this.interfaces) {
            if (int[0] === 'config') {
                return this.config !== undefined && this.config.configurable === true;
            }
        }
        return false;
    }

    @computedFrom('interfaces')
    get hasWebUI() {
        for (let int of this.interfaces) {
            if (int[0] === 'webui') {
                return true;
            }
        }
        return false;
    }

    initializeConfig() {
        return this.api.getConfigDescription(this.name)
            .then((description) => {
                this.config = new PluginConfig();
                this.config.setStructure(description);
            })
            .then(() => {
                this.loadConfig();
            })
            .catch(() => {
                console.error('Could not get config description for Plugin ' + this.name);
            })
    }

    loadConfig() {
        return this.api.getConfig(this.name)
            .then((config) => {
                this.config.setConfig(config);
            })
            .catch(() => {
                console.error('Could not load configuration for Plugin ' + this.name);
            });
    }

    saveConfig() {
        return this.api.setConfig(this.name, JSON.stringify(this.config.getConfig()))
            .catch(() => {
                console.error('Could not save configuration for Plugin ' + this.name);
            });
    }

    loadLogs() {
        if (this.logsLoading === true) {
            return;
        }
        this.logsLoading = true;
        this.api.getPluginLogs(this.name)
            .then((logs) => {
                logs = logs.trim();
                if (this.lastLogEntry === undefined) {
                    for (let line of logs.split('\n\n')) {
                        let index = line.indexOf(' - ');
                        let date = line.substring(0, index).split('.')[0];
                        let log = line.substring(index + 3);
                        this.logs.push([date, log]);
                        this.lastLogEntry = line;
                    }
                } else {
                    let found = false;
                    for (let line of logs.split('\n\n')) {
                        if (found === true) {
                            let index = line.indexOf(' - ');
                            let date = line.substring(0, index).split('.')[0];
                            let log = line.substring(index + 3);
                            this.logs.push([date, log]);
                            this.lastLogEntry = line;
                            continue;
                        }
                        if (line === this.lastLogEntry) {
                            found = true;
                        }
                    }
                }
                this.logsLoading = false;
            })
            .catch(() => {
                console.error('Could not fetch logs for Plugin ' + this.name);
            });
    }

    startLogWatcher() {
        this.refresher.start();
        this.refresher.run();
    }

    stopLogWatcher() {
        this.refresher.stop();
    }

    remove() {
        return this.api.removePlugin(this.name);
    }
}
