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

export class Configure extends Step {
    constructor(...rest) {
        const data = rest.pop();
        super(...rest);
        this.data = data;
        this.title = this.i18n.tr('wizards.configureenergymodules.title');
        this.sensors = {
            v8: { 0: this.i18n.tr('generic.notset'), 2: '25A', 3: '50A' },
            v12: { 0: this.i18n.tr('generic.notset'), 2:'12.5A', 3: '25A', 4: '50A', 5: '100A', 6: '200A', 150: '150A', 400: '400A' },
            v1: { 0: this.i18n.tr('generic.notset') },
        };
    }

    @computedFrom('data.module')
    get sensorsList() {
        const versionSensors = this.sensors[`v${this.data.module.version || 12}`];
        return Object.keys(versionSensors).map(key => versionSensors[key]);
    }
    set sensorsList(value) {}

    async proceed() {
        const module = this.data.module;
        const { module_id: id } = module;

        const versionSensors = this.sensors[`v${module.version || 12}`];
        module.sensor = Number(Object.keys(versionSensors).find(key => versionSensors[key] === module.sensorName)) || 0;

        const energyModule = this.data.energyModules.find(({ address }) => address == module.address);
        energyModule[`input${id}`] = module.name;
        energyModule[`inverted${id}`] = module.inverted ? 1 : 0;
        energyModule[`sensor${id}`] = module.sensor;
        energyModule[`times${id}`] = module.times;
        console.log(energyModule);
        return energyModule.save();
    }

    async prepare() {
        this.data.module.inverted = this.data.module.inverted === 1;
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
