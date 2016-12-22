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
import Shared from "../components/shared";
import {Led} from "../containers/led";
import {BaseObject} from "./baseobject";

export class Output extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.floor = undefined;
        this.moduleType = undefined;
        this.name = '';
        this.type = undefined;
        this.timer = undefined;
        this.dimmer = undefined;
        this.status = undefined;
        this.led1 = undefined;
        this.led2 = undefined;
        this.led3 = undefined;
        this.led4 = undefined;

        this.mapping = {
            id: 'id',
            floor: 'floor',
            moduleType: 'module_type',
            name: 'name',
            type: 'type',
            timer: 'timer',
            dimmer: 'dimmer',
            status: 'status',
            led1: [['can_led_1_function', 'can_led_1_id'], (enumerator, id) => {
                return new Led(id, enumerator);
            }],
            led2: [['can_led_2_function', 'can_led_2_id'], (enumerator, id) => {
                return new Led(id, enumerator);
            }],
            led3: [['can_led_3_function', 'can_led_3_id'], (enumerator, id) => {
                return new Led(id, enumerator);
            }],
            led4: [['can_led_4_function', 'can_led_4_id'], (enumerator, id) => {
                return new Led(id, enumerator);
            }]
        };
    }

    get isLight() {
        return this.type === 255;
    }

    set isLight(value) {
        this.type = value ? 255 : 0;
    }

    get isVirtual() {
        return this.moduleType === this.moduleType.toLowerCase();
    }

    get isDimmer() {
        return this.moduleType.toUpperCase() === 'D';
    }

    get inUse() {
        return this.name !== '' && this.name !== 'NOT_IN_USE';
    }

    get isOn() {
        return this.status !== 0;
    }

    set isOn(value) {
        this.status = (value ? 1 : 0);
    }

    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.inUse ? this.name : this.id.toString();
    }

    save() {
        return this.api.setOutputConfiguration(
            this.id,
            this.floor,
            this.name,
            this.timer,
            this.type,
            [
                [this.led1.id, this.led1.enumerator],
                [this.led2.id, this.led2.enumerator],
                [this.led3.id, this.led3.enumerator],
                [this.led4.id, this.led4.enumerator],
            ]
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    set() {
        let dimmer, timer;
        if (this.isOn === true) {
            dimmer = this.dimmer;
            timer = this.timer;
            if ([150, 450, 900, 1500, 2220, 3120].indexOf(timer) === -1) {
                timer = undefined;
            }
        }
        this._skip = true;
        this.api.setOutput(this.id, this.isOn, dimmer, timer)
            .then(() => {
                this._freeze = false;
                this.processing = false;
            })
            .catch(() => {
                this._freeze = false;
                this.processing = false;
                console.error('Could not set Output ' + this.name);
            });
    }

    toggle(on) {
        this._freeze = true;
        this.processing = true;
        if (on === undefined) {
            this.isOn = !this.isOn;
        } else {
            this.isOn = !!on;
        }
        this.set();
    }

    onToggle(event) {
        this.toggle(event.detail.value);
    }

    dim(value) {
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
            this.set();
        } else {
            this._freeze = false;
            this.processing = false;
            throw new Error('A non-dimmer output can not be dimmed');
        }
    }

    onDim(event) {
        this.dim(event.detail.value);
    }

    indicate() {
        return this.api.flashLeds(0, this.id);
    }
}
