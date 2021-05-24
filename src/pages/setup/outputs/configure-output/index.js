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
import {bindable, inject, Factory, computedFrom} from 'aurelia-framework';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Input} from 'containers/input';
import {Output} from 'containers/output';
import {Room} from 'containers/room';
import {Led} from 'containers/led';
import {Data} from './data';
import Shared from 'components/shared';
import {NOT_IN_USE, ZERO_TIMER} from 'resources/constants';
import {Base} from 'resources/base';
import {EventAggregator} from 'aurelia-event-aggregator';

@bindable({ name: 'output', changeHandler: 'outputChangeHandler' })
@inject(Factory.of(Input), Factory.of(Output), Factory.of(Room), EventAggregator)
export class ConfigureOutput extends Base {
    constructor(inputFactory, outputFactory, roomFactory, eventAggregator, ...rest /*, data */) {
        super(...rest);
        let data = new Data();
        this.outputFactory = outputFactory;
        this.inputFactory = inputFactory;
        this.roomFactory = roomFactory;
        this.eventAggregator = eventAggregator;
        this.title = this.i18n.tr('wizards.configureoutput.configure.title');
        this.data = data;

        this.types = this.shared.installation.isBrainPlatform ? Array.from(Output.outputTypes) : Array.from(Output.outputTypes).filter(val => val !== 'shutter');
        this.types.sort((a, b) => {
            return a > b ? 1 : -1;
        });
        this.inputs = [];
        this.inputMap = {};
        this.outputs = [];
        this.ledMap = {};
        this.rooms = [];
        this.prevName = '';
        this.output;
        this.modes = Array.from(Led.modes);
        this.brightnesses = [];
        for (let i = 1; i < 17; i++) {
            this.brightnesses.push(i);
        }
        this.inverted = [true, false];
    }

    bind() {
        this.installationChangedSubscription = this.eventAggregator.subscribe('installationChanged', _ => {
            this.types = this.shared.installation.isBrainPlatform ? Array.from(Output.outputTypes) : Array.from(Output.outputTypes).filter(val => val !== 'shutter');
            this.signaler.signal('types-updated');
        });
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
            if (output.id !== _this.output.id) {
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

    notInUseChange() {
        if (this.output.name && this.output.name !== NOT_IN_USE) {
            this.prevName = this.output.name;
        }
        this.output.name = this.data.notInUse ? NOT_IN_USE : this.prevName;
    }

    outputChangeHandler() {
        this.prepare();
    }

    @computedFrom('inputMap', 'data.output.led1.id')
    get ledInput1() {
        return this.inputMap[this.output.led1.id];
    }

    set ledInput1(input) {
        this.output.led1.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led2.id')
    get ledInput2() {
        return this.inputMap[this.output.led2.id];
    }

    set ledInput2(input) {
        this.output.led2.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led3.id')
    get ledInput3() {
        return this.inputMap[this.output.led3.id];
    }

    set ledInput3(input) {
        this.output.led3.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('inputMap', 'data.output.led4.id')
    get ledInput4() {
        return this.inputMap[this.output.led4.id];
    }

    set ledInput4(input) {
        this.output.led4.id = input === undefined ? 255 : input.id;
    }

    @computedFrom('output', 'data.output.id', 'data.output.name', 'data.hours', 'data.minutes', 'data.seconds')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.output && this.output.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.nametoolong'));
            fields.add('name');
        }
        let maxTimer = Shared.features.contains('default_timer_disabled') ? 65534 : ZERO_TIMER;
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
            let ledId = this.output[`led${i}`].id;
            if (ledId !== 255) {
                inputs.push(ledId);
                let output = this.ledMap[ledId];
                if (output !== undefined && output.id !== this.output.id) {
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
        return { valid, reasons, fields };
    }

    save(output, pairedOutput) {
        if (pairedOutput) {
            this.beforeSave(pairedOutput);
        }

        this.beforeSave(output);
    }

    async beforeSave(output) {
        output.outputType = this.data.type;
        output.timer = parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds);
        if (output.timer === 0) {
            output.timer = ZERO_TIMER;
        }
        output.room = this.data.room === undefined || this.data.room.identifier === this.i18n.tr('generic.noroom') ? 255 : this.data.room.id;
        output.floor = this.data.room ? this.data.room.floorId : 255;
        return output.save();
    }

    async prepare() {
        this.data.type = this.output.outputType;
        this.data.locked = this.output.locked;
        let components = Toolbox.splitSeconds(this.output.timer);
        this.data.hours = components.hours;
        this.data.minutes = components.minutes;
        this.data.seconds = components.seconds;
        if (this.output.timer === ZERO_TIMER) {
            this.data.hours = 0;
            this.data.minutes = 0;
            this.data.seconds = 0;
        }
        this.output._freeze = true;
        this.data.notInUse = !this.output.inUse;
        this.data.room = undefined;
        try {
            this.inputs = [];
            this.rooms = [];
            this.outputs = [];
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
            this.inputs.unshift({ id: 255, name: this.i18n.tr('pages.setup.inputs.filter.unconfigured') });
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
                if (this.output.room === id) {
                    this.data.room = room;
                }
                return room;
            });
            this.rooms.sort((a, b) => {
                return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
            this.rooms.unshift({ identifier: this.i18n.tr('generic.noroom') });
        } catch (error) {
            Logger.error(`Could not load Input, Output and Room configurations: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
        this.prepare();
    }

    unbind() {
        this.installationChangedSubscription.dispose();
    }
}
