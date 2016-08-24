import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {OutputFactory} from "../containers/output";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, OutputFactory)
export class Outputs extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, outputFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                signaler.signal('reload-outputs');
            }).catch(() => {});
        }, 5000);
        this.outputFactory = outputFactory;

        this.outputs = [];
        this.outputsLoading = true;
    };

    @computedFrom('outputs')
    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light' && output.moduleType === 'O' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get dimmableLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light' && output.moduleType === 'D' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get relays() {
        let relays = [];
        for (let output of this.outputs) {
            if (output.type === 'output' && output.moduleType === 'O' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                relays.push(output);
            }
        }
        return relays;
    }
    @computedFrom('outputs')
    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (output.type === 'output' && output.moduleType === 'D' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                relays.push(output);
            }
        }
        return relays;
    }

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return this.outputFactory.makeOutput(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return this.outputFactory.makeOutput(id);
                });
                this.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.outputsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Ouput configurations and statusses');
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
