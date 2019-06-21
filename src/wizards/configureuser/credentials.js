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
import {computedFrom, inject, BindingEngine} from 'aurelia-framework';
import zxcvbn from 'zxcvbn';
import {Step} from '../basewizard';
import {Logger} from '../../components/logger';

@inject(BindingEngine)
export class Credentials extends Step {
    constructor(bindingEngine, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.bindingEngine = bindingEngine;
        this.data = data;
        this.verifyInformationMessage = undefined;
        this.title = undefined;
        this.hasFocus = true;
    }

    @computedFrom('data.password', 'data.user.firstName', 'data.user.lastName', 'data.user.email')
    get passwordQuality() {
        if (!this.data.userFound) {
            const password = this.data.password === undefined ? '' : this.data.password;
            return zxcvbn(password, ['openmotics', this.data.user.firstName, this.data.user.lastName, this.data.user.email]);
        }
    }

    @computedFrom('data.password', 'data.firstName', 'data.lastName', 'data.confirmPassword', 'passwordQuality.score')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (!this.data.userFound) {
            for (let field of ['firstName', 'lastName']) {
                if (this.data.user[field] === undefined || this.data.user[field].trim().length === 0) {
                    valid = false;
                    reasons.push(this.i18n.tr(`wizards.configureuser.general.empty${field.toLowerCase()}`));
                    fields.add(field.toLowerCase());
                }
            }
            if (this.data.password.trim() !== '') {
                if (this.data.password !== this.data.confirmPassword) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureuser.credentials.invalidpassword'));
                    fields.add('password');
                }
                if (this.passwordQuality.score < 2) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureuser.credentials.insecurepassword'));
                    fields.add('password');
                }
            } 
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        try {
            let user = this.data.user;
            if (!this.data.userFound && this.data.userEdit) {
                user.password = this.data.password;
                if (this.data.new) {
                    user.tfaEnabled = false;
                    this.data.tfaEnabled = false;
                }
                await user.save(this.data.tfaEnabled, this.data.tfaToken);
            }
            let role = this.data.role;
            if (this.data.roleEdit) {
                role.roomIds = this.data.roomIds;
                role.userId = user.id;
                role.installationId = this.shared.installation.id;
                await role.save();
            }
            return [user, role];
        } catch (error) {
            if (error.cause === 'bad_request' && error.message === 'totp_invalid') {
                this.tfaError = true;
                return 'abort';
            }
            Logger.log(`Could not update User/Role configuration: ${error}`);
        }
    }

    // Aurelia
    attached() {
        this.title = this.data.userFound ? 'User found' : this.i18n.tr('wizards.configureuser.credentials.title');
        this.verifyInformationMessage = this.data.userFound ? `${this.i18n.tr('generic.infoverify')} ${this.shared.installation.name} ${this.i18n.tr('generic.installation')}` : undefined;
        super.attached();
    }
}
