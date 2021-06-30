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
import {bindable, computedFrom, Factory, inject} from 'aurelia-framework';
import {Toolbox} from 'components/toolbox';
import {Room} from 'containers/room';
import {Logger} from 'components/logger';
import {Base} from 'resources/base';
import {NOT_IN_USE} from 'resources/constants';
import {Data} from './data';
import {Output} from 'containers/output';

@bindable({ name: 'shutter', changeHandler: 'shutterChangeHandler' })
@bindable({ name: 'update' })
@bindable({ name: 'outputs' })
@inject(Factory.of(Room))
export class ConfigureShutter extends Base {
    constructor(roomFactory, ...rest /*, data */) {
        super(...rest);
        let data = new Data();
        this.roomFactory = roomFactory;
        this.title = this.i18n.tr('wizards.configureshutter.configure.title');
        this.data = data;
        this.prevName = '';
        this.rooms = [];
        this.types = Array.from(Output.outputTypes);
        this.groups = [undefined];
        for (let i = 0; i < 31; i++) {
            this.groups.push(i);
        }
    }

    groupText(item) {
        if (item === undefined) {
            return this.i18n.tr('generic.nogroup');
        }
        return `${this.i18n.tr('generic.group')} ${item}`;
    }

    roomText(room) {
        if (room === undefined) {
            return this.i18n.tr('generic.noroom');
        }
        return room.identifier;
    }

    typeText(type) {
        return this.i18n.tr(`generic.outputtypes.${type}`);
    }

    checkedChange() {
        if (this.shutter.name && this.shutter.name !== NOT_IN_USE) {
            this.prevName = this.shutter.name;
        }
        this.shutter.name = this.data.notInUse ? NOT_IN_USE : this.prevName;
    }

    shutterChangeHandler() {
        this.prepare();
    }

    @computedFrom(
        'shutter.name', 'data.timerUp.hours', 'data.timerUp.minutes', 'data.timerUp.seconds',
        'data.timerDown.hours', 'data.timerDown.minutes', 'data.timerDown.seconds'
    )
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.shutter && this.shutter.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.nametoolong'));
            fields.add('name');
        }
        let hours = parseInt(this.data.timerUp.hours);
        let minutes = parseInt(this.data.timerUp.minutes);
        let seconds = parseInt(this.data.timerUp.seconds);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours * 60 * 60 + minutes * 60 + seconds > 65536) {
            let components = Toolbox.splitSeconds(65536);
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
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.timeruplength', {max: parts.join(' ')}));
            fields.add('timerup');
        }
        hours = parseInt(this.data.timerDown.hours);
        minutes = parseInt(this.data.timerDown.minutes);
        seconds = parseInt(this.data.timerDown.seconds);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours * 60 * 60 + minutes * 60 + seconds > 65536) {
            let components = Toolbox.splitSeconds(65536);
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
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.timerdownlength', {max: parts.join(' ')}));
            fields.add('timerdown');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async beforeSave() {
        let shutter = this.shutter;
        shutter.timerUp = parseInt(this.data.timerUp.hours) * 60 * 60 + parseInt(this.data.timerUp.minutes) * 60 + parseInt(this.data.timerUp.seconds);
        shutter.timerDown = parseInt(this.data.timerDown.hours) * 60 * 60 + parseInt(this.data.timerDown.minutes) * 60 + parseInt(this.data.timerDown.seconds);
        shutter.room = this.data.room === undefined ? 255 : this.data.room.id;
        shutter.floor = this.data.room ? this.data.room.floorId : 255;
        if (this.shared.installation.isBrainPlatform && this.data.outputType !== 'shutter') {
            const outputsToUpdated = this.outputs.filter(output => output.id === this.shutter.id * 2 || output.id === this.shutter.id * 2 + 1);
            for (const output of outputsToUpdated) {
                output.outputType = this.data.outputType;
                await output.save();
            }
            await this.update.run();
            setTimeout(() => document.getElementById('output-' + outputsToUpdated[0].id).click(), 1000);
        }
        return shutter.save();
    }

    async prepare() {
        if (this.shared.installation.isBrainPlatform) {
            this.data.outputType = 'shutter';
        }
        if (this.shutter.timerUp === 65536) {
            this.shutter.timerUp = 0;
        }
        let components = Toolbox.splitSeconds(this.shutter.timerUp);
        this.data.timerUp.hours = components.hours;
        this.data.timerUp.minutes = components.minutes;
        this.data.timerUp.seconds = components.seconds;
        if (this.shutter.timerDown === 65536) {
            this.shutter.timerDown = 0;
        }
        components = Toolbox.splitSeconds(this.shutter.timerDown);
        this.data.timerDown.hours = components.hours;
        this.data.timerDown.minutes = components.minutes;
        this.data.timerDown.seconds = components.seconds;
        this.data.locked = this.shutter.locked;
        this.shutter._freeze = true;
        this.data.notInUse = !this.shutter.inUse;
        this.data.room = undefined;
        try {
            this.rooms = [];
            let roomData = await this.api.getRoomConfigurations();
            Toolbox.crossfiller(roomData.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                if (this.shutter.room === id) {
                    this.data.room = room;
                }
                return room;
            });
            if (this.shared.installation.isBrainPlatform) {
                this.rooms.unshift({ identifier: this.i18n.tr('generic.noroom') });
            }
            this.rooms.sort((a, b) => {
                return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
        } catch (error) {
            Logger.error(`Could not load Room configurations: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
        this.prepare();
    }
}
