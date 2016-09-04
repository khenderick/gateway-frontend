import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {InputFactory} from "../containers/input";
import {OutputFactory} from "../containers/output";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, InputFactory, OutputFactory)
export class Inputs extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, inputFactory, outputFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadInputs().then(() => {
                signaler.signal('reload-inputs');
            }).catch(() => {
            });
            this.loadOutputs().catch(() => {
            });
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent().catch(() => {
            });
        }, 1000);
        this.inputFactory = inputFactory;
        this.outputFactory = outputFactory;

        this.inputs = [];
        this.outputs = [];
        this.outputMap = new Map();
        this.activeInput = undefined;
        this.inputsLoading = true;
    };

    loadInputs() {
        return this.api.getInputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                    return this.inputFactory.makeInput(id);
                });
                this.inputs.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.inputsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Input configurations');
            });
    };

    loadRecent() {
        return this.api.getLastInputs()
            .then((data) => {
                let recentInputs = [];
                for (let input of data.inputs) {
                    recentInputs.push(input[0])
                }
                for (let input of this.inputs) {
                    input.recent = recentInputs.indexOf(input.id) !== -1;
                }
            })
            .catch(() => {
                console.error('Could not load last Inputs');
            });
    };

    loadOutputs() {
        return this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                    let output = this.outputFactory.makeOutput(id);
                    this.outputMap.set(output.id, output);
                    return output;
                });
            })
            .catch(() => {
                console.error('Could not load Ouput configurations');
            });
    };

    selectInput(inputId) {
        let foundInput = undefined;
        for (let input of this.inputs) {
            if (input.id === inputId) {
                foundInput = input;
            }
        }
        this.activeInput = foundInput;
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
        this.recentRefresher.run();
        this.recentRefresher.start();
    };

    deactivate() {
        this.refresher.stop();
        this.recentRefresher.stop();
    }
}
