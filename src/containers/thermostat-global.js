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
import {Toolbox} from "../components/toolbox";

export class GlobalThermostat extends BaseObject {
    constructor(...rest) {
        super(...rest);
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
                    let property = `switchTo${type}${detail}${i}`;
                    this[property] = undefined;
                    this.mapping[property] = `switch_to_${type.toLowerCase()}_${detail.toLowerCase()}_${i}`;
                }
            }
        }
    }

    @computedFrom('switchToHeatingValue0')
    get controlledSwitchToHeatingValue0() {
        return Toolbox.system64ToPercent(this.switchToHeatingValue0, 10);
    }

    set controlledSwitchToHeatingValue0(value) {
        this.switchToHeatingValue0 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToHeatingValue1')
    get controlledSwitchToHeatingValue1() {
        return Toolbox.system64ToPercent(this.switchToHeatingValue1, 10);
    }

    set controlledSwitchToHeatingValue1(value) {
        this.switchToHeatingValue1 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToHeatingValue2')
    get controlledSwitchToHeatingValue2() {
        return Toolbox.system64ToPercent(this.switchToHeatingValue2, 10);
    }

    set controlledSwitchToHeatingValue2(value) {
        this.switchToHeatingValue2 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToHeatingValue3')
    get controlledSwitchToHeatingValue3() {
        return Toolbox.system64ToPercent(this.switchToHeatingValue3, 10);
    }

    set controlledSwitchToHeatingValue3(value) {
        this.switchToHeatingValue3 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToCoolingValue0')
    get controlledSwitchToCoolingValue0() {
        return Toolbox.system64ToPercent(this.switchToCoolingValue0, 10);
    }

    set controlledSwitchToCoolingValue0(value) {
        this.switchToCoolingValue0 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToCoolingValue1')
    get controlledSwitchToCoolingValue1() {
        return Toolbox.system64ToPercent(this.switchToCoolingValue1, 10);
    }

    set controlledSwitchToCoolingValue1(value) {
        this.switchToCoolingValue1 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToCoolingValue2')
    get controlledSwitchToCoolingValue2() {
        return Toolbox.system64ToPercent(this.switchToCoolingValue2, 10);
    }

    set controlledSwitchToCoolingValue2(value) {
        this.switchToCoolingValue2 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('switchToCoolingValue3')
    get controlledSwitchToCoolingValue3() {
        return Toolbox.system64ToPercent(this.switchToCoolingValue3, 10);
    }

    set controlledSwitchToCoolingValue3(value) {
        this.switchToCoolingValue3 = Toolbox.percentToSystem64(value);
    }

    @computedFrom('setpoint')
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

    @computedFrom('cooling')
    get isHeating() {
        return !this.cooling;
    }

    onHeatingToggle(event) {
        let cooling = !event.detail.value;
        this._freeze = true;
        this.processing = true;
        if (this.cooling !== cooling) {
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
        if (this.thermostatsOn !== on) {
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

    async set() {
        try {
            await this.api.setThermostatMode(this.thermostatsOn, this.automatic, this.isHeating, this.setpoint)
        } catch (error) {
            console.error(`Could not set global Thermostat: ${error.message}`);
        }
        this._freeze = false;
        this.processing = false;
    }

    async save() {
        this.processing = true;
        this._freeze = true;
        try {
            await this.api.setGlobalThermostatConfiguration(
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
            );
        } catch (error) {
            console.error(`Could not set global Thermostat configuration: ${error.message}`);
        }
        this._freeze = false;
        this.processing = false;
    }
}
