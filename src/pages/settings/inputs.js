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
        this.outputMap = {};
        this.ledMap = {};
        this.pulseCounters = [];
        this.pulseCounterMap = {};
        this.ledGlobals = [];
        this.ledGlobalsMap = {};
        this.groupActions = [];
        this.groupActionMap = {};
        this.groupActionControlsMap = {};
        this.inputControlsMap = {};
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
            Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                return this.inputFactory(id);
            });
            for (let input of this.inputs) {
                let outputIds = [];
                if (input.action === 240) {
                    for (let i = 0; i < input.basicActions.length - 1; i += 2) {
                        if (Toolbox.inRanges(input.basicActions[i], [[154, 162], [165, 170], [176, 206]])) {
                            let outputId = input.basicActions[i + 1];
                            if (!outputIds.contains(outputId)) {
                                outputIds.push(outputId);
                            }
                        }
                    }
                }
                if (outputIds.length > 0) {
                    this.inputControlsMap[input.id] = {outputs: outputIds};
                } else {
                    delete this.inputControlsMap[input.id];
                }
            }
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
                this.pulseCounterMap[data.input] = pulseCounter;
                return pulseCounter;
            });
            for (let input of this.inputs) {
                input.pulseCounter = this.pulseCounterMap[input.id];
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
            Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[output.id] = output;
                return output;
            });
            let newLedMap = {};
            for (let output of this.outputs) {
                for (let i of [1, 2, 3, 4]) {
                    let inputId = output[`led${i}`].id;
                    if (inputId !== 255) {
                        newLedMap[inputId] = [output, `led${i}`];
                    }
                }
            }
            this.ledMap = newLedMap;
        } catch (error) {
            console.error(`Could not load Output configurations: ${error.message}`);
        }
    };

    async loadGlobalLedConfiguration() {
        try {
            let data = await this.api.getCanLedConfigurations();
            Toolbox.crossfiller(data.config, this.ledGlobals, 'id', (id) => {
                return this.globalLedFactory(id);
            });
            let newLedGlobalsMap = {};
            for (let globalLed of this.ledGlobals) {
                for (let i of [1, 2, 3, 4]) {
                    let inputId = globalLed[`led${i}`].id;
                    if (inputId !== 255) {
                        let list = newLedGlobalsMap[inputId];
                        if (list === undefined) {
                            list = [];
                            newLedGlobalsMap[inputId] = list;
                        }
                        list.push([globalLed, `led${i}`]);
                    }
                }
            }
            for (let leds of Object.values(newLedGlobalsMap)) {
                leds.sort((first, second) => {
                    return first[0].id - second[0].id;
                });
            }
            this.ledGlobalsMap = newLedGlobalsMap;
        } catch (error) {
            console.error(`Could not load Globel Led configurations: ${error.message}`);
        }
    }

    async loadGroupActions() {
        try {
            let data = await this.api.getGroupActionConfigurations();
            Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                let groupAction = this.groupActionFactory(id);
                this.groupActionMap[id] = groupAction;
                return groupAction;
            });
            let newGroupActionControlsMap = {};
            for (let groupAction of this.groupActions) {
                for (let i = 0; i < groupAction.actions.length - 1; i += 2) {
                    if (groupAction.actions[i] >= 212 && groupAction.actions[i] <= 217) {
                        let inputId = groupAction.actions[i + 1];
                        let actions = newGroupActionControlsMap[inputId];
                        if (actions === undefined) {
                            actions = [];
                            newGroupActionControlsMap[inputId] = actions;
                        }
                        if (!actions.contains(groupAction, 'id')) {
                            actions.push(groupAction);
                        }
                    }
                }
            }
            this.groupActionControlsMap = newGroupActionControlsMap;
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
