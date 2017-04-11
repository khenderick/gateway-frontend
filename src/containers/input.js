/*
 * Copyright (C) 2016 OpenMotics BVBA
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

export class Input extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.can = undefined;
        this.action = undefined;
        this.basicActions = [];
        this.moduleType = undefined;
        this.name = undefined;
        this.recent = false;
        this.pulseCounter = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            action: 'action',
            basicActions: 'basic_actions',
            moduleType: 'module_type',
            name: 'name',
            can: 'can',
            room: 'room'
        };
    }

    get isVirtual() {
        return this.moduleType === this.moduleType.toLowerCase();
    }

    get isCan() {
        return this.can === 'C';
    }

    get type() {
        if (this.action < 240) {
            return 'linked';
        }
        if (this.action === 240) {
            // TODO: Add some dynamic types (e.g. a set of following toggles)
            return 'advanced';
        }
        if (this.action === 241) {
            return 'outputsoff';
        }
        if (this.action === 242) {
            return 'lightsoff'
        }
        if (this.action === 255) {
            if (this.pulseCounter !== undefined) {
                return 'pulse';
            }
            return 'inactive';
        }
        return undefined;
    }

    get inUse() {
        return this.name !== '' && this.name !== 'NOT_IN_USE' && this.type !== 'inactive';
    }

    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.name !== '' && this.name !== 'NOT_IN_USE' ? this.name : this.id.toString();
    }

    save() {
        return this.api.setInputConfiguration(
            this.id,
            this.action,
            this.basicActions.join(','),
            this.name,
            this.room
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    indicate() {
        return this.api.flashLeds(1, this.id);
    }
}
