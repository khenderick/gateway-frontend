import {computedFrom} from "aurelia-framework";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {PulseCounter} from "../../containers/pulsecounter";
import {Step} from "../basewizard";

export class Configure extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureinput.configure.title');
        this.api = Shared.get('api');
        this.data = data;

        this.outputs = [];
        this.pulseCounters = [];
        this.blocklyResolver = undefined;
        this.blocklyPromise = new Promise((resolve) => {
            this.blocklyResolver = resolve;
        });
    }

    outputName(output) {
        if (output.name !== '') {
            return output.name + ' (' + output.id + ')';
        }
        return output.id;
    }

    pulseCounterName(pulseCounter) {
        if (pulseCounter.name !== '') {
            return pulseCounter.name + ' (' + pulseCounter.id + ')';
        }
        return pulseCounter.id;
    }

    @computedFrom('data.mode', 'data.linkedOutput', 'data.pulseCounter', 'data.actions')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        switch (this.data.mode) {
            case 'linked':
                if (this.data.linkedOutput === undefined) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureinput.configure.missingoutput'));
                    fields.add('linkedoutput');
                }
                break;
            case 'pulse':
                if (this.data.pulseCounter === undefined) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureinput.configure.missingpulsecounter'));
                    fields.add('pulsecounter');
                }
                break;
            case 'advanced':
                if (this.data.actions.split(',').length > 32) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureinput.configure.actiontoolong'));
                    fields.add('actions');
                }
                if (this.data.actions === undefined || this.data.actions === '' || this.data.actions.split(',').length === 0) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureinput.configure.noactions'));
                    fields.add('actions');
                }
                break;
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            let input = this.data.input;
            input.basicActions = [];
            input.pulseCounter = undefined;
            input.type = this.data.mode;
            switch (this.data.mode) {
                case 'linked':
                    input.action = this.data.linkedOutput.id;
                    break;
                case 'lightsoff':
                    input.action = 242;
                    break;
                case 'outputsoff':
                    input.action = 241;
                    break;
                case  'pulse':
                    input.action = 255;
                    input.pulseCounter = this.data.pulseCounter;
                    this.api.setPulseCounterConfiguration(
                        this.data.pulseCounter.id,
                        input.id,
                        this.data.pulseCounter.name
                    );
                    break;
                case 'advanced':
                    input.action = 240;
                    input.basicActions = this.data.actions.split(',');
                    break;
                case 'inactive':
                default:
                    input.action = 255;
                    break;
            }
            input.save();
            resolve();
        });
    }

    prepare() {
        let promises = [];
        switch (this.data.mode) {
            case 'linked':
                promises.push(this.api.getOutputConfigurations()
                    .then((data) => {
                        Toolbox.crossfiller(data.config, this.outputs, 'id', (id, entry) => {
                            let output = new Output(id);
                            if (id === this.data.input.action) {
                                this.data.linkedOutput = output;
                                return output;
                            }
                            if (entry.name === 'NOT_IN_USE') {
                                return undefined;
                            }
                            return output;
                        });
                        this.outputs.sort((a, b) => {
                            return a.name > b.name ? 1 : -1;
                        });
                    })
                    .catch((error) => {
                        if (!this.api.isDeduplicated(error)) {
                            console.error('Could not load Ouptut configurations');
                        }
                    })
                );
                break;
            case 'pulse':
                promises.push(this.api.getPulseCounterConfigurations()
                    .then((data) => {
                        Toolbox.crossfiller(data.config, this.pulseCounters, 'id', (id, entry) => {
                            let pulseCounter = new PulseCounter(id);
                            if (entry.input === this.data.input.id) {
                                this.data.pulseCounter = pulseCounter;
                            }
                            return pulseCounter;
                        });
                    })
                    .catch((error) => {
                        if (!this.api.isDeduplicated(error)) {
                            console.error('Could not load Pulse Counter configurations');
                        }
                    }));
                break;
        }
        return Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
