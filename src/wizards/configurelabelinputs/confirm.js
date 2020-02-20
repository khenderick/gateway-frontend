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
import {Step} from '../basewizard';

export class Confirm extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.title = this.i18n.tr('wizards.configurelabelinputs.title');
        this.types = ['POWER_INPUT', 'PULSE_COUNTER'];
        this.consumption_types = ['ELECTRICITY', 'GAS', 'WATER'];
    }

    proceed() {
        return this.data;
    }

    async prepare() {
        // try {
        //     const { data } = await this.api.getPulseCounters();
        //     Toolbox.crossfiller(data, this.pulseCounters, 'id', (id) => {
        //         let room = this.roomFactory(id);
        //         if (this.data.sensor.room === id) {
        //             this.data.room = room;
        //         }
        //         return room;
        //     });
        //     this.rooms.sort((a, b) => {
        //         return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
        //     });
        //     this.rooms.unshift(undefined);
        // } catch (error) {
        //     Logger.error(`Could not load Room configurations: ${error.message}`);
        // }
    }

    attached() {
        super.attached();
    }
}
