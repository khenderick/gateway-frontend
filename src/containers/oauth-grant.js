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
import {BaseObject} from "./baseobject";
import moment from "moment";
import {Toolbox} from "../components/toolbox";

export class OAuthGrant extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.name = undefined;
        this.created = undefined;
        this.accessed = undefined;
        this.owner = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            created: [['created'], (created) => {
                return moment.unix(created);
            }],
            accessed: [['accessed'], (accessed) => {
                return moment.unix(accessed);
            }],
            owner: [['owner'], (owner) => {
                let fullName = Toolbox.combine(' ', owner['first_name'], owner['last_name']);
                if (fullName.length > 0) {
                    return `${fullName} (${owner['email']})`;
                }
                return owner['email'];
            }]
        };

        this.ea.subscribe('i18n:locale:changed', (locales) => {
            if (this.created !== undefined) {
                this.created.locale(locales.newValue);
            }
            if (this.accessed !== undefined) {
                this.accessed.locale(locales.newValue);
            }
        });
    }

    async revoke() {
        return this.api.revokeOAuth2ApplicationGrant(this.id);
    }
}
