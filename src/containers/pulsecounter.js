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
import {computedFrom} from 'aurelia-framework';
import {BaseObject} from './baseobject';

export class PulseCounter extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = undefined;
        this.input = undefined;
        this.persistent = undefined;
        this.room = undefined;
        this.roomName = undefined;

        this.mapping = {
            id: 'id',
            input: 'input',
            name: 'name',
            persistent: 'persistent',
            room: 'room'
        };
    }

    async save() {
        try {
            await this.api.setPulseCounterConfiguration(
                this.id,
                this.input,
                this.name,
                this.room,
                this.persistent,
            );
        } catch (error) {
            Logger.error(`Could not save Sensor configuration ${this.name}: ${error.message}`)
        }
        this._skip = true;
        this._freeze = false;
    }

    @computedFrom('id', 'name')
    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.name !== '' ? `${this.name} (${this.id})` : this.id.toString();
    }
}
