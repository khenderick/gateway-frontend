import {inject} from "aurelia-framework";
import {BaseObject} from "./baseobject";
import {API} from "../components/api";

@inject(API)
export class EnergyModuleFactory {
    constructor(api) {
        this.api = api;
    }

    makeEnergyModule() {
        return new EnergyModule(this.api, ...arguments);
    }
}

export class EnergyModule extends BaseObject {
    constructor(api, id) {
        super();
        this.processing = false;
        this.api = api;
        this.key = 'id';
        this.id = id;
        this.version = undefined;
        this.address = undefined;
        this.name = undefined;
        this.realtimeData = {};
        for (let i = 0; i < 12; i++) {
            this['input' + i] = undefined;
            this['times' + i] = undefined;
            this['sensor' + i] = undefined;
            this['inverted' + i] = undefined;
            this.realtimeData[i] = {
                voltage: 0,
                frequency: 0,
                current: 0,
                power: 0
            };

        }
        this.mapping = {
            id: 'id',
            version: 'version',
            address: 'address',
            name: 'name'
        };
        for (let i = 0; i < 12; i++) {
            this.mapping['input' + i] = 'input' + i;
            this.mapping['times' + i] = 'times' + i;
            this.mapping['sensor' + i] = 'sensor' + i;
            this.mapping['inverted' + i] = 'inverted' + 1;
        }
    }

    distributeRealtimeData(data) {
        for (let [index, entry] of data.entries()) {
            let current = entry[2];
            this.realtimeData[index].voltage = entry[0];
            this.realtimeData[index].frequency = entry[1];
            this.realtimeData[index].current = entry[2];
            this.realtimeData[index].power = current === 0 ? 0 : entry[3];
        }
    }
}
