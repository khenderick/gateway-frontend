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
import {Led} from '../../containers/led';
import {BaseObject} from '../baseobject';
import {Logger} from '../../components/logger';
import Shared from '../../components/shared';
import {NOT_IN_USE, ZERO_TIMER} from 'resources/constants';

export class Output extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = '';
        this.outputType = undefined;
        this.capabilities = [];
        this.locked = undefined;
        this.dimmer = undefined;
        this.status = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            outputType: [['type'], value => value.toLowerCase()],
            capabilities: 'capabilities',
            locked: 'status.locked',
            dimmer: 'status.value',
            status: 'status.on',
            room: 'location.room_id',
        };
    }

    @computedFrom('outputType')
    get isLight() {
        return this.outputType === 'light';
    }

    @computedFrom('outputType')
    get isBrainShutter() {
        return this.outputType === 'shutter';
    }

    @computedFrom('moduleType')
    get isDimmer() {
        return this.capabilities.contains('RANGE');
    }

    @computedFrom('name')
    get inUse() {
        return this.name !== NOT_IN_USE;
    }

    @computedFrom('status')
    get isOn() {
        return this.status === true;
    }

    @computedFrom('status')
    set isOn(value) {
        this.status = value === true;
    }

    @computedFrom('id', 'inUse', 'name')
    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.name !== '' ? this.name : this.id.toString();
    }

    async set() {
        let dimmer, timer;
        if (this.isOn === true) {
            dimmer = this.dimmer;
            timer = this.timer;
            if (![150, 450, 900, 1500, 2220, 3120].contains(timer)) {
                timer = undefined;
            }
            try {
                await this.api.changeOutputValue({id: this.id, value: dimmer});
            } catch (error) {
                Logger.error(`Could not set Output ${this.name}: ${error.message}`);
            }
        } else {
            try {
                await this.api.turnOffOutput({id: this.id});
            } catch (error) {
                Logger.error(`Could not set Output ${this.name}: ${error.message}`);
            }
        }
        this._freeze = false;
        this.processing = false;
    }

    async toggle(on) {
        this._freeze = true;
        this.processing = true;
        if (on === undefined) {
            this.isOn = !this.isOn;
        } else {
            this.isOn = !!on;
        }
        return this.set();
    }

    async onToggle(event) {
        return this.toggle(event.detail.value);
    }

    async dim(value) {
        this._freeze = true;
        this.processing = true;
        if (this.isDimmer) {
            if (value > 0) {
                this.isOn = true;
                this.dimmer = value;
            } else {
                this.isOn = false;
                this.dimmer = 0;
            }
            return this.set();
        }
        this._freeze = false;
        this.processing = false;
        throw new Error('A non-dimmer output can not be dimmed');
    }

    async onDim(event) {
        return this.dim(event.detail.value);
    }

    async indicate() {
        return this.api.flashLeds(0, this.id);
    }
}
