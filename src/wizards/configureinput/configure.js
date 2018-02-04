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
import {Toolbox} from "../../components/toolbox";
import {PulseCounter} from "../../containers/pulsecounter";
import {Output} from "../../containers/output";
import {Step} from "../basewizard";
import {GroupAction} from '../../containers/groupaction';

@inject(Factory.of(PulseCounter), Factory.of(Output), Factory.of(GroupAction))
export class Configure extends Step {
    constructor(pulseCounterFactory, outputFactory, groupActionFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.pulseCounterFactory = pulseCounterFactory;
        this.outputFactory = outputFactory;
        this.groupActionFactory = groupActionFactory;
        this.title = this.i18n.tr('wizards.configureinput.configure.title');
        this.groupActions = [];
        this.data = data;
        this.errors = [];
        this.timeouts = [0, 1, 2, 3, 4, 5];
    }

    outputName(output) {
        return output.identifier;
    }

    pulseCounterName(pulseCounter) {
        if (pulseCounter.name !== '') {
            return `${pulseCounter.name} (${pulseCounter.id})`;
        }
        return pulseCounter.id;
    }

    timeoutText(timeout, _this) {
        return _this.i18n.tr(`generic.timeouts.${timeout}`);
    }

    groupActionName(groupAction) {
        return groupAction.name;
    }

    @computedFrom('data', 'data.mode', 'data.linkedOutput', 'data.pulseCounter', 'errors')
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
            case 'groupaction':
                if (this.data.linkedGroupAction === undefined) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureinput.configure.missinggroupaction'));
                    fields.add('groupaction');
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
                if (this.errors.length > 0) {
                    valid = false;
                    for (let error of this.errors) {
                        reasons.push(this.i18n.tr(`generic.actionerrors.${error}`));
                    }
                    fields.add('actions');
                }
                break;
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed(finish) {
        if (finish) {
            return this.data.save();
        }
    }

    async prepare() {
        let promises = [];
        switch (this.data.mode) {
            case 'linked':
            case 'motionsensor':
                if (this.data.outputs.length === 0) {
                    promises.push((async () => {
                        try {
                            let data = await this.api.getOutputConfigurations();
                            Toolbox.crossfiller(data.config, this.data.outputs, 'id', (id, entry) => {
                                let output = this.outputFactory(id);
                                output.fillData(entry);
                                for (let i of [1, 2, 3, 4]) {
                                    let ledId = output[`led${i}`].id;
                                    if (ledId !== 255) {
                                        this.data.ledMap.set(ledId, [output, `led${i}`]);
                                    }
                                    if (ledId === this.data.input.id) {
                                        this.data.feedbackOutput = output;
                                    }
                                }
                                if (this.data.mode === 'linked') {
                                    if (id === this.data.input.action) {
                                        this.data.linkedOutput = output;
                                    }
                                } else if (this.data.mode === 'motionsensor') {
                                    if (this.data.input.basicActions !== undefined && this.data.input.basicActions.length === 2) {
                                        if (id === this.data.input.basicActions[1]) {
                                            this.data.linkedOutput = output;
                                        }
                                        this.data.timeout = parseInt(this.data.input.basicActions[0]) - 195;
                                    }
                                }
                                if (!output.inUse) {
                                    return undefined;
                                }
                                return output;
                            });
                            this.data.outputs.sort((a, b) => {
                                return a.name > b.name ? 1 : -1;
                            });
                        } catch (error) {
                            console.error(`Could not load Ouptut configurations: ${error.message}`);
                        }
                    })());
                }
                break;
            case 'pulse':
                if (this.data.pulseCounters.length === 0) {
                    promises.push((async () => {
                        try {
                            let data = await this.api.getPulseCounterConfigurations();
                            Toolbox.crossfiller(data.config, this.data.pulseCounters, 'id', (id, entry) => {
                                let pulseCounter = this.pulseCounterFactory(id);
                                if (entry.input === this.data.input.id) {
                                    this.data.pulseCounter = pulseCounter;
                                    this.data.previousPulseCounter = this.pulseCounterFactory(id);
                                    this.data.previousPulseCounter.fillData(entry);
                                }
                                return pulseCounter;
                            });
                            this.data.pulseCounters.sort((a, b) => {
                                return a.name > b.name ? 1 : -1;
                            });
                        } catch (error) {
                            console.error(`Could not load Pulse Counter configurations: ${error.message}`);
                        }
                    })());
                }
                break;
            case 'groupaction':
                promises.push((async () => {
                    try {
                        let data = await this.api.getGroupActionConfigurations();
                        Toolbox.crossfiller(data.config, this.groupActions, 'id', (id, entry) => {
                            let groupAction = this.groupActionFactory(id);
                            if (entry.id === this.data.actions[1]) {
                                this.data.linkedGroupAction = groupAction;
                            }
                            return groupAction;
                        });
                        this.groupActions.sort((a, b) => {
                            return a.name > b.name ? 1 : -1;
                        });
                    } catch (error) {
                        console.error(`Could not load Group Action configurations: ${error.message}`);
                    }
                })());
        }
        return Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
