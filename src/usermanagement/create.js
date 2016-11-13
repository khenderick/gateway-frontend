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

export class Create extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadUsers().then(() => {
                this.authorized = true;
                this.signaler.signal('reload-users');
            }).catch(() => {
                this.users = [];
                this.authorized = false;
            });
        }, 1000);

        this.username = '';
        this.password = '';
        this.password2 = '';
        this.users = [];
        this.authorized = true;
        this.removing = undefined;
    };

    get noMatch() {
        return this.password !== this.password2;
    }

    loadUsers() {
        return this.api.getUsernames()
            .then((data) => {
                this.users = data.usernames;
            })
    }

    create() {
        if (this.noMatch || !this.authorized) {
            return;
        }
        this.api.createUser(this.username, this.password)
            .then(() => {
                this.users.push(this.username);
                this.failure = false;
                this.username = '';
                this.password = '';
                this.password2 = '';
            })
            .catch(() => {
                this.failure = true;
                this.password = '';
                this.password2 = '';
            });
    }

    startRemoval(username) {
        this.removing = username;
    }

    stopRemoval(username) {
        this.removing = undefined;
    }

    remove(username) {
        if (this.removing !== username) {
            return;
        }
        this.api.removeUser(username)
            .then(() => {
                this.removing = undefined;
            })
            .catch(() => {
                this.removing = undefined;
            });
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
