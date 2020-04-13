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
import {inject, customElement, bindable, bindingMode} from 'aurelia-framework';
import 'bootstrap';
import 'bootstrap-toggle';
import {Base} from '../base';
import {Toolbox} from '../../components/toolbox';
import Shared from '../../components/shared';

@bindable({
    name: 'thermostat',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'preset',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('thermostat-group')
@inject(Element)
export class ThermostatGroup extends Base {
    constructor(element, ...rest) {
        super(...rest);
        this.element = element;
        this.bool = false;
    }

    thermostatWidth() {
        let offset = Shared === undefined || Shared.locale === 'en' ? 0 : 20;
        let width = Toolbox.getDeviceViewport() === 'lg' ? 110 + offset : 40;
        return `${width}px`;
    }

    async changePreset(preset) {
        if (preset !== this.preset) {
            this.preset = preset
            await this.thermostat.setPreset(preset.toUpperCase());
        }
    }
}
