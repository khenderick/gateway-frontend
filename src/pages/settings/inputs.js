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
        this.ledMap = new Map();
        this.pulseCounters = [];
        this.pulseCounterMap = new Map();
        this.activeInput = undefined;
        this.inputsLoading = true;
        this.pulseCountersLoading = true;
        this.filters = ['normal', 'virtual', 'can', 'unconfigured'];
        this.filter = ['normal', 'virtual', 'can'];
    };

    get filteredInputs() {
        let inputs = [];
        for (let input of this.inputs) {
            if ((this.filter.contains('virtual') && input.isVirtual) ||
                (this.filter.contains('can') && input.isCan) ||
                (this.filter.contains('normal') && !input.isCan && !input.isVirtual) ||
                (this.filter.contains('unconfigured') && !input.inUse)) {
                inputs.push(input);
            }
        }
        return inputs;
    }

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
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id, outputData) => {
                    let output = new Output(id);
                    output.fillData(outputData);
                    this.outputMap.set(output.id, output);
                    for (let i of [1, 2, 3, 4]) {
                        let ledId = output['led' + i].id;
                        if (ledId !== 255) {
                            this.ledMap.set(ledId, [output, 'led' + i]);
                        }
                    }
                    return output;
                });
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Output configurations');
                }
            });
    };

    filterText(filter) {
        return this.i18n.tr('pages.settings.inputs.filter.' + filter);
    }

    filterUpdated() {
        this.signaler.signal('reload-inputs');
    }

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
            if (response.wasCancelled) {
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
