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
import {inject, Aurelia} from "aurelia-framework";
import {Router} from "aurelia-router";
import {API} from "./api";
import Shared from "./shared";
import {Storage} from "./storage";

@inject(Aurelia, Router, API)
export class Authentication {
    constructor(aurelia, router, api) {
        this.aurelia = aurelia;
        this.router = router;
        this.api = api;
        this.wizards = Shared.wizards;
    }

    get isLoggedIn() {
        return this.api.token !== undefined;
    }

    async autoLogin() {
        let login = Storage.getItem('login');
        if (login === 'permanent' && navigator.credentials) {
            try {
                let credentials = await navigator.credentials.get({
                    password: true,
                    mediation: 'silent'
                });
                if (credentials !== undefined && credentials.type === 'password' && credentials.id && credentials.password) {
                    console.info('Automatic signing in...');
                    await this.login(credentials.id, credentials.password, 60 * 60 * 24 * 30, true);
                    return true;
                }
            } catch (error) {
                console.log(`Error during automatic signing in: ${error}`);
            }
        }
        return false
    }

    async logout() {
        this.api.token = undefined;
        Storage.removeItem('login');
        Storage.removeItem('token');
        for (let wizardController of this.wizards) {
            wizardController.cancel();
        }
        await this.aurelia.setRoot('users', document.body);
        return this.router.navigate('login');
    };

    async login(username, password, timeout, storeCredentials=false) {
        let data = await this.api.login(username, password, timeout, {ignore401: true});
        console.info('Logged in');
        this.api.token = data.token;
        if (storeCredentials && navigator.credentials) {
            let credentials = new PasswordCredential({id: username, password: password});
            await navigator.credentials.store(credentials);
            console.info('Stored credentials in browser');
            Storage.setItem('login', 'permanent');
        } else {
            Storage.removeItem('login');
        }
        Storage.setItem('token', data.token);
        await this.aurelia.setRoot('index', document.body);
        return this.router.navigate(Storage.getItem('last') || 'dashboard');
    };
}
