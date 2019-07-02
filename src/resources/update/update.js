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
    name: 'display',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@bindable({
    name: 'options',
    defaultValue: {}
})
@customElement('update')
@inject(Element)
export class Update {
    constructor(element) {
        this.element = element;
        this.update = false;
    }

    bind() {
        this.small = this.options.small;
    }

    handleClicks(event) {
        event.stopPropagation();
    }

    startUpdate(event) {
        this.update = true;
        this.handleClicks(event);
    }

    cancel() {
        this.update = false;
    }

    set() {
        this.update = false;
        this.sendChange(); // this will basically start the update
    }

    sendChange() {
        let cEvent = new CustomEvent('update', {
            bubbles: true,
            detail: {
                value: this.object
            }
        });
        this.element.dispatchEvent(cEvent);
    }
}
