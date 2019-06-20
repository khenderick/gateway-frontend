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
import {I18N} from 'aurelia-i18n';

@bindable({
    name: 'object',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@customElement('edit')
@inject(I18N, Element)
export class Edit {
    constructor(i18n, element) {
        this.i18n = i18n;
        this.element = element;
        this.edit = false;
    }

    enableEdition() {
        this.edit = true;
    }

    set(item) {
        this.object = item;
        this.edit = false;
        this.sendChange();
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
