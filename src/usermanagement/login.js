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
import {Refresher} from "../components/refresher";
import Shared from "../components/shared";

@inject(Authentication)
export class Login extends Base {
    constructor(authentication, ...rest) {
        super(...rest);
        this.authentication = authentication;
        this.refresher = new Refresher(async () => {
            /*
            try {
                let data = await this.api.getModules({ignoreMM: true});
                this.maintenanceMode = data === 'maintenance_mode';
                if (this.maintenanceMode) {
                    this.error = this.i18n.tr('pages.login.inmaintenancemode');
                } else {
                    this.error = undefined;
                }
            } catch (error) {
                this.maintenanceMode = false;
                this.error = undefined;
            }
             */ // @TODO: Find some call that detects maintenance mode unauthenticated
        }, 5000);
        this.username = '';
        this.password = '';
        this.failure = false;
        this.error = undefined;
        this.maintenanceMode = false;
        this.sessionTimeouts = [60 * 60, 60 * 60 * 24, 60 * 60 * 24 * 7, 60 * 60 * 24 * 30];
        this.sessionTimeout = 60 * 60;
        this.privateDevice = false;
        this.shared = Shared;
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
        try {
            await this.authentication.login(this.username, this.password, timeout)
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

    attached() {
        super.attached();
    };

    activate() {
        this.password = '';
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    };
}
