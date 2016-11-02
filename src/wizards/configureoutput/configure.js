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
import {computedFrom} from "aurelia-framework";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Input} from "../../containers/input";
import {Led} from "../../containers/led";
import {Step} from "../basewizard";

export class Configure extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureoutput.configure.title');
        this.api = Shared.get('api');
        this.data = data;

        this.types = ['light', 'relay'];
        this.inputs = [];
        this.inputMap = new Map();
        this.modes = Array.from(Led.modes);
        this.brightnesses = [];
        for (let i = 1; i < 17; i++) {
            this.brightnesses.push(i);
        }
        this.inverted = [true, false];
    }

    typeText(type) {
        return this.i18n.tr('generic.' + type);
    }

    inputText(input) {
        if (input === undefined) {
            return this.i18n.tr('generic.disabled');
        }
        return input.name;
    }

    modeText(mode) {
        return this.i18n.tr('generic.leds.modes.' + mode);
    }

    brightnessText(brightness) {
        return (brightness / 16 * 100) + '%';
    }

    invertedText(inverted) {
        return this.i18n.tr('generic.' + (inverted ? 'off' : 'on'));
    }

    get ledInput1() {
        return this.inputMap.get(this.data.output.led1.id);
    }

    set ledInput1(input) {
        this.data.output.led1.id = input === undefined ? 255 : input.id;
    }

    get ledInput2() {
        return this.inputMap.get(this.data.output.led2.id);
    }

    set ledInput2(input) {
        this.data.output.led2.id = input === undefined ? 255 : input.id;
    }

    get ledInput3() {
        return this.inputMap.get(this.data.output.led3.id);
    }

    set ledInput3(input) {
        this.data.output.led3.id = input === undefined ? 255 : input.id;
    }

    get ledInput4() {
        return this.inputMap.get(this.data.output.led4.id);
    }

    set ledInput4(input) {
        this.data.output.led4.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('data.output.name', 'data.hours', 'data.minutes', 'data.seconds')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.output.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.nametoolong'));
            fields.add('name');
        }
        if (parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds) > 65536) {
            let components = Toolbox.splitSeconds(65536);
            let parts = [];
            if (components.hours > 0) {
                parts.push(components.hours + 'h');
            }
            if (components.minutes > 0) {
                parts.push(components.minutes + 'm');
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(components.seconds + 's');
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.timerlength', {max: parts.join(' ')}));
            fields.add('timer');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            let output = this.data.output;
            output.type = this.data.type === 'light' ? 255 : 0;
            output.timer = parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds);
            output.save();
            resolve();
        });
    }

    prepare() {
        return this.api.getInputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.inputs, 'id', (id, data) => {
                    let input = new Input(id);
                    input.fillData(data);
                    if (!input.isCan || input.name === '') {
                        return undefined;
                    }
                    this.inputMap.set(id, input);
                    return input;
                });
                this.inputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.inputs.unshift(undefined);
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Input configurations');
                }
            });
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
