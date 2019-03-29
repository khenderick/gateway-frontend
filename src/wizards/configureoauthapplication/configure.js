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
import {Step} from "../basewizard";

export class Configure extends Step {
    constructor(...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = this.i18n.tr('wizards.configureoauthapplication.configure.title');
        this.data = data;

        this.grantTypes = ['authorization-code', 'implicit', 'client-credentials'];
        this.clientTypes = ['confidential', 'public'];
    }

    grantTypeText(type) {
        return this.i18n.tr(`generic.oauth.granttypes.${type}`);
    }

    clientTypeText(type) {
        return this.i18n.tr(`generic.oauth.clienttypes.${type}`);
    }

    @computedFrom('data.application.name', 'data.application.redirectUris')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.application.name === undefined || this.data.application.name.trim().length < 8 || this.data.application.name.trim().length > 32) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoauthapplication.configure.invalidname'));
            fields.add('name');
        }
        if ([null, undefined].contains(this.data.application.redirectUris) || this.data.application.redirectUris.trim() < 5) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoauthapplication.configure.invalidredirecturi'));
            fields.add('redirecturi');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        await this.data.application.save();
        return this.data.application;
    }

    async prepare() {
        if (this.data.application.grantType === undefined) {
            this.data.application.grantType = this.grantTypes[0];
        }
        if (this.data.application.clientType === undefined) {
            this.data.application.clientType = this.clientTypes[0];
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
