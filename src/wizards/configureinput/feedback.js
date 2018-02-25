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
import {BindingSignaler} from "aurelia-templating-resources";
import {Toolbox} from "../../components/toolbox";
import {Input} from "../../containers/input";
import {PulseCounter} from "../../containers/pulsecounter";
import {Led} from "../../containers/led";
import {GlobalLed} from "../../containers/led-global";
import {Output} from "../../containers/output";
import {Step} from "../basewizard";

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

    modeText(mode, _this) {
        return _this.i18n.tr(`generic.leds.modes.${mode}`);
    }

    brightnessText(brightness) {
        return `${Math.round(brightness / 16 * 20) * 5}%`;
    }

    invertedText(inverted, _this) {
        return _this.i18n.tr(`generic.${inverted ? 'off' : 'on'}`);
    }

    feedbackModeText(mode, _this) {
        return _this.i18n.tr(`wizards.configureinput.feedback.modes.${mode}`);
    }

    ledModeText(globalLed) {
        return globalLed.global.text;
    }

    @computedFrom(
        'data', 'data.input', 'data.input.id', 'data.feedbackOutput',
        'data.feedbackOutput.led1', 'data.feedbackOutput.led1.enabled', 'data.feedbackOutput.led1.id',
        'data.feedbackOutput.led2', 'data.feedbackOutput.led2.enabled', 'data.feedbackOutput.led2.id',
        'data.feedbackOutput.led3', 'data.feedbackOutput.led3.enabled', 'data.feedbackOutput.led3.id',
        'data.feedbackOutput.led4', 'data.feedbackOutput.led4.enabled', 'data.feedbackOutput.led4.id'
    )
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

    @computedFrom(
        'data', 'data.feedbackOutput',
        'data.feedbackOutput.led1', 'data.feedbackOutput.led1.enabled',
        'data.feedbackOutput.led2', 'data.feedbackOutput.led2.enabled',
        'data.feedbackOutput.led3', 'data.feedbackOutput.led3.enabled',
        'data.feedbackOutput.led4', 'data.feedbackOutput.led4.enabled',
    )
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

    @computedFrom('data', 'data.ledGlobals', 'data.input', 'data.input.id')
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

    @computedFrom('data', 'data.ledGlobals')
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

    async prepare() {
        let promises = [];
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
                    this.data.outputs.sort((a, b) => {
                        return a.name > b.name ? 1 : -1;
                    });
                } catch (error) {
                    console.error(`Could not load Ouptut configurations: ${error.message}`);
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
                    console.error(`Could not load Input configurations: ${error.message}`);
                }
            })(),
            (async () => {
                try {
                    let data = await this.api.getCanLedConfigurations();
                    Toolbox.crossfiller(data.config, this.data.ledGlobals, 'id', (id) => {
                        return this.globalLedFactory(id);
                    });
                } catch (error) {
                    console.error(`Could not load Globel Led configurations: ${error.message}`);
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
