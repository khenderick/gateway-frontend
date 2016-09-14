import {computedFrom} from "aurelia-framework";
import Shared from "../components/shared";
import {BaseObject} from "./baseobject";

export class GlobalThermostat extends BaseObject {
    constructor() {
        super();
        this.status = undefined;
        this.setpoint = undefined;
        this.cooling = undefined;
        this.automatic = undefined;
        this.mapping = {
            status: 'thermostats_on',
            setpoint: 'setpoint',
            cooling: 'cooling',
            automatic: 'automatic'
        };
    }
}

export class Thermostat extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.name = undefined;
        this.output0 = undefined;
        this.output1 = undefined;
        this.sensorNr = undefined;
        this.outside = undefined;
        this.currentSetpoint = undefined;
        this.mode = undefined;
        this.actualTemperature = undefined;
        this.airco = undefined;
        this.relay = undefined;
        this.mapping = {
            id: 'id',
            name: 'name',
            output0: 'output0',
            output1: 'output1',
            sensorNr: 'sensor_nr',
            outside: 'outside',
            currentSetpoint: 'csetp',
            mode: 'mode',
            actualTemperature: 'act',
            airco: 'airco',
            relay: ['sensor_nr', (data) => {
                return data === 240;
            }]
        };
    }

    @computedFrom('currentSetpoint')
    get relayStatus() {
        return this.currentSetpoint > 20;
    }

    setCurrentSetpoint() {
        this._skip = true;
        this.api.setCurrentSetpoint(this.id, this.currentSetpoint)
            .then(() => {
                this._freeze = false;
                this.processing = false;
            })
            .catch(() => {
                this._freeze = false;
                this.processing = false;
                console.error('Could not set current setpoint for Thermostat ' + this.name);
            });
    }

    toggle() {
        this._freeze = true;
        this.processing = true;
        if (this.relay) {
            if (this.currentSetpoint > 20) {
                this.currentSetpoint = 10;
            } else {
                this.currentSetpoint = 30;
            }
            this.setCurrentSetpoint();
        } else {
            this._freeze = false;
            this.processing = false;
            throw 'A non-relay Thermostat cannot be toggled'
        }
    }

    change(event) {
        this._freeze = true;
        this.processing = true;
        if (!this.relay) {
            if (this.currentSetpoint !== event.detail.value) {
                // Work around out-of-order events
                this.currentSetpoint = event.detail.value;
            }
            this.setCurrentSetpoint();
        } else {
            this._freeze = false;
            this.processing = false;
            throw 'A relay Thermostat can not be changed'
        }
    }
}
