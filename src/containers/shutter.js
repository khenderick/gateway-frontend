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
import {computedFrom} from "aurelia-framework";
import {BaseObject} from "./baseobject";

export class Shutter extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = '';
        this.timerUp = undefined;
        this.timerDown = undefined;
        this.upDownConfig = undefined;
        this.rawGroup1 = undefined;
        this.rawGroup2 = undefined;
        this.status = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            timerUp: 'timer_up',
            timerDown: 'timer_down',
            upDownConfig: 'up_down_config',
            rawGroup1: 'group_1',
            rawGroup2: 'group_2',
            room: 'room'
        };
    }

    @computedFrom('name')
    get inUse() {
        return this.name !== '';
    }
    @computedFrom('upDownConfig')
    get directionInverted() {
        return this.upDownConfig === 0;
    }

    set directionInverted(value) {
        this.upDownConfig = value ? 0 : 1;
    }

    @computedFrom('id', 'inUser', 'name')
    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.inUse ? this.name : this.id.toString();
    }
    @computedFrom('upDownConfig', 'id')
    get directionInfo() {
        let inverted = this.upDownConfig === 0;
        return {
            up: (this.id % 4) * 2 + (inverted ? 2 : 1),
            down: (this.id % 4) * 2 + (inverted ? 1 : 2),
        };
    }
    @computedFrom('rawGroup1')
    get group1() {
        return this.rawGroup1 >= 0 && this.rawGroup1 <= 30 ? this.rawGroup1 : undefined;
    }

    set group1(value) {
        if (value !== undefined) {
            value = parseInt(value);
            if (value >= 0 && value <= 30) {
                this.rawGroup1 = value;
                return;
            }
        }
        this.rawGroup1 = 255;
    }
    @computedFrom('rawGroup2')
    get group2() {
        return this.rawGroup2 >= 0 && this.rawGroup2 <= 30 ? this.rawGroup2 : undefined;
    }

    set group2(value) {
        if (value !== undefined) {
            value = parseInt(value);
            if (value >= 0 && value <= 30) {
                this.rawGroup2 = value;
                return;
            }
        }
        this.rawGroup2 = 255;
    }

    async save() {
        try {
            await this.api.setShutterConfiguration(
                this.id,
                this.name,
                this.timerUp,
                this.timerDown,
                this.upDownConfig,
                this.rawGroup1,
                this.rawGroup2,
                this.room
            );
        } catch (error) {
            console.error(`Could not save Shutter configuration ${this.name}: ${error.message}`);
        }
        this._skip = true;
        this._freeze = false;
    }

    async stop() {
        return this.api.doShutter(this.id, 'stop');
    }

    async up() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_up';
        try {
            await this.api.doShutter(this.id, 'up');
        } catch (error) {
            console.error(`Failed to raise Shutter ${this.name}: ${error.message}`);
        }
        this.processing = false;
    }

    async down() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_down';
        try {
            await this.api.doShutter(this.id, 'down');
        } catch (error) {
            console.error(`Failed to lower Shutter ${this.name}: ${error.message}`);
        }
        this.processing = false;
    }

    async indicate() {
        return this.api.flashLeds(3, this.id);
    }
}
