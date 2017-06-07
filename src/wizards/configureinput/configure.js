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
import {Toolbox} from "../../components/toolbox";
import {Input} from "../../containers/input";
import {PulseCounter} from "../../containers/pulsecounter";
import {Led} from "../../containers/led";
import {Step} from "../basewizard";

@inject(Factory.of(Input), Factory.of(PulseCounter))
export class Configure extends Step {
    constructor(inputFactory, pulseCounterFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.inputFactory = inputFactory;
        this.pulseCounterFactory = pulseCounterFactory;
        this.title = this.i18n.tr('wizards.configureinput.configure.title');
        this.data = data;
        this.errors = [];

        this.inputs = [];
        this.inputsMap = new Map();
        this.blocklyResolver = undefined;
        this.blocklyPromise = new Promise((resolve) => {
            this.blocklyResolver = resolve;
        });
        this.modes = Array.from(Led.modes);
        this.brightnesses = [];
        for (let i = 1; i < 17; i++) {
            this.brightnesses.push(i);
        }
        this.inverted = [true, false];
        this.unconfigureFeedback = false;
    }

    outputName(output) {
        return output.identifier;
    }

    modeText(mode, _this) {
        return _this.i18n.tr('generic.leds.modes.' + mode);
    }

    brightnessText(brightness) {
        return (brightness / 16 * 100) + '%';
    }

    invertedText(inverted, _this) {
        return _this.i18n.tr('generic.' + (inverted ? 'off' : 'on'));
    }

    pulseCounterName(pulseCounter) {
        if (pulseCounter.name !== '') {
            return pulseCounter.name + ' (' + pulseCounter.id + ')';
        }
        return pulseCounter.id;
    }

    get unusedLed() {
        if (this.data.linkedOutput !== undefined) {
            for (let i of [1, 2, 3, 4]) {
                if (!this.data.linkedOutput['led' + i].enabled) {
                    return this.data.linkedOutput['led' + i];
                }
            }
        }
        return undefined;
    }

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
                if (this.errors.length > 0) {
                    valid = false;
                    for (let error of this.errors) {
                        reasons.push(this.i18n.tr('generic.actionerrors.' + error));
                    }
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
            input.save()
                .then(() => {
                    if (input.pulseCounter !== undefined) {
                        this.api.setPulseCounterConfiguration(
                            input.pulseCounter.id,
                            input.id,
                            input.pulseCounter.name,
                            input.pulseCounter.room
                        );
                    }
                    if (this.data.previousPulseCounter !== undefined && (input.pulseCounter === undefined || input.pulseCounter.id !== this.data.previousPulseCounter.id)) {
                        this.api.setPulseCounterConfiguration(
                            this.data.previousPulseCounter.id,
                            255,
                            this.data.previousPulseCounter.name,
                            this.data.previousPulseCounter.room
                        );
                    }
                    if (this.data.mode === 'linked') {
                        this.data.linkedOutput.save();
                    }
                    if (this.data.ledMap.has(input.id)) {
                        let outputData = this.data.ledMap.get(input.id);
                        let output = outputData[0];
                        let ledId = outputData[1];
                        if (this.data.mode !== 'linked') {
                            if (this.unconfigureFeedback) {
                                output[ledId].load(255, 'UNKNOWN');
                                output.save();
                            }
                        } else if (outputData[0].id !== input.action) {
                            output[ledId].load(255, 'UNKNOWN');
                            output.save();
                        }
                    }
                });
            resolve();
        });
    }

    prepare() {
        let promises = [];
        switch (this.data.mode) {
            case 'linked':
                promises.push(this.api.getInputConfigurations()
                    .then((data) => {
                        Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                            let input = this.inputFactory(id);
                            this.inputsMap.set(id, input);
                            return input;
                        })
                    })
                    .catch((error) => {
                        if (!this.api.isDeduplicated(error)) {
                            console.error('Could not load Input configurations');
                        }
                    })
                );
                break;
            case 'pulse':
                if (this.data.pulseCounters.length === 0) {
                    promises.push(this.api.getPulseCounterConfigurations()
                    .then((data) => {
                        Toolbox.crossfiller(data.config, this.data.pulseCounters, 'id', (id, entry) => {
                            let pulseCounter = this.pulseCounterFactory(id);
                            if (entry.input === this.data.input.id) {
                                this.data.pulseCounter = pulseCounter;
                                this.data.previousPulseCounter = this.pulseCounterFactory(id);
                                this.data.previousPulseCounter.fillData(entry);
                            }
                            return pulseCounter;
                        });
                    })
                    .catch((error) => {
                        if (!this.api.isDeduplicated(error)) {
                            console.error('Could not load Pulse Counter configurations');
                        }
                    }));
                }
                break;
        }
        return Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
