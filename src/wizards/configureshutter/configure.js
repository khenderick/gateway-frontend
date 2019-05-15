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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Toolbox} from '../../components/toolbox';
import {Room} from '../../containers/room';
import {Step} from '../basewizard';
import {Logger} from '../../components/logger';

@inject(Factory.of(Room))
export class Configure extends Step {
    constructor(roomFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.roomFactory = roomFactory;
        this.title = this.i18n.tr('wizards.configureshutter.configure.title');
        this.data = data;

        this.rooms = [];
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

    @computedFrom(
        'data.shutter.name', 'data.timerUp.hours', 'data.timerUp.minutes', 'data.timerUp.seconds',
        'data.timerDown.hours', 'data.timerDown.minutes', 'data.timerDown.seconds'
    )
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.shutter.name.length > 16) {
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

    async proceed() {
        let shutter = this.data.shutter;
        shutter.timerUp = parseInt(this.data.timerUp.hours) * 60 * 60 + parseInt(this.data.timerUp.minutes) * 60 + parseInt(this.data.timerUp.seconds);
        shutter.timerDown = parseInt(this.data.timerDown.hours) * 60 * 60 + parseInt(this.data.timerDown.minutes) * 60 + parseInt(this.data.timerDown.seconds);
        shutter.room = this.data.room === undefined ? 255 : this.data.room.id;
        return shutter.save();
    }

    async prepare() {
        try {
            let roomData = await this.api.getRooms();
            Toolbox.crossfiller(roomData.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                if (this.data.shutter.room === id) {
                    this.data.room = room;
                }
                return room;
            });
            this.rooms.sort((a, b) => {
                return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
            this.rooms.unshift(undefined);
        } catch (error) {
            Logger.error(`Could not load Room configurations: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
