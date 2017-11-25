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
import {inject, Factory, computedFrom} from "aurelia-framework";
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import Shared from "../../components/shared";
import {Input, times} from "../../containers/input";
import {Output} from "../../containers/output";
import {GlobalLed} from "../../containers/led-global";
import {PulseCounter} from "../../containers/pulsecounter";
import {GroupAction} from "../../containers/groupaction";
import {ConfigureInputWizard} from "../../wizards/configureinput/index";

@inject(DialogService, Factory.of(Input), Factory.of(Output), Factory.of(PulseCounter), Factory.of(GlobalLed), Factory.of(GroupAction))
export class Inputs extends Base {
    constructor(dialogService, inputFactory, outputFactory, pulseCounterFactory, globalLedFactory, groupActionFactory, ...rest) {
        super(...rest);
        this.pulseCounterFactory = pulseCounterFactory;
        this.outputFactory = outputFactory;
        this.inputFactory = inputFactory;
        this.globalLedFactory = globalLedFactory;
        this.groupActionFactory = groupActionFactory;
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
            this.loadGlobalLedConfiguration().catch(() => {});
            this.loadGroupActions().catch(() => {});
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent().catch(() => {});
        }, 2500);
        this.shared = Shared;
        this.times = times;
        this.initVariables();
    };

    initVariables() {
        this.inputs = [];
        this.outputs = [];
        this.outputMap = new Map();
        this.ledMap = new Map();
        this.pulseCounters = [];
        this.pulseCounterMap = new Map();
        this.ledGlobals = [];
        this.ledGlobalsMap = new Map();
        this.groupActions = [];
        this.groupActionMap = new Map();
        this.inputControlsMap = new Map();
        this.activeInput = undefined;
        this.inputsLoading = true;
        this.pulseCountersLoading = true;
        this.filters = ['normal', 'virtual', 'can', 'unconfigured'];
        this.filter = ['normal', 'virtual', 'can'];
        this.installationHasUpdated = false;
    }

    @computedFrom('inputs', 'filter')
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
            Toolbox.crossfiller(data.config, this.inputs, 'id', (id, inputData) => {
                let input = this.inputFactory(id);
                input.fillData(inputData);
                if (input.action === 240) {
                    for (let i = 0; i < input.basicActions.length - 1; i += 2) {
                        if (Toolbox.inRanges(input.basicActions[i], [[154, 162], [165, 170], [176, 206]])) {
                            if (!this.inputControlsMap.has(id)) {
                                this.inputControlsMap.set(id, {'outputs': []});
                            }
                            let outputId = input.basicActions[i + 1];
                            let outputIds = this.inputControlsMap.get(id).outputs;
                            if (!outputIds.contains(outputId)) {
                                outputIds.push(outputId);
                            }
                        }
                    }
                    this.inputControlsMap
                }
                return input;
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

    async loadGlobalLedConfiguration() {
        try {
            let data = await this.api.getCanLedConfigurations();
            Toolbox.crossfiller(data.config, this.ledGlobals, 'id', (id, ledConfig) => {
                let globalLed = this.globalLedFactory(id);
                globalLed.fillData(ledConfig);
                for (let i of [1, 2, 3, 4]) {
                    let ledId = globalLed[`led${i}`].id;
                    if (ledId !== 255) {
                        let list = this.ledGlobalsMap.get(ledId);
                        if (list === undefined) {
                            list = [];
                            this.ledGlobalsMap.set(ledId, list);
                        }
                        list.push([globalLed, `led${i}`]);
                        list.sort((first, second) => {
                            return first[0].id - second[0].id;
                        });
                    }
                }
                return globalLed;
            });
        } catch (error) {
            console.error(`Could not load Globel Led configurations: ${error.message}`);
        }
    }

    async loadGroupActions() {
        try {
            let data = await this.api.getGroupActionConfigurations();
            Toolbox.crossfiller(data.config, this.groupActions, 'id', (id, itemData) => {
                let groupAction = this.groupActionFactory(id);
                groupAction.fillData(itemData);
                for (let i = 0; i < groupAction.actions.length - 1; i += 2) {
                    if (groupAction.actions[i] >= 212 && groupAction.actions[i] <= 217) {
                        let inputId = groupAction.actions[i + 1];
                        if (!this.groupActionMap.has(inputId)) {
                            this.groupActionMap.set(inputId, []);
                        }
                        let actions = this.groupActionMap.get(inputId);
                        if (!actions.contains(groupAction, 'id')) {
                            actions.push(groupAction);
                        }
                    }
                }
                return groupAction;
            });
        } catch (error) {
            console.error(`Could not load Group Action Configurations: ${error.message}`);
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
