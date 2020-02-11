/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Base} from '../resources/base';
import {Refresher} from '../components/refresher';
import {computedFrom} from 'aurelia-framework';
import {Logger} from '../components/logger';

export class Create extends Base {
    constructor(...rest) {
        super(...rest);
        this.guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        this.refresher = new Refresher(async () => {
            try {
                await this.loadUsers();
                this.authorized = true;
                this.signaler.signal('reload-users');
            } catch (error) {
                this.users = [];
                this.authorized = false;
            }
        }, 1000);

        this.username = '';
        this.password = '';
        this.password2 = '';
        this.users = [];
        this.authorized = true;
        this.removeRequest = undefined;
    }

    @computedFrom('password', 'password2')
    get noMatch() {
        return this.password !== this.password2;
    }

    @computedFrom('users')
    get filteredUsers() {
        let users = [];
        for (let user of this.users) {
            if (user !== '' && !user.match(this.guidRegex)) {
                users.push(user);
            }
        }
        return users;
    }

    async loadUsers() {
        let data = await this.api.getUsernames();
        this.users = data.usernames;
    }

    async create() {
        if (this.noMatch || !this.authorized) {
            return;
        }
        try {
            await this.api.createUser(this.username.trim(), this.password.trim());
            this.users.push(this.username.trim());
            this.failure = false;
            this.username = '';
        } catch (error) {
            Logger.error(`Failed to create user ${this.username.trim()}: ${error.message}`);
            this.failure = true;
        }
        this.password = '';
        this.password2 = '';
    }

    startRemoval(username) {
        this.removeRequest = username;
    }

    stopRemoval() {
        this.removeRequest = undefined;
    }

    async remove(username) {
        if (this.removeRequest !== username) {
            return;
        }
        try {
            await this.api.removeUser(username);
            this.users.splice(this.users.indexOf(username), 1);
        } catch (error) {
            Logger.error(`Failed to remote user ${username}: ${error.message}`)
        }
        this.removeRequest = undefined;
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
