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
import {BaseObject} from "./baseobject";
import {PluginConfig} from "../containers/plugin-config";
import {Refresher} from "../components/refresher";

export class Plugin extends BaseObject {
    constructor(...rest /*, name */) {
        let name = rest.pop();
        super(...rest);
        this.name = name;
        this.refresher = new Refresher(() => {
            this.loadLogs();
        }, 1000);
        this.key = 'name';
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

    get reference() {
        return this.name.toLowerCase();
    }

    get hasConfig() {
        for (let int of this.interfaces) {
            if (int[0] === 'config') {
                return this.config !== undefined && this.config.configurable === true;
            }
        }
        return false;
    }

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
        this.api.getPluginLogs(this.name, {dedupe: false})
            .then((logs) => {
                logs = logs.trim();
                if (this.lastLogEntry === undefined) {
                    for (let line of logs.split('\n')) {
                        let index = line.indexOf(' - ');
                        let date = line.substring(0, index).split('.')[0];
                        let log = line.substring(index + 3);
                        this.logs.push([date, log]);
                        this.lastLogEntry = line;
                    }
                } else {
                    let found = false;
                    for (let line of logs.split('\n')) {
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
