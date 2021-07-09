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
    }

    async proceed() {
        const module = this.data.module;
        const energyModule = this.data.energyModules.find(({ address }) => address == module.address);
        const { module_id: id } = this.data.module;
        energyModule[`input${id}`] = module.name;
        energyModule[`inverted${id}`] = module.inverted ? 1 : 0;
        energyModule[`sensor${id}`] = module.sensor;
        energyModule[`times${id}`] = module.times;
        return energyModule.save();
    }

    async prepare() {
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
