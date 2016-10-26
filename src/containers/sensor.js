import {computedFrom} from "aurelia-framework";
import Shared from "../components/shared";
import {BaseObject} from "./baseobject";

export class Sensor extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.name = undefined;
        this.offset = undefined;
        this.rawTemperature = undefined;
        this.rawHumidity = undefined;
        this.rawBrightness = undefined;
        this.previousTemperature = undefined;
        this.previousHumidity = undefined;
        this.previousBrightness = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            offset: 'offset'
        };
    }

    @computedFrom('name')
    get inUse() {
        return this.name !== '' && this.name !== 'NOT_IN_USE'
    }

    @computedFrom('inUse', 'name', 'id')
    get identifier() {
        return this.inUse ? this.name : this.id;
    }

    @computedFrom('rawTemperature')
    get temperature() {
        if (this.rawTemperature === 95.5) {
            return undefined;
        }
        return this.rawTemperature;
    }

    set temperature(temperature) {
        this.previousTemperature = this.rawTemperature;
        if (temperature === undefined) {
            this.rawTemperature = 95.5;
        }
        this.rawTemperature = temperature
    }

    @computedFrom('rawTemperature', 'previousTemperature')
    get temperatureDirection() {
        if (this.previousTemperature === undefined || this.rawTemperature === this.previousTemperature) {
            return undefined;
        }
        return this.rawTemperature > this.previousTemperature;
    }

    @computedFrom('rawHumidity')
    get humidity() {
        if (this.rawHumidity === 255) {
            return undefined;
        }
        return this.rawHumidity;
    }

    set humidity(humidity) {
        this.previousHumidity = this.rawHumidity;
        if (humidity === undefined) {
            this.rawHumidity = 255;
        }
        this.rawHumidity = humidity
    }

    @computedFrom('rawHumidity', 'previousHumidity')
    get humidityDirection() {
        if (this.previousHumidity === undefined || this.rawHumidity === this.previousHumidity) {
            return undefined;
        }
        return this.rawHumidity > this.previousHumidity;
    }

    @computedFrom('rawBrightness')
    get brightness() {
        if (this.rawBrightness === 255) {
            return undefined;
        }
        return this.rawBrightness;
    }

    set brightness(brightness) {
        this.previousBrightness = this.rawBrightness;
        if (brightness === undefined) {
            this.rawBrightness = 255;
        }
        this.rawBrightness = brightness
    }

    @computedFrom('rawBrightness', 'previousBrightness')
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
            this.offset
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    indicate() {
        return this.api.flashLeds(3, this.id);
    }
}
