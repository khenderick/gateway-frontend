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
import {BaseObject} from "./baseobject";

export class Shutter extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.name = '';
        this.timerUp = undefined;
        this.timerDown = undefined;
        this.upDownConfig = undefined;
        this.rawGroup1 = undefined;
        this.rawGroup2 = undefined;
        this.status = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            timerUp: 'timer_up',
            timerDown: 'timer_down',
            upDownConfig: 'up_down_config',
            rawGroup1: 'group_1',
            rawGroup2: 'group_2'
        };
    }

    get inUse() {
        return this.name !== '';
    }

    get directionInverted() {
        return this.upDownConfig === 0;
    }

    set directionInverted(value) {
        this.upDownConfig = value ? 0 : 1;
    }

    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.inUse ? this.name : this.id.toString();
    }

    get directionInfo() {
        let inverted = this.upDownConfig === 0;
        return {
            up: (this.id % 4) * 2 + (inverted ? 2 : 1),
            down: (this.id % 4) * 2 + (inverted ? 1 : 2),
        };
    }

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

    save() {
        return this.api.setShutterConfiguration(
            this.id,
            this.name,
            this.timerUp,
            this.timerDown,
            this.upDownConfig,
            this.rawGroup1,
            this.rawGroup2
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    stop() {
        return this.api.doShutter(this.id, 'stop');
    }

    up() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_up';
        return this.api.doShutter(this.id, 'up')
            .then(() => {
                this.processing = false;
            })
            .catch(() => {
                this.processing = false;
            });
    }

    down() {
        this._skip = true;
        this.processing = true;
        this.status = 'going_down';
        return this.api.doShutter(this.id, 'down')
            .then(() => {
                this.processing = false;
            })
            .catch(() => {
                this.processing = false;
            });
    }

    indicate() {
        return this.api.flashLeds(3, this.id);
    }
}
