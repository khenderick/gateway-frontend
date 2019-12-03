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
import {Logger} from '../components/logger';
import {BaseObject} from './baseobject';

export class EventRule extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.title = '';
        this.message = '';
        this.target = undefined;
        this.triggerType = undefined;
        this.triggerId = undefined;
        this.triggerStatus = undefined;
        this.mapping = {
            id: 'id',
            title: 'title',
            message: 'message',
            target: 'target',
            triggerType: 'trigger_type',
            triggerId: 'trigger_id',
            triggerStatus: 'trigger_status',
        };
    }

    async save() {
        try {
            let result = undefined;
            if (!this.id) {
                result = await this.api.addEventRule(this.title, this.message, this.target, this.triggerType, this.triggerId, this.triggerStatus);
                this.id = result.data.id;
            } else {
                result = await this.api.updateEventRule(this.id, this.title, this.message, this.target, this.triggerType, this.triggerId, this.triggerStatus);
            }
            this.fillData(result.data);
        } catch (error) {
            Logger.error(`Could not save EventRule configuration "${this.title}": ${error.message}`)
        }
        this._skip = true;
        this._freeze = false;
    }

    async remove() {
        await this.api.removeEventRule(this.id);
    }
}
