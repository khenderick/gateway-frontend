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
import {BaseObject} from "./baseobject";
import {AppConfig} from "../containers/app-config";
import {Refresher} from "../components/refresher";

export class App extends BaseObject {
    constructor(...rest /*, name */) {
        let name = rest.pop();
        super(...rest);
        this.name = name;
        this.refresher = new Refresher(() => {
            this.loadLogs().catch(() => {});
        }, 1000);
        this.key = 'name';
        this.version = undefined;
        this.interfaces = [];
        this.mapping = {
            name: 'name',
            version: 'version',
            interfaces: 'interfaces'
        };
        this.installed = true;
        this.config = undefined;
        this.logs = [];
        this.logsLoading = false;
        this.lastLogEntry = undefined;
        this.configLoaded = false;
        this.configInitialized = false;
        this.storeMetadata = undefined;
    }

    get reference() {
        return this.name.toLowerCase();
    }

    @computedFrom('interfaces', 'config', 'config.configurable')
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

    async initializeConfig() {
        try {
            if (!this.configInitialized) {
                let description = await this.api.getConfigDescription(this.name);
                this.config = new AppConfig(this.name);
                this.config.setStructure(description);
                this.configInitialized = true;
            }
        } catch (error) {
            console.error(`Could not get config description for App ${this.name}: ${error.message}`);
        }
    }

    async loadConfig() {
        try {
            let config = await this.api.getConfig(this.name);
            this.config.setConfig(config);
            this.configLoaded = true;
        } catch (error) {
            console.error(`Could not load configuration for App ${this.name}: ${error.message}`);
        }
    }

    async saveConfig() {
        try {
            return await this.api.setConfig(this.name, JSON.stringify(this.config.getConfig()));
        } catch (error) {
            console.error(`Could not save configuration for App ${this.name}: ${error.message}`);
        }
    }

    async loadLogs() {
        if (this.logsLoading === true) {
            return;
        }
        this.logsLoading = true;
        try {
            let logs = await this.api.getAppLogs(this.name);
            let lines = logs.trim().split('\n');
            let index = -1;
            if (this.lastLogEntry !== undefined) {
                index = lines.indexOf(this.lastLogEntry);
            }
            for (let line of lines.slice(index + 1)) {
                let index = line.indexOf(' - ');
                let date = line.substring(0, index).split('.')[0];
                let log = line.substring(index + 3);
                this.logs.push([date, log]);
                this.lastLogEntry = line;
            }
        } catch (error) {
            console.error(`Could not fetch logs for App ${this.name}: ${error.message}`);
        }
        this.logsLoading = false;
    }

    startLogWatcher() {
        this.refresher.start();
        this.refresher.run();
    }

    stopLogWatcher() {
        this.refresher.stop();
    }

    async installFromStore() {
        if (this.installed) {
            return;
        }
        await this.api.installApp(this.name);
        this.installed = true;
    }

    async remove() {
        await this.api.removeApp(this.name);
        this.stopLogWatcher();
        this.installed = false;
        this.lastLogEntry = undefined;
        this.config = undefined;
        this.configLoaded = false;
        this.configInitialized = false;
    }
}
