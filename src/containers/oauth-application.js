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

export class OAuthApplication extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.name = undefined;
        this.userId = undefined;
        this.clientId = undefined;
        this.clientSecret = undefined;
        this.grantType = undefined;
        this.clientType = undefined;
        this.redirectUris = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            userId: 'user_id',
            clientId: 'client_id',
            clientSecret: 'client_secret',
            clientType: 'client_type',
            grantType: 'authorization_grant_type',
            redirectUris: 'redirect_uris'
        };
    }

    async save() {
        if (this.id !== undefined) {
            return;
        }
        let data = await this.api.addOAuth2Application(this.name, this.userId, this.grantType, this.clientType, this.redirectUris);
        this._freeze = false;
        this.id = data.data.id;
        this.fillData(data.data);
    }
}
