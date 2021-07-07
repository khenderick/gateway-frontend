/*
 * Copyright (C) 2021 OpenMotics BV
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
import {computedFrom} from 'aurelia-framework';
import {BaseObject} from '../baseobject';
import {Logger} from '../../components/logger';
import {NOT_IN_USE} from 'resources/constants';

export class Shutter extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = '';
        this.status = undefined;
        this.locked = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            status: 'status.state',
            locked: 'status.locked',
            room: 'location.room_id'
        };
    }

    @computedFrom('name')
    get inUse() {
        return this.name !== NOT_IN_USE;
    }

    async stop() {
        return this.api.stopShutter({id: this.id});
    }

    async up() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_up';
        try {
            await this.api.changeShutterDirection({id: this.id, direction: 'UP'});
        } catch (error) {
            Logger.error(`Failed to raise Shutter ${this.name}: ${error.message}`);
        }
        this.processing = false;
    }

    async down() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_down';
        try {
            await this.api.changeShutterDirection({id: this.id, direction: 'DOWN'});
        } catch (error) {
            Logger.error(`Failed to lower Shutter ${this.name}: ${error.message}`);
        }
        this.processing = false;
    }
}
