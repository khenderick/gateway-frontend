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
import QRCode from 'qrcode';
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
        this.tfaError = false;
        this.tfaTokenSubscription = this.bindingEngine
            .propertyObserver(this.data, 'tfaToken')
            .subscribe(() => {
                this.tfaError = false;
            });

        this.verifyInformationMessage = undefined;
        this.title = undefined;
        this.hasFocus = true;
    }

    @computedFrom('data.user.tfaEnabled', 'data.tfaEnabled')
    get tfaEnabling() {
        return !this.data.user.tfaEnabled && this.data.tfaEnabled;
    }

    @computedFrom('data.user.tfaEnabled', 'data.tfaEnabled')
    get tfaDisabling() {
        return this.data.user.tfaEnabled && !this.data.tfaEnabled;
    }

    @computedFrom('data.password', 'data.user.firstName', 'data.user.lastName', 'data.user.email')
    get passwordQuality() {
        if (!this.data.userFound) {
            const password = this.data.password === undefined ? '' : this.data.password;
            return zxcvbn(password, ['openmotics', this.data.user.firstName, this.data.user.lastName, this.data.user.email]);
        }
    }

    @computedFrom('data.password', 'data.firstName', 'data.lastName', 'data.confirmPassword', 'passwordQuality.score', 'data.new', 'data.tfaToken', 'tfaError')
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
            } else if (this.data.new) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configureuser.credentials.passwordmandatory'));
                fields.add('password');
            }
            if (this.tfaEnabling && !/^[0-9]{6}$/.test(this.data.tfaToken)) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configureuser.credentials.tfamandatory'));
                fields.add('tfaupdate');
            } else if (this.tfaError) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configureuser.credentials.tfainvalid'));
                fields.add('tfaupdate');
            }
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        try {
            let user = this.data.user;
            if (!this.data.userFound && this.data.userEdit) {
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
        if (!this.data.new) {
            const data = `otpauth://totp/OpenMotics%20(${encodeURIComponent(this.data.user.email)})?secret=${this.data.user.tfaKey}`;
            QRCode.toDataURL(
                data,
                { errorCorrectionLevel: 'M' },
                (error, url) => {
                    if (error) {
                        Logger.error(`Could not load QR code: ${error}`);
                    }
                    document.getElementById('wizards.configureuser.credentials.qrcode').src = url;
                }
            );
        }
    }
    
    detached() {
        this.tfaTokenSubscription.dispose();
    }
}
