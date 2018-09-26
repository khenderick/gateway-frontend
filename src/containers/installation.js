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

export class Installation extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.name = undefined;
        this.role = undefined;
        this.version = undefined;
        this.uuid = undefined;
        this.alive = undefined;
        this.aliveLoading = false;

        this.mapping = {
            id: 'id',
            name: 'name',
            role: [['user_role'], userRole => {
                return userRole.role;
            }],
            version: 'version',
            uuid: 'uuid'
        };
    }

    async checkAlive(timeout) {
        try {
            this.aliveLoading = true;
            await this.api.getFeatures({
                ignoreConnection: true,
                installationId: this.id,
                timeout: timeout
            });
            this.alive = true;
        } catch (error) {
            this.alive = false;
        } finally {
            this.aliveLoading = false;
        }
    }
}