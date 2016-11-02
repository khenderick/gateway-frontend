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
import {computedFrom} from "aurelia-framework";
import {Step} from "../basewizard";

export class General extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureinput.general.title');
        this.data = data;

        this.modes = [
            'inactive',
            'linked',
            'lightsoff',
            'outputsoff',
            'pulse',
            'advanced'
        ];
    }

    @computedFrom('data.input.name')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.input.name.length > 8) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureinput.general.nametoolong'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            resolve();
        });
    }

    modeText(item) {
        return this.i18n.tr('wizards.configureinput.general.' + item);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
