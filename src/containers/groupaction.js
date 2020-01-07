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
import {BaseObject} from './baseobject';
import {Logger} from '../components/logger';

export class GroupAction extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.actions = [];
        this.name = '';
        this.mapping = {
            id: 'id',
            actions: [['actions'], actions => {
                return ['', null, undefined].contains(actions) ? [] : actions.split(',').map(i => { return parseInt(i); });
            }],
            name: 'name'
        };
    }

    async trigger() {
        this.processing = true;
        try {
            await this.api.doGroupAction(this.id);
        } catch (error) {
            Logger.error(`Could not trigger GroupAction ${this.name}: ${error.message}`);
        }
        this.processing = false;
    }
}
