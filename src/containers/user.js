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
import {BaseObject} from "./baseobject";

export class User extends BaseObject {
    constructor(...rest /*, username */) {
        let username = rest.pop();
        super(...rest);
        this.username = username;
        this.key = 'username';
        this.email = undefined;
        this.firstName = undefined;
        this.lastName = undefined;

        this.mapping = {
            username: 'username',
            email: 'email_address',
            firstName: 'first_name',
            lastName: 'last_name'
        };
    }

    get fullName() {
        if (![undefined, ''].contains(this.firstName) && ![undefined, ''].contains(this.lastName)) {
            return `${this.firstName} ${this.lastName}`;
        }
        return ![undefined, ''].contains(this.firstName) ? this.firstName : this.lastName;
    }
}
