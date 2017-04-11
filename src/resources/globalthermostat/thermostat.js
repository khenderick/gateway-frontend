/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import {inject, customElement, bindable, bindingMode} from "aurelia-framework";
import "bootstrap";
import "bootstrap-toggle";
import {Base} from "../base";
import {Toolbox} from "../../components/toolbox";

@bindable({
    name: 'thermostat',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('global-thermostat')
@inject(Element)
export class GlobalThermostat extends Base {
    constructor(element, ...rest) {
        super(...rest);
        this.element = element;
        this.bool = false;
    }

    thermostatWidth() {
        return Toolbox.getDeviceViewport() === 'lg' ? '100px' : '40px';
    }
}
