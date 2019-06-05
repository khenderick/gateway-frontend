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
import {BaseObject} from './baseobject';
import {Toolbox} from '../components/toolbox';

export class Backup extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.description= undefined;
        this.takenBy = undefined;
        this.at = undefined;
        this.status = undefined;
        this.restores = [];
        this.user = undefined;

        this.mapping = {
            id: 'id',
            description: 'description',
            takenBy: 'taken_by',
            at: 'creation_time',
            status: 'status',
            restores: 'restores',
            user: 'user'
        };
    }
}
