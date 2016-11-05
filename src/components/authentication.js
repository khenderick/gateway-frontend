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
import {Storage} from "./storage";

export class Authentication {
    constructor(aurelia, router, api, wizards) {
        this.aurelia = aurelia;
        this.router = router;
        this.api = api;
        this.wizards = wizards;
    }

    get isLoggedIn() {
        return this.api.token !== undefined;
    }

    logout() {
        this.api.token = undefined;
        Storage.removeItem('token');
        for (let wizardController of this.wizards) {
            wizardController.cancel();
        }
        return this.aurelia.setRoot('users')
            .then(() => {
                this.router.navigate('login');
            });
    };

    login(username, password) {
        return this.api.login(username, password, {ignore401: true})
            .then((data) => {
                this.api.token = data.token;
                Storage.setItem('token', data.token);
                return this.aurelia.setRoot('index')
                    .then(() => {
                        this.router.navigate(Storage.getItem('last') || 'dashboard');
                    });
            });
    };
}
