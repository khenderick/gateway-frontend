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
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {EnergyModule} from "../containers/energymodule";

export class Energy extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadEnergyModules().then(() => {
                this.signaler.signal('reload-energymodules');
            })
        }, 5000);
        this.realtimeRefresher = new Refresher(() => {
            this.api.getRealtimePower()
                .then((data) => {
                    for (let [id, module] of this.energyModuleMap) {
                        module.distributeRealtimeData(data[id]);
                    }
                })
                .catch((error) => {
                    if (!this.api.isDeduplicated(error)) {
                        console.error('Could not load realtime power');
                    }
                });
        }, 1000);

        this.modules = [];
        this.energyModuleMap = new Map();
        this.energyModulesLoading = true;
    };

    loadEnergyModules() {
        return this.api.getPowerModules()
            .then((data) => {
                Toolbox.crossfiller(data.modules, this.modules, 'id', (id) => {
                    let module = new EnergyModule(id);
                    this.energyModuleMap.set(id.toString(), module);
                    return module;
                });
                this.modules.sort(Toolbox.sort('name', 'address'));
                this.energyModulesLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Energy modules');
                }
            });
    };

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
        this.realtimeRefresher.run();
        this.realtimeRefresher.start();
    };

    deactivate() {
        this.refresher.stop();
        this.realtimeRefresher.stop();
    }
}
