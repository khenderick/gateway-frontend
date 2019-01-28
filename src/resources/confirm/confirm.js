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
import {inject, customElement, bindable, bindingMode} from "aurelia-framework";
import {I18N} from "aurelia-i18n";

@bindable({
    name: 'working',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@bindable({
    name: 'options',
    defaultValue: {}
})
@customElement('confirm')
@inject(Element, I18N)
export class Confirm {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;

        this.requested = false;
    }

    bind() {
        this.button = this.options.button || 'btn-danger';
        this.text = this.i18n.tr(this.options.text || 'generic.delete');
        this.xs = this.options.xs || false;
    }

    async request() {
        if (this.working) {
            return;
        }
        this.requested = true;
    }

    async confirm() {
        let event = new CustomEvent('confirm', {bubbles: true});
        this.element.dispatchEvent(event);
        if (this.working === undefined) {
            this.requested = false;
        }
    }

    async abort() {
        if (this.working) {
            return;
        }
        this.requested = false;
    }

    workingChanged(newValue) {
        if (!newValue) {
            this.requested = false;
        }
    }
}
