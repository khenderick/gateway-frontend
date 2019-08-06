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
import {BaseObject} from './baseobject';
import {Logger} from '../components/logger';
import {computedFrom} from 'aurelia-framework';

export class ThermostatCloud extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();  // Inverted order
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.actualTemperature = undefined;
        this.currentSetpoint = undefined;
        this.preset = undefined;
        this.name = undefined;
        this.roomId = undefined;
        this._freeze = false;
        this.processing = false;
        this.sensorId = undefined;

        this.mapping = {
            id: 'id',
            name: 'name',
            status: 'status',
            location: 'location',
            configuration: 'configuration'

        };
    }

    async setCurrentSetpoint() {
        this._skip = true;
        try {
            await this.api.setCurrentSetpoint(this.id, this.currentSetpoint);
        } catch (error) {
            Logger.error(`Could not set current setpoint for Thermostat ${this.name}: ${error.message}`);
        }
        this._freeze = false;
        this.processing = false;
    }

    @computedFrom('sensorId')
    get isRelay() {
        return this.sensorId === 240;
    }

    @computedFrom('status')
    get actualTemperature() {
        return this.status.actual_temperature;
    }

    set actualTemperature(temperature) {
        
    }

    @computedFrom('status')
    get currentSetpoint() {
        return this.status.current_setpoint;
    }

    set currentSetpoint(temperature) {
        
    }

    @computedFrom('status')
    get preset() {
        return this.status.preset;
    }

    set preset(preset) {
        
    }

    @computedFrom('location')
    get room() {
        return this.location.room;
    }

    @computedFrom('configuration')
    get room() {
        return this.configuration.sensor_id;
    }

    @computedFrom('currentSetpoint')
    get relayStatus() {
        return this.currentSetpoint > 20;
    }

    async toggle() {
        this._freeze = true;
        this.processing = true;
        if (this.isRelay) {
            if (this.currentSetpoint > 20) {
                this.currentSetpoint = 10;
            } else {
                this.currentSetpoint = 30;
            }
            return this.setCurrentSetpoint();
        }
        this._freeze = false;
        this.processing = false;
        throw 'A non-relay Thermostat cannot be toggled';
    }

    async change(event) {
        this._freeze = true;
        this.processing = true;
        this.currentSetpoint = event.detail.value;
        return this.setCurrentSetpoint();
    }

}
