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

export class InstallationResetControl extends Step {
    constructor(...rest) {
        let data = rest.pop();
        super(...rest);
        this.data = data;
        this.data.error = '';
        this.data.valid = false;
    }

    get title() {
        return this.i18n.tr('wizards.installationresetcontrol.title');
    }

    onNameChange({ target: { value } }) {
        if (this.data.installationName.length <= value.length) {
            if (this.data.installationName === value) {
                this.data.valid = true;
            } else {
                this.data.valid = false;
            }
        } else {
            this.data.valid = false;
        }
    }

    @computedFrom('data.valid')
    get canProceed() {
        const valid = this.data.valid, reasons = [], fields = new Set();
        if (!valid) {
            reasons.push('Incorrect installation name');
            fields.add('name')
        }
        return { valid: valid, reasons: reasons, fields: fields };
    }

    proceed() {
        return true;
    }

    attached() {
        super.attached();
    }
}
