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
@customElement('edit')
@inject(Element)
export class Edit {
    constructor(element) {
        this.element = element;
        this.backupObject = undefined;
    }

    bind() {
        this.small = this.options.small;
        this.compact = this.options.compact;
        this.controlsShown = false;
        this.editShown = true;
    }

    startEdit() {
        this.backupObject = this.object.name;
        this.object._edit = true;
    }

    cancel() {
        this.object._edit = false;
        this.object.name = this.backupObject;
    }

    set() {
        this.object._edit = false;
        if (this.backupObject !== this.object.name) {
            this.sendChange();
        }
    }

    sendChange() {
        let cEvent = new CustomEvent('edit', {
            bubbles: true,
            detail: {
                value: this.object
            }
        });
        this.element.dispatchEvent(cEvent);
    }
}
