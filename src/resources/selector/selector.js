/*
 * Copyright (C) 2019 OpenMotics BVBA
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

@bindable({
    name: 'object',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@bindable({
    name: 'disabled',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@customElement('selector')
@inject(Element)
export class Selector {
    constructor(element) {
        this.a = false;
        this.element = element;
    }

    bind() {
    }

    handleClicks(event) {
        event.stopPropagation();
    }


    select(event) {
        this.sendChange(event);
    }

    sendChange(event) {
        event.stopPropagation();
        let cEvent = new CustomEvent('selected', {
            bubbles: true,
            detail: {
                value: this.object
            }
        });
        this.element.dispatchEvent(cEvent);
    }
}
