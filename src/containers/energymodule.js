/*
 * Copyright (C) 2016 OpenMotics BV
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

export class EnergyModule extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.version = undefined;
        this.address = undefined;
        this.name = undefined;
        this.realtimeData = {};
        for (let i = 0; i < 12; i++) {
            this[`input${i}`] = undefined;
            this[`times${i}`] = undefined;
            this[`sensor${i}`] = undefined;
            this[`inverted${i}`] = undefined;
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
            this.mapping[`input${i}`] = `input${i}`;
            this.mapping[`times${i}`] = `times${i}`;
            this.mapping[`sensor${i}`] = `sensor${i}`;
            this.mapping[`inverted${i}`] = `inverted${i}`;
        }
    }

    distributeRealtimeData(data) {
        for (let [index, entry] of data.entries()) {
            let current = entry[2];
            this.realtimeData[index].voltage = entry[0];
            this.realtimeData[index].frequency = entry[1];
            this.realtimeData[index].current = entry[2];
            if (this.version === EnergyModule.P1_CONCENTRATOR) {
                this.realtimeData[index].power = entry[3];
            } else {
                this.realtimeData[index].power = current === 0 ? 0 : entry[3];
            }
        }
    }

    distributeRealtimeMetricData(ct, data) {
        for (let type of ['voltage', 'frequency', 'current']) {
            this.realtimeData[ct][type] = data[type];
        }
        this.realtimeData[ct].power = data.current === 0 ? 0 : data.power;
    }

    static ENERGY_MODULE = 12;
    static POWER_MODULE = 8;
    static P1_CONCENTRATOR = 1;
}