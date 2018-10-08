/*
 * Copyright (C) 2018 OpenMotics BVBA
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

export class Role extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.installationId = undefined;
        this.userId = undefined;
        this.role = undefined;
        this.acl = undefined;
        this.rooms = undefined;
        this.user = undefined;

        this.mapping = {
            id: 'id',
            installationId: 'installation_id',
            userId: 'user_id',
            acl: '_acl',
            role: 'role',
            rooms: 'rooms'
        };
    }

    async save() {
        let rooms = null;
        if (this.role !== 'A') {
            if (![null, undefined].contains(this.rooms) && this.rooms.length > 0) {
                rooms = this.rooms;
            }
        }
        this.rooms = rooms;
        let result = undefined;
        if (this.id === undefined) {
            result = await this.api.addRole(this.installationId, this.userId, this.role, this.rooms);
            this.id = result.data.id
        } else {
            result = await this.api.updateRole(this.id, this.installationId, this.userId, this.role, this.rooms);
        }
        this.fillData(result.data);
        this._skip = true;
        this._freeze = false;
    }

    async remove() {
        return this.api.removeRole(this.id);
    }
}
