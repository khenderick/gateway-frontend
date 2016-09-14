import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {Input} from "../containers/input";
import {Output} from "../containers/output";

export class Inputs extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadInputs().then(() => {
                this.signaler.signal('reload-inputs');
            });
            this.loadOutputs();
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent();
        }, 1000);

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
                    return new Input(id);
                });
                this.inputs.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.inputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Input configurations');
                }
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
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load last Inputs');
                }
            });
    };

    loadOutputs() {
        return this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                    let output = new Output(id);
                    this.outputMap.set(output.id, output);
                    return output;
                });
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Output configurations');
                }
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
