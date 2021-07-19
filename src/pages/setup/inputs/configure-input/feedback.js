/*
 * Copyright (C) 2016 OpenMotics BV
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {BindingSignaler} from 'aurelia-templating-resources';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Input} from 'containers/input';
import {PulseCounter} from 'containers/pulsecounter';
import {Led} from 'containers/led';
import {GlobalLed} from 'containers/led-global';
import {Output} from 'containers/gateway/output';
import { Step } from 'wizards/basewizard';

@inject(BindingSignaler, Factory.of(Input), Factory.of(Output), Factory.of(PulseCounter), Factory.of(GlobalLed))
export class Feedback extends Step {
    constructor(signaler, inputFactory, outputFactory, pulseCounterFactory, globalLedFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.inputFactory = inputFactory;
        this.outputFactory = outputFactory;
        this.pulseCounterFactory = pulseCounterFactory;
        this.globalLedFactory = globalLedFactory;
        this.signaler = signaler;
        this.title = this.i18n.tr('wizards.configureinput.feedback.title');
        this.data = data;
        this.errors = [];
        this.inputs = [];
        this.inputsMap = {};
        this.modes = Array.from(Led.modes);
        this.modesAndOff = Array.from(Led.modesAndOff);
        this.brightnesses = [];
        for (let i = 1; i < 17; i++) {
            this.brightnesses.push(i);
        }
        this.inverted = [true, false];
        this.feedbackModes = ['none', 'output', 'generic'];
        this.newGlobalLed = undefined;
    }

    outputName(output) {
        return output.identifier;
    }

    modeText(mode) {
        return this.i18n.tr(`generic.leds.modes.${mode}`);
    }

    brightnessText(brightness) {
        return `${Math.round(brightness / 16 * 20) * 5}%`;
    }

    invertedText(inverted) {
        return this.i18n.tr(`generic.${inverted ? 'off' : 'on'}`);
    }

    feedbackModeText(mode) {
        return this.i18n.tr(`wizards.configureinput.feedback.modes.${mode}`);
    }

    ledModeText(globalLed) {
        return globalLed.global.text;
    }

    @computedFrom('data.feedbackOutput')
    get usedLed() {
        if (this.data.feedbackOutput !== undefined) {
            for (let i of [1, 2, 3, 4]) {
                if (this.data.feedbackOutput[`led${i}`].enabled && this.data.feedbackOutput[`led${i}`].id === this.data.input.id) {
                    return this.data.feedbackOutput[`led${i}`];
                }
            }
        }
        return undefined;
    }

    @computedFrom('data.feedbackOutput')
    get unusedLed() {
        if (this.data.feedbackOutput !== undefined) {
            for (let i of [1, 2, 3, 4]) {
                if (!this.data.feedbackOutput[`led${i}`].enabled) {
                    return this.data.feedbackOutput[`led${i}`];
                }
            }
        }
        return undefined;
    }

    @computedFrom('data.ledGlobals', 'data.input.id')
    get activeGlobalLeds() {
        let leds = [];
        for (let globalLed of this.data.ledGlobals) {
            for (let i of [1, 2, 3, 4]) {
                let ledId = globalLed[`led${i}`].id;
                if (ledId === this.data.input.id) {
                    leds.push({global: globalLed, ledId: `led${i}`});
                }
            }
        }
        return leds.sort((first, second) => {
            return first.global.id - second.global.id;
        });
    }

    @computedFrom('data.ledGlobals', 'activeGlobalLeds')
    get availableGlobalLeds() {
        let activeGlobalLedIds = this.activeGlobalLeds.map(i => i.global.id);
        let leds = {};
        for (let globalLed of this.data.ledGlobals) {
            if (activeGlobalLedIds.contains(globalLed.id)) {
                continue;
            }
            for (let i of [1, 2, 3, 4]) {
                if (!globalLed[`led${i}`].enabled) {
                    if (leds[globalLed.id] === undefined) {
                        leds[globalLed.id] = {global: globalLed, ledId: `led${i}`};
                    }
                }
            }
        }
        return Array.from(Object.values(leds))
            .sort((first, second) => {
                return first.global.id - second.global.id;
            });
    }

    set availableGlobalLeds(newValue) {
        // Needed for dropdown binding
    }

    @computedFrom()
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed(finished) {
        if (finished) {
            return this.data.save();
        }
    }

    addLedFeedback() {
        setTimeout(() => {
            if (this.usedLed === undefined || this.usedLed.id === 255) {
                this.unusedLed.load(this.data.input.id, 'On B16');
                this.signaler.signal('update-feedback');
            }
        }, 0);
    }

    async prepare() {
        let promises = [];
        const sortByName = (a, b) => {
            if (!a.name && b.name) {
                return 1;
            }
            return a.name && b.name ? a.name.localeCompare(b.name) : -1;
        };
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
                                this.data.ledMap[ledId] = [output, `led${i}`];
                            }
                            if (ledId === this.data.input.id) {
                                this.data.feedbackOutput = output;
                            }
                        }
                        if (id === this.data.input.action) {
                            this.data.linkedOutput = output;
                        }
                        if (!output.inUse) {
                            return undefined;
                        }
                        return output;
                    });
                    this.data.outputs.sort(sortByName);
                } catch (error) {
                    Logger.error(`Could not load Ouptut configurations: ${error.message}`);
                }
            })());
        }
        await Promise.all([
            ...promises,
            (async () => {
                try {
                    let data = await this.api.getInputConfigurations();
                    Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                        let input = this.inputFactory(id);
                        this.inputsMap[id] = input;
                        return input;
                    });
                } catch (error) {
                    Logger.error(`Could not load Input configurations: ${error.message}`);
                }
            })(),
            (async () => {
                try {
                    let data = await this.api.getCanLedConfigurations();
                    Toolbox.crossfiller(data.config, this.data.ledGlobals, 'id', (id) => {
                        return this.globalLedFactory(id);
                    });
                } catch (error) {
                    Logger.error(`Could not load Globel Led configurations: ${error.message}`);
                }
            })()
        ]);
        if (this.data.feedbackOutput !== undefined) {
            this.data.feedbackMode = 'output';
        } else if (this.activeGlobalLeds.length > 0) {
            this.data.feedbackMode = 'generic';
        } else {
            this.data.feedbackMode = 'none';
        }
        this.addLedFeedback();
    }

    addNewGlobalLed() {
        this.newGlobalLed.global[this.newGlobalLed.ledId].load(this.data.input.id, 'On B16', true);
        this.newGlobalLed = this.availableGlobalLeds[0];
        this.signaler.signal('reload-globalleds');
    }

    unlinkLed(led) {
        led.global[led.ledId].load(255, 'UNKNOWN', true);
        this.signaler.signal('reload-globalleds');
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
