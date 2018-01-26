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
import {inject, computedFrom} from "aurelia-framework";
import {Authentication} from "../components/authentication";
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Storage} from '../components/storage';

@inject(Authentication)
export class Login extends Base {
    constructor(authentication, ...rest) {
        super(...rest);
        this.authentication = authentication;
        this.username = '';
        this.password = '';
        this.totp = '';
        this.failure = false;
        this.error = undefined;
        this.maintenanceMode = false;
        this.sessionTimeouts = [60 * 60, 60 * 60 * 24, 60 * 60 * 24 * 7, 60 * 60 * 24 * 30];
        if (navigator.credentials && (Shared.target === 'cloud' || Storage.getItem('authentication_credentials', false))) {
            this.sessionTimeouts.push('permanent');
        }
        this.noPermanent = false;
        this.needsTotp = false;
        this.sessionTimeout = 60 * 60;
        this.privateDevice = false;
        this.shared = Shared;
        this.autoLogin = true;
        this.loading = false;
    };

    timeoutText(timeout, _this) {
        return _this.i18n.tr(`pages.login.timeout.${timeout}`);
    }

    @computedFrom('username', 'password', 'needsTotp', 'totp')
    get canLogin() {
        return this.username !== '' && this.password !== '' && (!this.needsTotp || this.totp !== '');
    }

    async login() {
        if (this.maintenanceMode) {
            return;
        }
        this.loading = true;
        this.noPermanent = false;
        this.failure = false;
        this.error = undefined;
        let timeout = this.privateDevice ? this.sessionTimeout : 60 * 60;
        let permanent = timeout === 'permanent';
        let extraParameters = {
            timeout: permanent ? 60 * 60 * 24 * 30 : timeout
        };
        if (this.needsTotp) {
            extraParameters.totp = this.totp;
        }
        try {
            let result = await this.authentication.login(this.username, this.password, extraParameters, permanent);
            if (result !== undefined && result['next_step'] === 'totp_required') {
                this.needsTotp = true;
                if (permanent) {
                    this.noPermanent = true;
                    this.sessionTimeout = this.sessionTimeouts[this.sessionTimeouts.length - 1];
                }
            }
        } catch (error) {
            if (error.message === 'invalid_credentials') {
                this.error = this.i18n.tr('pages.login.invalidcredentials');
            } else if (error.message === 'totp_invalid') {
                this.error = this.i18n.tr('pages.login.invalidtotp');
            } else {
                this.error = this.i18n.tr('generic.unknownerror');
            }
            this.needsTotp = false;
            this.password = '';
            this.totp = '';
            this.failure = true;
        }
        this.loading = false;
    };

    async attached() {
        await super.attached();
        this.password = '';
        this.autoLogin = await this.authentication.autoLogin();
    };
}
