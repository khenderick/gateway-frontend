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
import {computedFrom, inject, BindingEngine} from "aurelia-framework";
import zxcvbn from "zxcvbn";
import {Base} from "../resources/base";
import {Toolbox} from '../components/toolbox';

@inject(BindingEngine)
export class Register extends Base {
    constructor(bindingEngine, ...rest) {
        super(...rest);

        this.bindingEngine = bindingEngine;
        this.guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
        this.registrationKey = '';
        this.userExists = false;
        this.invalidRegistrationKey = false;
        this.error = '';
        this.emailSubscription = this.bindingEngine
            .propertyObserver(this, 'email')
            .subscribe(() => {
                this.userExists = false;
            });
        this.registrationKeySubscription = this.bindingEngine
            .propertyObserver(this, 'registrationKey')
            .subscribe(() => {
                this.invalidRegistrationKey = false;
            });
    }

    @computedFrom('password', 'confirmPassword', 'passwordQuality', 'firstName', 'lastName', 'email', 'registrationKey', 'userExists', 'invalidRegistrationKey')
    get canProceed() {
        let valid = true, fields = new Set();
        if (this.password !== '') {
            if (this.password !== this.confirmPassword) {
                valid = false;
                fields.add('password');
            }
            if (this.passwordQuality.score < 2) {
                valid = false;
                fields.add('password');
            }
        } else {
            valid = false;
            fields.add('incomplete');
        }
        if (this.firstName.trim() === '' || this.lastName.trim() === '') {
            valid = false;
            fields.add('incomplete');
        }
        if (this.email !== '') {
            if (!Toolbox.validEmail(this.email)) {
                valid = false;
                fields.add('email');
            }
        } else {
            valid = false;
            fields.add('incomplete');
        }
        if (this.registrationKey !== '') {
            if (!this.guidRegex.test(this.registrationKey)) {
                valid = false;
                fields.add('registrationkey');
            }
        } else {
            valid = false;
            fields.add('incomplete');
        }
        valid = valid && !this.userExists && !this.invalidRegistrationKey;
        return {valid: valid, fields: fields};
    }

    @computedFrom('password', 'firstName', 'lastName', 'email')
    get passwordQuality() {
        return zxcvbn(this.password, ['openmotics', this.firstName, this.lastName, this.email]);
    }

    async register() {
        if (!this.canProceed.valid) {
            return;
        }
        this.error = '';
        try {
            await this.api.register(this.firstName, this.lastName, this.email, this.password, this.registrationKey);
            this.shared.autoLogin = [this.email, this.password];
            this.router.navigate('login');
        } catch (error) {
            if (error.cause === 'bad_request' && error.message === 'user_exists') {
                this.userExists = true;
            } else if (error.cause === 'bad_request' && error.message === 'invalid_registration_key') {
                this.invalidRegistrationKey = true;
            } else {
                this.error = this.i18n.tr('generic.unknownerror');
                Toolbox.consoleLogIfDev(`Could not register User: ${error}`);
            }
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    detached() {
        this.emailSubscription.dispose();
        this.registrationKeySubscription.dispose();
    }
}
