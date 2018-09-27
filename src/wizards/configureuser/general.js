/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {Toolbox} from "../../components/toolbox";
import {Step} from "../basewizard";

export class General extends Step {
    constructor(...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = this.i18n.tr('wizards.configureuser.general.title');
        this.data = data;
        this.roles = ['A', 'N']
    }

    roleText(role) {
        return this.i18n.tr('pages.settings.users.roles.' + role);
    }

    @computedFrom('data', 'data.user', 'data.user.firstName', 'data.user.lastName', 'data.user.email', 'data.user.role')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        for (let field of ['firstName', 'lastName', 'email']) {
            if (this.data.user[field] === undefined || this.data.user[field].trim().length === 0) {
                valid = false;
                reasons.push(this.i18n.tr(`wizards.configureuser.general.empty${field.toLowerCase()}`));
                fields.add(field.toLowerCase());
            }
        }
        if (!['A', 'N'].contains(this.data.user.role)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureuser.general.invalidrole'));
            fields.add('role');
        }
        if (!fields.has('email') && !Toolbox.validEmail(this.data.user.email)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureuser.general.invalidemail'));
            fields.add('email');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
