import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Input} from "../../containers/input";
import {Output} from "../../containers/output";
import {PulseCounter} from "../../containers/pulsecounter";
import {ConfigureInputWizard} from "../../wizards/configureinput/index";

export class Inputs extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.dialogService = Shared.get('dialogService');
        this.refresher = new Refresher(() => {
            this.loadInputs().then(() => {
                this.signaler.signal('reload-inputs');
            });
            this.loadPulseCounters();
            this.loadOutputs();
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent();
        }, 1000);

        this.inputs = [];
        this.outputs = [];
        this.outputMap = new Map();
        this.pulseCounters = [];
        this.pulseCounterMap = new Map();
        this.activeInput = undefined;
        this.inputsLoading = true;
        this.pulseCountersLoading = true;
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

    loadPulseCounters() {
        return this.api.getPulseCounterConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.pulseCounters, 'id', (id, data) => {
                    let pulseCounter = new PulseCounter(id);
                    this.pulseCounterMap.set(data.input, pulseCounter);
                    return pulseCounter;
                });
                for (let input of this.inputs) {
                    if (this.pulseCounterMap.has(input.id)) {
                        input.pulseCounter = this.pulseCounterMap.get(input.id);
                    } else {
                        input.pulseCounter = undefined;
                    }
                }
                this.pulseCountersLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Pulse Counter configurations');
                }
            });
    }

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

    edit() {
        if (this.activeInput === undefined) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureInputWizard, model: {input: this.activeInput}}).then((response) => {
            if (!response.wasCancelled) {
                response.output.then((result) => {
                    // @TODO: Force refresh the activeInput to reflect all changes
                });
            } else {
                this.activeInput.cancel();
                console.info('The ConfigureInputWizard was cancelled');
            }
        });
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
