/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {computedFrom} from "aurelia-framework";
import {BaseObject} from "./baseobject";
import {Toolbox} from "../components/toolbox";

export class User extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.username = undefined;
        this.email = undefined;
        this.firstName = undefined;
        this.lastName = undefined;
        this.role = undefined;
        this.acl = undefined;
        this.tfaEnabled = undefined;
        this.tfaKey = undefined;
        this.password = undefined;
        this.role = undefined;

        this.mapping = {
            id: 'id',
            username: 'username',
            email: 'email',
            firstName: 'first_name',
            lastName: 'last_name',
            acl: '_acl',
            tfaEnabled: [['tfa'], tfa => {
                return tfa.enabled;
            }],
            tfaKey: [['tfa'], tfa => {
                return tfa['encoded_key'];
            }]
        };
    }

    @computedFrom('firstName', 'lastName')
    get fullName() {
        return Toolbox.combine(' ', this.firstName, this.lastName);
    }

    async save(enableTFA, tfaToken) {
        let result = undefined;
        if (this.id === undefined) {
            result = await this.api.addUser(this.firstName, this.lastName, this.email, this.password);
            this.id = result.data.id;
        } else {
            result = await this.api.updateUser(this.id, this.firstName, this.lastName, this.email, this.password);
        }
        this.fillData(result.data);
        if (enableTFA !== this.tfaEnabled && tfaToken !== undefined) {
            await this.api.updateTFA(this.id, enableTFA, tfaToken);
            this.tfaEnabled = enableTFA
        }
        this.password = undefined;
        this._skip = true;
        this._freeze = false;
    }
}
