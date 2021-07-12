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

export class Configure extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.consumptionTypes = ['ELECTRICITY', 'GAS', 'WATER', 'HEAT'];
        this.title = this.i18n.tr('wizards.configurepowerinputs.title');
    }

    @computedFrom('data.powerType')
    get consumptionTypes() { return this.data.powerType === 'POWER_INPUT' ? ['ELECTRICITY'] : ['GAS', 'WATER', 'HEAT']; }
    set consumptionTypes(val) {}

    @computedFrom('data.suppliers')
    get suppliers() { return ['n/a', ...this.data.suppliers.map(({ name }) => name)]; }
    set suppliers(val) {}

    @computedFrom('data.rooms')
    get rooms() { return ['n/a', ...this.data.rooms.map(({ name }) => name)]; }
    set rooms(val) {}

    proceed() {
        const { powerType, powerInput, labelInput } = this.data;
        const supplier = this.data.suppliers.find(({ name }) => name === labelInput.supplierName);
        labelInput.supplier_id = supplier ? supplier.id : null;
        if (powerType === 'POWER_INPUT') {
            const room = this.data.rooms.find(({ name }) => name === powerInput.roomName);
            powerInput.room_id = room ? room.id : null;
        }
        return this.data;
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
