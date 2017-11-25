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
import {inject} from "aurelia-framework";
import {Authentication} from "../components/authentication";
import {Base} from "../resources/base";
import Shared from "../components/shared";

@inject(Authentication)
export class Login extends Base {
    constructor(authentication, ...rest) {
        super(...rest);
        this.authentication = authentication;
        this.username = '';
        this.password = '';
        this.failure = false;
        this.error = undefined;
        this.maintenanceMode = false;
        this.sessionTimeouts = [60 * 60, 60 * 60 * 24, 60 * 60 * 24 * 7, 60 * 60 * 24 * 30];
        if (navigator.credentials) {
            this.sessionTimeouts.push('permanent');
        }
        this.sessionTimeout = 60 * 60;
        this.privateDevice = false;
        this.shared = Shared;
        this.autoLogin = true;
    };

    timeoutText(timeout, _this) {
        return _this.i18n.tr(`pages.login.timeout.${timeout}`);
    }

    async login() {
        if (this.maintenanceMode) {
            return;
        }
        this.failure = false;
        this.error = undefined;
        let timeout = this.privateDevice ? this.sessionTimeout : 60 * 60;
        let permanent = timeout === 'permanent';
        try {
            await this.authentication.login(this.username, this.password, permanent ? 60 * 60 * 24 * 30 : timeout, permanent);
        } catch (error) {
            if (error.message === 'invalid_credentials') {
                this.error = this.i18n.tr('pages.login.invalidcredentials');
            } else {
                this.error = this.i18n.tr('generic.unknownerror');
            }
            this.password = '';
            this.failure = true;
        }
    };

    async attached() {
        await super.attached();
        this.password = '';
        this.autoLogin = await this.authentication.autoLogin();
    };
}
