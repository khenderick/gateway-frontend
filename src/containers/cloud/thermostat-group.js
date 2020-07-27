/*
 * Copyright (C) 2019 OpenMotics BV
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
import {computedFrom} from 'aurelia-framework';
import {BaseObject} from '../baseobject';
import {Acl} from './acl';

export class ThermostatGroup extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();  // Inverted order
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.processing = false;
        this.capabilities = undefined;
        this.status = undefined;
        this.mode = undefined;
        this._acl = undefined;
        
        this.mapping = {
            id: 'id',
            _acl: [['_acl'], (acl) => {
                return new Acl(acl);
            }],
            schedule: 'schedule',
            capabilities: 'capabilities',
            state: 'status.state',
            mode: 'status.mode'
        };
    }

    @computedFrom('_acl')
    get setModeAllowed() {
        return this._acl.hasAccessTo('set_mode');
    }

    @computedFrom('_acl')
    get setStateAllowed() {
        return this._acl.hasAccessTo('set_state');
    }

    @computedFrom('mode')
    get isHeating() {
        return this.mode === 'HEATING';
    }

    set isHeating(value) {
        // This value itself is read only, but needed to allow binding
    }

    @computedFrom('state')
    get isOn(){
        return this.state === 'ON';
    }

    set isOn(value){
        // This value itself is read only, but needed to allow binding
    }

    async toggleMode() {
        if (this.isHeating) {
            this.mode = 'COOLING';
            await this.api.setThermostatMode('COOLING');
        } else {
            this.mode = 'HEATING';
            await this.api.setThermostatMode('HEATING');
        }
    }

    async toggleState() {
        if (this.isOn) {
            this.api.setThermostatState('OFF');
        } else {
            this.api.setThermostatState('ON');
        }
    }
    
    async setPreset(preset) {
        this.api.setThermostatPreset(preset);
    }
}
