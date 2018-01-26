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
import {computedFrom} from "aurelia-framework";
import {BaseObject} from "./baseobject";

class Input extends BaseObject {
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
        this.invert = false;

        this.mapping = {
            id: 'id',
            action: 'action',
            basicActions: [['basic_actions'], basicActions => {
                return ['', null, undefined].contains(basicActions) ? [] : basicActions.split(',').map(i => { return parseInt(i); });
            }],
            moduleType: 'module_type',
            name: 'name',
            can: 'can',
            room: 'room',
            invert: 'invert'
        };
    }

    get isVirtual() {
        return this.moduleType === this.moduleType.toLowerCase();
    }

    get isCan() {
        return this.can === 'C';
    }

    @computedFrom('action', 'basicactions', 'pulseCounter')
    get type() {
        if (this.action < 240) {
            return 'linked';
        }
        if (this.action === 240) {
            if (this.basicActions.length === 2 && this.basicActions[0] >= 195 && this.basicActions[0] <= 200) {
                return 'motionsensor';
            }
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

    @computedFrom('id', 'name')
    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.name !== '' && this.name !== 'NOT_IN_USE' ? this.name : this.id.toString();
    }

    async save() {
        try {
            await this.api.setInputConfiguration(
                this.id,
                this.moduleType,
                this.action,
                this.basicActions.join(','),
                this.name,
                this.invert,
                this.can,
                this.room
            );
        } catch (error) {
            console.error(`Could not set Input configuration ${this.name}: ${error.message}`);
        }
        this._skip = true;
        this._freeze = false;
    }

    async indicate() {
        return this.api.flashLeds(1, this.id);
    }

    async press() {
        if (this.isVirtual) {
            try {
                await this.api.doBasicAction(68, this.id);
            } catch (error) {
                console.error(`Could not press VirtalInput ${this.name}: ${error.message}`);
            }
            try {
                await this.api.doBasicAction(69, this.id);
            } catch (error) {
                console.error(`Could not release VirtualInput ${this.name}: ${error.message}`);
            }
        }
    }
}
const times = new Map([[0, '2m 30s'], [1, '7m 30s'], [2, '15m'], [3, '25m'], [4, '37m'], [5, '52m']]);

export {Input, times};