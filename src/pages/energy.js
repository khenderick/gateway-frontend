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
import {inject, Factory} from "aurelia-framework";
import {Base} from "../resources/base";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {Logger} from "../components/logger";
import {MetricsWebSocketClient} from "../components/websocket-metrics";
import {EnergyModule} from "../containers/energymodule";

@inject(Factory.of(EnergyModule))
export class Energy extends Base {
    constructor(energyModuleFactory, ...rest) {
        super(...rest);
        this.energyModuleFactory = energyModuleFactory;
        this.webSocket = new MetricsWebSocketClient();
        this.webSocket.onMessage = (message) => {
            this.processMetric(message);
        };
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadEnergyModules();
            this.signaler.signal('reload-energymodules');
        }, 15000);
        this.realtimeRefresher = new Refresher(async () => {
            try {
                if (this.webSocket.lastDataReceived > Toolbox.getTimestamp() - (1000 * 10)) {
                    return; // Socket is receiving data
                }
                let data = await this.api.getRealtimePower();
                for (let [id, module] of Object.entries(this.energyModuleMapId)) {
                    if (data[id] !== undefined) {
                        module.distributeRealtimeData(data[id]);
                    }
                }
            } catch (error) {
                Logger.error(`Could not load realtime power: ${error.message}`);
            }
        }, 5000);

        this.initVariables();
    }

    initVariables() {
        this.modules = [];
        this.energyModuleMapId = {};
        this.energyModuleMapAddress = {};
        this.energyModulesLoading = true;
        this.installationHasUpdated = false;
    }

    async loadEnergyModules() {
        try {
            let data = await this.api.getPowerModules();
            Toolbox.crossfiller(data.modules, this.modules, 'id', (id, moduleData) => {
                let module = this.energyModuleFactory(id);
                this.energyModuleMapId[id.toString()] = module;
                this.energyModuleMapAddress[moduleData.address] = module;
                return module;
            });
            this.modules.sort(Toolbox.sort('name', 'address'));
            this.energyModulesLoading = false;
        } catch (error) {
            Logger.error(`Could not load Energy modules: ${error.message}`);
        }
    }

    processMetric(metric) {
        let [address, ct] = metric.tags.id.split('.');
        let module = this.energyModuleMapAddress[address];
        if (module !== undefined) {
            module.distributeRealtimeMetricData(parseInt(ct), metric.values);
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    async activate() {
        this.refresher.run();
        this.refresher.start();
        this.realtimeRefresher.start();
        this.realtimeRefresher.run();
        try {
            await this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.realtimeRefresher.stop();
        this.webSocket.close();
    }
}
