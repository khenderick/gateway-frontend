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

export class GlobalThermostat extends BaseObject {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.thermostatsOn = undefined;
        this.setpoint = undefined;
        this.cooling = undefined;
        this.automatic = undefined;
        this.outsideSensor = undefined;
        this.pumpDelay = undefined;
        this.thresholdTemperature = undefined;
        this.mapping = {
            thermostatsOn: 'thermostats_on',
            setpoint: 'setpoint',
            cooling: 'cooling',
            automatic: 'automatic',
            outsideSensor: 'outside_sensor',
            pumpDelay: 'pump_delay',
            thresholdTemperature: 'threshold_temp'
        };
        for (let type of ['Heating', 'Cooling']) {
            for (let detail of ['Output', 'Value']) {
                for (let i of [0, 1, 2, 3]) {
                    let property = 'switchTo' + type + detail + i ;
                    this[property] = undefined;
                    this.mapping[property] = 'switch_to_' + type.toLowerCase() + '_' + detail.toLowerCase() + '_' + i;
                }
            }
        }
    }

    get controlledSwitchToHeatingValue0() {
        return Math.round(this.switchToHeatingValue0 / 64 * 100);
    }

    set controlledSwitchToHeatingValue0(value) {
        this.switchToHeatingValue0 = Math.round(64 * value / 100);
    }

    get controlledSwitchToHeatingValue1() {
        return Math.round(this.switchToHeatingValue1 / 64 * 100);
    }

    set controlledSwitchToHeatingValue1(value) {
        this.switchToHeatingValue1 = Math.round(64 * value / 100);
    }

    get controlledSwitchToHeatingValue2() {
        return Math.round(this.switchToHeatingValue2 / 64 * 100);
    }

    set controlledSwitchToHeatingValue2(value) {
        this.switchToHeatingValue2 = Math.round(64 * value / 100);
    }

    get controlledSwitchToHeatingValue3() {
        return Math.round(this.switchToHeatingValue3 / 64 * 100);
    }

    set controlledSwitchToHeatingValue3(value) {
        this.switchToHeatingValue3 = Math.round(64 * value / 100);
    }

    get controlledSwitchToCoolingValue0() {
        return Math.round(this.switchToCoolingValue0 / 64 * 100);
    }

    set controlledSwitchToCoolingValue0(value) {
        this.switchToCoolingValue0 = Math.round(64 * value / 100);
    }

    get controlledSwitchToCoolingValue1() {
        return Math.round(this.switchToCoolingValue1 / 64 * 100);
    }

    set controlledSwitchToCoolingValue1(value) {
        this.switchToCoolingValue1 = Math.round(64 * value / 100);
    }

    get controlledSwitchToCoolingValue2() {
        return Math.round(this.switchToCoolingValue2 / 64 * 100);
    }

    set controlledSwitchToCoolingValue2(value) {
        this.switchToCoolingValue2 = Math.round(64 * value / 100);
    }

    get controlledSwitchToCoolingValue3() {
        return Math.round(this.switchToCoolingValue3 / 64 * 100);
    }

    set controlledSwitchToCoolingValue3(value) {
        this.switchToCoolingValue3 = Math.round(64 * value / 100);
    }

    get mode() {
        switch (this.setpoint) {
            case 3:
                return 'away';
            case 4:
                return 'vacation';
            case 5:
                return 'party';
        }
        return 'auto';
    }

    get isHeating() {
        return !this.cooling;
    }

    onHeatingToggle(event) {
        let cooling = !event.detail.value;
        this._freeze = true;
        this.processing = true;
        if (this.cooling != cooling) {
            this.cooling = cooling;
            this.set();
        } else {
            this._freeze = false;
            this.processing = false;
        }
    }

    onOnOffToggle(event) {
        let on = event.detail.value;
        this._freeze = true;
        this.processing = true;
        if (this.thermostatsOn != on) {
            this.thermostatsOn = on;
            this.set();
        } else {
            this._freeze = false;
            this.processing = false;
        }
    }

    setMode(mode) {
        this._freeze = true;
        if (this.mode === mode) {
            this._freeze = false;
            return;
        }
        switch (mode) {
            case 'auto':
                this.automatic = true;
                if (this.setpoint > 2) {
                    this.setpoint = 0;
                }
                break;
            case 'away':
                this.automatic = false;
                this.setpoint = 3;
                break;
            case 'vacation':
                this.automatic = false;
                this.setpoint = 4;
                break;
            case 'party':
                this.automatic = false;
                this.setpoint = 5;
                break;
        }
        return this.set();
    }

    set() {
        return this.api.setThermostatMode(this.thermostatsOn, this.automatic, this.isHeating, this.setpoint)
            .then(() => {
                this._freeze = false;
                this.processing = false;
            })
            .catch(() => {
                this._freeze = false;
                this.processing = false;
                console.error('Could not set global Thermostat');
            });
    }

    save() {
        return this.api.setGlobalThermostatConfiguration(
                this.outsideSensor,
                this.pumpDelay,
                this.thresholdTemperature,
                [
                    [this.switchToHeatingOutput0, this.switchToHeatingValue0],
                    [this.switchToHeatingOutput1, this.switchToHeatingValue1],
                    [this.switchToHeatingOutput2, this.switchToHeatingValue2],
                    [this.switchToHeatingOutput3, this.switchToHeatingValue3]
                ],
                [
                    [this.switchToCoolingOutput0, this.switchToCoolingValue0],
                    [this.switchToCoolingOutput1, this.switchToCoolingValue1],
                    [this.switchToCoolingOutput2, this.switchToCoolingValue2],
                    [this.switchToCoolingOutput3, this.switchToCoolingValue3]
                ]
            ).then(() => {
                this._freeze = false;
                this.processing = false;
            })
            .catch(() => {
                this._freeze = false;
                this.processing = false;
                console.error('Could not set global Thermostat configuration');
            });
    }
}
