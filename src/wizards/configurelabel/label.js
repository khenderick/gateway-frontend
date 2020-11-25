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

export class Label extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.types = ['SOLAR', 'WIND', 'GRID', 'SUPPLIER', 'BATTERY', 'CUSTOM'];
        this.title = this.i18n.tr('wizards.configurelabel.title');
    }

    @computedFrom('data.labelInputs')
    get labelInputs() {
        const { labelInputs, formula } = this.data;
        return labelInputs.map(({ id, name, formula_variable }) => ({ id, name, formula_variable, assigned: formula.includes(formula_variable) }));
    }
    set labelInputs(val) {}

    checkedChange(labelInput) {
        const index = this.data.formula.findIndex(el => el === labelInput.formula_variable);
        if (index !== -1) {
            this.data.formula.splice(index, 1);
            return;
        }
        this.data.formula.push(labelInput.formula_variable);
    }

    proceed() {
        this.data.formula = this.data.formula.join(' + ');
        return this.data;
    }

    attached() {
        super.attached();
    }
}
