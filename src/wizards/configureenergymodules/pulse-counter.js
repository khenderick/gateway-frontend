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

export class PulseCounter extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.title = this.i18n.tr('wizards.configurepulsecounters.title');
    }

    @computedFrom('data.rooms')
    get rooms() {
        return [this.i18n.tr('pages.settings.energy.table.noroom'), ...this.data.rooms.map(({ name }) => name)];
    }
    set rooms(value) {}

    proceed() {
        this.data.pulseCounter.room = this.data.pulseCounter.room_name !== this.i18n.tr('pages.settings.energy.table.noroom')
            ? this.data.rooms.find(({ name }) => name === this.data.pulseCounter.room_name).id
            : 255;
        return this.data;
    }

    attached() {
        super.attached();
    }
}
