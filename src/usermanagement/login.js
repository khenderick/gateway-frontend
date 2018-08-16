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
import {Refresher} from "../components/refresher";
import {Storage} from '../components/storage';
import {Toolbox} from '../components/toolbox';

@inject(Authentication)
export class Login extends Base {
    constructor(authentication, ...rest) {
        super(...rest);
        this.authentication = authentication;
        this.username = '';
        this.password = '';
        this.time = 0;
        this.refresher = new Refresher(async () => {
            this.time = Toolbox.getTimestamp();
        }, 1000);
        this.failure = false;
        this.error = undefined;
        this.maintenanceMode = false;
        this.sessionTimeouts = [60 * 60, 60 * 60 * 24, 60 * 60 * 24 * 7, 60 * 60 * 24 * 30];
        if (navigator.credentials && (this.shared.target === 'cloud' || Storage.getItem('authentication_credentials', false))) {
            this.sessionTimeouts.push('permanent');
        }
        this.noPermanent = false;
        this.totp = '';
        this.needsTotp = false;
        this.askTotp = false;
        this.acceptTerms = false;
        this.needsAcceptedTerms = false;
        this.askAcceptTerms = false;
        this.sessionTimeout = 60 * 60;
        this.privateDevice = false;
        this.autoLogin = true;
        this.loading = false;
    };

    timeoutText(timeout) {
        return this.i18n.tr(`pages.login.timeout.${timeout}`);
    }

    @computedFrom('username', 'password', 'needsTotp', 'totp', 'needsAcceptedTerms', 'acceptTerms', 'time')
    get canLogin() {
        return this.username !== '' && this.password !== '' && (!this.needsTotp || this.totp !== '') && (!this.needsAcceptedTerms || this.acceptTerms);
    }

    async login() {
        if (!this.canLogin) {
            return;
        }
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
        if (this.needsAcceptedTerms) {
            extraParameters.acceptTerms = this.acceptTerms;
        }
        try {
            let result = await this.authentication.login(this.username, this.password, extraParameters, permanent);
            if (result !== undefined) {
                if (result['next_step'] === 'totp_required') {
                    this.needsTotp = true;
                    this.askTotp = true;
                    this.askAcceptTerms = false;
                    if (permanent) {
                        this.noPermanent = true;
                        this.sessionTimeout = this.sessionTimeouts[this.sessionTimeouts.length - 1];
                    }
                } else if (result['next_step'] === 'accept_terms') {
                    this.needsAcceptedTerms = true;
                    this.askTotp = false;
                    this.askAcceptTerms = true;
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
            this.totp = '';
            this.askTotp = false;
            this.needsAcceptedTerms = false;
            this.acceptTerms = false;
            this.askAcceptTerms = false;
            this.password = '';
            this.failure = true;
        }
        this.loading = false;
    };

    async attached() {
        await super.attached();
        this.password = '';
        this.autoLogin = await this.authentication.autoLogin();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
