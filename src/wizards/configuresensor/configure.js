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
import {Step} from '../basewizard';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Room} from '../../containers/room';

@inject()
export class Configure extends Step {
    constructor(...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = this.i18n.tr('wizards.configuresensor.configure.title');
        this.data = data;

        this.rooms = [];
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
        return room.name;
    }

    @computedFrom('data.sensor.temperature', 'data.currentOffset', 'data.offset')
    get newTemperature() {
        return this.data.sensor.temperature - this.data.currentOffset + parseFloat(this.data.offset);
    }

    @computedFrom('data.sensor.name', 'data.offset')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.sensor.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configuresensor.configure.nametoolong'));
            fields.add('name');
        }
        let offset = parseFloat(this.data.offset);
        if (isNaN(offset) || offset < -7.5 || offset > 7.5 || (Math.abs(offset) - (Math.round(Math.abs(offset) * 2) / 2)) !== 0) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configuresensor.configure.invalidoffset'));
            fields.add('offset');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        let sensor = this.data.sensor;
        sensor.offset = parseFloat(this.data.offset);
        sensor.temperature = this.newTemperature;
        sensor.room = this.data.room === undefined ? 255 : this.data.room.id;
        return sensor.save();
    }

    async prepare() {
        try {
            const { data: rooms } = await this.api.getRoomConfigurations();
            this.rooms = rooms;
            this.rooms.sort((a, b) => {
                return a.name.toString().localeCompare(b.name.toString(), 'en', {sensitivity: 'base', numeric: true});
            });
            this.rooms.unshift(undefined);
        } catch (error) {
            Logger.error(`Could not load rooms: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
