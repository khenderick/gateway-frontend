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

export class LabelInput extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.title = this.i18n.tr('wizards.configurelabelinputs.title');
        this.consumptionTypes = ['ELECTRICITY', 'GAS', 'WATER'];
    }

    @computedFrom('data.suppliers')
    get suppliers() { return ['n/a', ...this.data.suppliers.map(({ name }) => name)]; }
    set suppliers(val) {}
    
    @computedFrom('data.power_type')
    get consumptionTypes() { return this.data.power_type === 'POWER_INPUT' ? ['ELECTRICITY'] : ['GAS', 'WATER']; }
    set consumptionTypes(val) {}

    proceed() {
        const supplier = this.data.suppliers.find(({ name }) => name === this.data.supplier);
        this.data.supplier_id = supplier ? supplier.id : null;
        return this.data;
    }

    async prepare() {
    }

    attached() {
        super.attached();
    }
}
