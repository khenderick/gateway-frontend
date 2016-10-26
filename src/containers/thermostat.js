import {computedFrom} from "aurelia-framework";
import Shared from "../components/shared";
import {BaseObject} from "./baseobject";
import {Schedule} from "./schedule";

export class Thermostat extends BaseObject {
    constructor(id, type) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.type = type;
        this.name = undefined;
        this.output0 = undefined;
        this.output1 = undefined;
        this.sensorNr = undefined;
        this.outside = undefined;
        this.currentSetpoint = undefined;
        this.mode = undefined;
        this.actualTemperature = undefined;
        this.airco = undefined;
        this.autoMonday = undefined;
        this.autoTuesday = undefined;
        this.autoWednesday = undefined;
        this.autoThursday = undefined;
        this.autoFriday = undefined;
        this.autoSaturday = undefined;
        this.autoSunday = undefined;
        this.permanentManual = undefined;
        this.pidP = undefined;
        this.pidI = undefined;
        this.pidD = undefined;
        this.pidInt = undefined;
        this.setpoint0 = undefined;
        this.setpoint1 = undefined;
        this.setpoint2 = undefined;
        this.setpoint3 = undefined;
        this.setpoint4 = undefined;
        this.setpoint5 = undefined;
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
            autoMonday: [['auto_mon'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoTuesday: [['auto_tue'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoWednesday: [['auto_wed'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoThursday: [['auto_thu'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoFriday: [['auto_fri'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoSaturday: [['auto_sat'], (schedule) => {
                return new Schedule(schedule);
            }],
            autoSunday: [['auto_sun'], (schedule) => {
                return new Schedule(schedule);
            }],
            permanentManual: 'permanent_manual',
            pidP: 'pid_p',
            pidI: 'pid_i',
            pidD: 'pid_d',
            pidInt: 'pid_int',
            setpoint0: 'setp0',
            setpoint1: 'setp1',
            setpoint2: 'setp2',
            setpoint3: 'setp3',
            setpoint4: 'setp4',
            setpoint5: 'setp5'
        };
    }

    @computedFrom('sensorNr')
    get isRelay() {
        return this.sensorNr === 240;
    }

    @computedFrom('currentSetpoint')
    get relayStatus() {
        return this.currentSetpoint > 20;
    }

    @computedFrom('output0', 'sensorNr')
    get isConfigured() {
        return this.output0 <= 240 && this.sensorNr <= 240 && this.name !== '';
    }

    @computedFrom('type')
    get isHeating() {
        return this.type === 'heating';
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
        if (this.isRelay) {
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
        if (!this.isRelay) {
            this.currentSetpoint = event.detail.value;
            this.setCurrentSetpoint();
        } else {
            this._freeze = false;
            this.processing = false;
            throw 'A relay Thermostat can not be changed'
        }
    }
}
