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
import {computedFrom} from 'aurelia-framework';
import {Step} from '../basewizard';
import {Logger} from '../../components/logger';

export class Configure extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.title = this.i18n.tr('wizards.configurepulsecounters.title');
        this.rooms = [];
    }

    roomText(room) {
        if (room === undefined) {
            return this.i18n.tr('generic.noroom');
        }
        return room.name;
    }

    @computedFrom('data.module')
    get sensorsList() {
        const currentVersionSensors = this.sensors[`v${this.data.module.version || 12}`];
        return Object.keys(currentVersionSensors).map(key => currentVersionSensors[key]);
    }
    set sensorsList(value) {}

    async proceed() {
        let pulseCounter = this.data.pulseCounter;
        pulseCounter.room = this.data.room === undefined ? 255 : this.data.room.id;
        return pulseCounter.save();
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
