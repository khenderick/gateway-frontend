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
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import Shared from "../../components/shared";
import {Input} from "../../containers/input";
import {Output} from "../../containers/output";
import {PulseCounter} from "../../containers/pulsecounter";
import {ConfigureInputWizard} from "../../wizards/configureinput/index";

@inject(DialogService, Factory.of(Input), Factory.of(Output), Factory.of(PulseCounter))
export class Inputs extends Base {
    constructor(dialogService, inputFactory, outputFactory, pulseCounterFactory, ...rest) {
        super(...rest);
        this.pulseCounterFactory = pulseCounterFactory;
        this.outputFactory = outputFactory;
        this.inputFactory = inputFactory;
        this.dialogService = dialogService;
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadInputs().then(() => {
                this.signaler.signal('reload-inputs');
            });
            this.loadPulseCounters().catch(() => {});
            this.loadOutputs().catch(() => {});
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent().catch(() => {});
        }, 1000);
        this.shared = Shared;
        this.initVariables();
    };

    initVariables() {
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
        this.installationHasUpdated = false;
    }

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

    async loadInputs() {
        try {
            let data = await this.api.getInputConfigurations();
            Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                return this.inputFactory(id);
            });
            this.inputs.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.inputsLoading = false;
        } catch (error) {
            console.error(`Could not load Input configurations: ${error.message}`);
        }
    };

    async loadPulseCounters() {
        try {
            let data = await this.api.getPulseCounterConfigurations();
            Toolbox.crossfiller(data.config, this.pulseCounters, 'id', (id, data) => {
                let pulseCounter = this.pulseCounterFactory(id);
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
        } catch (error) {
            console.error(`Could not load Pulse Counter configurations: ${error.message}`);
        }
    }

    async loadRecent() {
        try {
            let data = await this.api.getLastInputs();
            let recentInputs = [];
            for (let input of data.inputs) {
                recentInputs.push(input[0])
            }
            for (let input of this.inputs) {
                input.recent = recentInputs.contains(input.id);
            }
        } catch (error) {
            console.error(`Could not load last Inputs: ${error.message}`);
        }
    };

    async loadOutputs() {
        try {
            let data = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(data.config, this.outputs, 'id', (id, outputData) => {
                let output = this.outputFactory(id);
                output.fillData(outputData);
                this.outputMap.set(output.id, output);
                for (let i of [1, 2, 3, 4]) {
                    let ledId = output[`led${i}`].id;
                    if (ledId !== 255) {
                        this.ledMap.set(ledId, [output, `led${i}`]);
                    }
                }
                return output;
            });
        } catch (error) {
            console.error(`Could not load Output configurations: ${error.message}`);
        }
    };

    filterText(filter) {
        return this.i18n.tr(`pages.settings.inputs.filter.${filter}`);
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
        this.dialogService.open({viewModel: ConfigureInputWizard, model: {input: this.activeInput}}).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeInput.cancel();
                console.info('The ConfigureInputWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
        this.recentRefresher.run();
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
