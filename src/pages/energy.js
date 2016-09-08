import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {EnergyModuleFactory} from "../containers/energymodule";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, EnergyModuleFactory)
export class Energy extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, energyModuleFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadEnergyModules().then(() => {
                signaler.signal('reload-energymodules');
            })
        }, 5000);
        this.realtimeRefresher = new Refresher(() => {
            this.api.getRealtimePower()
                .then((data) => {
                    for (let [id, module] of this.energyModuleMap) {
                        module.distributeRealtimeData(data[id]);
                    }
                });
        }, 1000);
        this.energyModuleFactory = energyModuleFactory;

        this.energyModules = [];
        this.energyModuleMap = new Map();
        this.energyModulesLoading = true;
    };

    loadEnergyModules() {
        return this.api.getPowerModules()
            .then((data) => {
                Toolbox.crossfiller(data.modules, this.energyModules, 'id', (id) => {
                    let module = this.energyModuleFactory.makeEnergyModule(id);
                    this.energyModuleMap.set(id.toString(), module);
                    return module;
                });
                this.energyModules.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.energyModulesLoading = false;
            })
            .catch((error) => {
                if (!this.api.deduplicated(error)) {
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
