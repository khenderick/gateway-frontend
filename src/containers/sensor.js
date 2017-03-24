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

export class Sensor extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = undefined;
        this.offset = undefined;
        this.rawTemperature = undefined;
        this.rawHumidity = undefined;
        this.rawBrightness = undefined;
        this.previousTemperature = undefined;
        this.previousHumidity = undefined;
        this.previousBrightness = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            offset: 'offset',
            room: 'room'
        };
    }

    get inUse() {
        return this.name !== '' && this.name !== 'NOT_IN_USE'
    }

    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.inUse ? this.name : this.id.toString();
    }

    get temperature() {
        return this.rawTemperature;
    }

    set temperature(temperature) {
        this.previousTemperature = this.rawTemperature;
        if (temperature === null) {
            temperature = undefined;
        }
        this.rawTemperature = temperature;
    }

    get temperatureDirection() {
        if (this.previousTemperature === undefined || this.rawTemperature === this.previousTemperature) {
            return undefined;
        }
        return this.rawTemperature > this.previousTemperature;
    }

    get humidity() {
        return this.rawHumidity;
    }

    set humidity(humidity) {
        this.previousHumidity = this.rawHumidity;
        if (humidity === null) {
            humidity = undefined;
        }
        this.rawHumidity = humidity;
    }

    get humidityDirection() {
        if (this.previousHumidity === undefined || this.rawHumidity === this.previousHumidity) {
            return undefined;
        }
        return this.rawHumidity > this.previousHumidity;
    }

    get brightness() {
        return this.rawBrightness;
    }

    set brightness(brightness) {
        this.previousBrightness = this.rawBrightness;
        if (brightness === null) {
            brightness = undefined;
        }
        this.rawBrightness = brightness;
    }

    get brightnessDirection() {
        if (this.previousBrightness === undefined || this.rawBrightness === this.previousBrightness) {
            return undefined;
        }
        return this.rawBrightness > this.previousBrightness;
    }

    save() {
        return this.api.setSensorConfiguration(
            this.id,
            this.name,
            this.offset,
            this.room
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    indicate() {
        return this.api.flashLeds(2, this.id);
    }
}
