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
import {computedFrom} from 'aurelia-framework';
import {Step} from '../basewizard';

export class PowerInput extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.sensors = {
            v8: { 0: this.i18n.tr('generic.notset'), 2: '25A', 3: '50A' },
            v12: { 0: this.i18n.tr('generic.notset'), 2:'12.5A', 3: '25A', 4: '50A', 5: '100A', 6: '200A' },
        };
        this.title = this.i18n.tr('wizards.configurelabelinputs.title');
    }

    @computedFrom('data.module')
    get sensorsList() {
        const currentVersionSensors = this.sensors[`v${this.data.module.version || 12}`];
        return Object.keys(currentVersionSensors).map(key => currentVersionSensors[key]);
    }

    set sensorsList(value) {}

    proceed() {
        if (this.data.module.version !== 1) {
            const currentVersionSensors = this.sensors[`v${this.data.module.version || 12}`];
            this.data.module.sensor = Number(Object.keys(currentVersionSensors).find(key => currentVersionSensors[key] === this.data.module.sensor)) || 0;
        }
        return this.data;
    }

    attached() {
        super.attached();
    }
}
