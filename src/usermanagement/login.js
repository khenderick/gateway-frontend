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
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";

export class Login extends Base {
    constructor() {
        super();
        this.authentication = Shared.get('authentication');
        this.i18n = Shared.get('i18n');
        this.api = Shared.get('api');
        this.refresher = new Refresher(() => {
            /*
            this.api.getModules({ignoreMM: true})
                .then((data) => {
                    this.maintenanceMode = data === 'maintenance_mode';
                    if (this.maintenanceMode) {
                        this.error = this.i18n.tr('pages.login.inmaintenancemode');
                    } else {
                        this.error = undefined;
                    }
                })
                .catch(() => {
                    this.maintenanceMode = false;
                    this.error = undefined;
                })
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
    };

    timeoutText(timeout, _this) {
        return _this.i18n.tr('pages.login.timeout.' + timeout);
    }

    login() {
        if (this.maintenanceMode) {
            return;
        }
        this.failure = false;
        this.error = undefined;
        this.authentication.login(this.username, this.password, this.sessionTimeout)
            .catch((error) => {
                if (error.message.message === 'invalid_credentials') {
                    this.error = this.i18n.tr('pages.login.invalidcredentials');
                    this.password = '';
                } else {
                    this.error = this.i18n.tr('generic.unknownerror');
                    this.password = '';
                    console.error(error);
                }
                this.failure = true;
            });
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
