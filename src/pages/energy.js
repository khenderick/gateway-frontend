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
                this.modules.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
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
