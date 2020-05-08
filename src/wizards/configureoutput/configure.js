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
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Input} from '../../containers/input';
import {Output} from '../../containers/output';
import {Room} from '../../containers/room';
import {Led} from '../../containers/led';
import {Step} from '../basewizard';
import Shared from '../../components/shared';
import {NOT_IN_USE} from 'resources/constants';

@inject(Factory.of(Input), Factory.of(Output), Factory.of(Room))
export class Configure extends Step {
    constructor(inputFactory, outputFactory, roomFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.outputFactory = outputFactory;
        this.inputFactory = inputFactory;
        this.roomFactory = roomFactory;
        this.title = this.i18n.tr('wizards.configureoutput.configure.title');
        this.data = data;

        this.types = Array.from(Output.outputTypes);
        this.types.sort((a, b) => {
            return a > b ? 1 : -1;
        });
        this.inputs = [];
        this.inputMap = {};
        this.outputs = [];
        this.ledMap = {};
        this.rooms = [];
        this.prevName = '';
        this.modes = Array.from(Led.modes);
        this.brightnesses = [];
        for (let i = 1; i < 17; i++) {
            this.brightnesses.push(i);
        }
        this.inverted = [true, false];
    }

    typeText(type) {
        return this.i18n.tr(`generic.outputtypes.${type}`);
    }

    inputText(input, _this) {
        if (input === undefined) {
            return _this.i18n.tr('generic.disabled');
        }
        let name = input.name !== '' ? input.name : input.id;
        if (_this.ledMap[input.id] !== undefined) {
            let output = _this.ledMap[input.id];
            if (output.id !== _this.data.output.id) {
                name = _this.i18n.tr('wizards.configureoutput.configure.configuredfeedback', {name: name, output: output.identifier})
            }
        }
        return name;
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

    roomText(room) {
        if (room === undefined) {
            return this.i18n.tr('generic.noroom');
        }
        return room.identifier;
    }

    checkedChange() {
        if (this.data.output.name && this.data.output.name !== NOT_IN_USE) {
            this.prevName = this.data.output.name;
        }
        this.data.output.name = this.data.notInUse ? NOT_IN_USE : this.prevName;
    }

    @computedFrom('inputMap', 'data.output.led1.id')
    get ledInput1() {
        return this.inputMap[this.data.output.led1.id];
    }

    set ledInput1(input) {
        this.data.output.led1.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led2.id')
    get ledInput2() {
        return this.inputMap[this.data.output.led2.id];
    }

    set ledInput2(input) {
        this.data.output.led2.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led3.id')
    get ledInput3() {
        return this.inputMap[this.data.output.led3.id];
    }

    set ledInput3(input) {
        this.data.output.led3.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led4.id')
    get ledInput4() {
        return this.inputMap[this.data.output.led4.id];
    }

    set ledInput4(input) {
        this.data.output.led4.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('data.output', 'data.output.id', 'data.output.name', 'data.hours', 'data.minutes', 'data.seconds')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.output.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.nametoolong'));
            fields.add('name');
        }
        let maxTimer = Shared.features.contains('default_timer_disabled') ? 65534 : 65535;
        let hours = parseInt(this.data.hours);
        let minutes = parseInt(this.data.minutes);
        let seconds = parseInt(this.data.seconds);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours * 60 * 60 + minutes * 60 + seconds > maxTimer) {
            let components = Toolbox.splitSeconds(maxTimer);
            let parts = [];
            if (components.hours > 0) {
                parts.push(`${components.hours}h`);
            }
            if (components.minutes > 0) {
                parts.push(`${components.minutes}m`);
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(`${components.seconds}s`);
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.timerlength', {max: parts.join(' ')}));
            fields.add('timer');
        }
        let inputs = [];
        for (let i of [1, 2, 3, 4]) {
            let ledId = this.data.output[`led${i}`].id;
            if (ledId !== 255) {
                inputs.push(ledId);
                let output = this.ledMap[ledId];
                if (output !== undefined && output.id !== this.data.output.id) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureoutput.configure.ledinuse', {output: output.identifier}));
                    fields.add(`led${i}`);
                }
            }
        }
        if (inputs.length !== new Set(inputs).size) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.duplicateleds'));
            fields.add('led');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    prepareUseOutput() {
        this.data.notInUse = !this.data.output.inUse;
        if (this.data.notInUse) {
            this.data.output.name = NOT_IN_USE;
        }
    }

    async proceed() {
        let output = this.data.output;
        output.outputType = this.data.type;
        output.timer = parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds);
        output.room = this.data.room === undefined ? 255 : this.data.room.id;
        return output.save();
    }

    async prepare() {
        this.prepareUseOutput();
        try {
            let [inputConfigurations, outputConfigurations, roomData] = await Promise.all([this.api.getInputConfigurations(), this.api.getOutputConfigurations(), this.api.getRooms()]);
            Toolbox.crossfiller(inputConfigurations.config, this.inputs, 'id', (id, inputData) => {
                let input = this.inputFactory(id);
                input.fillData(inputData);
                if (!input.isCan || input.name === '') {
                    return undefined;
                }
                this.inputMap[id] = input;
                return input;
            });
            this.inputs.sort((a, b) => {
                return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
            this.inputs.unshift(undefined);
            Toolbox.crossfiller(outputConfigurations.config, this.outputs, 'id', (id, outputData) => {
                let output = this.outputFactory(id);
                output.fillData(outputData);
                if (output.led1.id !== 255) {
                    this.ledMap[output.led1.id] = output;
                }
                if (output.led2.id !== 255) {
                    this.ledMap[output.led2.id] = output;
                }
                if (output.led3.id !== 255) {
                    this.ledMap[output.led3.id] = output;
                }
                if (output.led4.id !== 255) {
                    this.ledMap[output.led4.id] = output;
                }
                return output;
            });
            Toolbox.crossfiller(roomData.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                if (this.data.output.room === id) {
                    this.data.room = room;
                }
                return room;
            });
            this.rooms.sort((a, b) => {
                return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
            this.rooms.unshift(undefined);
        } catch (error) {
            Logger.error(`Could not load Input, Output and Room configurations: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
