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
import {Logger} from "../components/logger";

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

    @computedFrom('name')
    get inUse() {
        return this.name !== '' && this.name !== 'NOT_IN_USE'
    }

    @computedFrom('id', 'inUse', 'name')
    get identifier() {
        if (this.id === undefined) {
            return '';
        }
        return this.inUse ? this.name : this.id.toString();
    }

    @computedFrom('rawTemperature')
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

    @computedFrom('previousTemperature', 'rawTemperature')
    get temperatureDirection() {
        if (this.previousTemperature === undefined || this.rawTemperature === this.previousTemperature) {
            return undefined;
        }
        return this.rawTemperature > this.previousTemperature;
    }

    @computedFrom('rawHumidity')
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

    @computedFrom('previousHumidity', 'rawHumidity')
    get humidityDirection() {
        if (this.previousHumidity === undefined || this.rawHumidity === this.previousHumidity) {
            return undefined;
        }
        return this.rawHumidity > this.previousHumidity;
    }
    @computedFrom('rawBrightness')
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

    @computedFrom('previousBrightness', 'rawBrightness')
    get brightnessDirection() {
        if (this.previousBrightness === undefined || this.rawBrightness === this.previousBrightness) {
            return undefined;
        }
        return this.rawBrightness > this.previousBrightness;
    }

    async save() {
        try {
            await this.api.setSensorConfiguration(
                this.id,
                this.name,
                this.offset,
                this.room
            );
        } catch (error) {
            Logger.error(`Could not save Sensor configuration ${this.name}: ${error.message}`)
        }
        this._skip = true;
        this._freeze = false;
    }

    async indicate() {
        return this.api.flashLeds(2, this.id);
    }
}
