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
import {I18N} from "aurelia-i18n";
import $ from "jquery";
import "bootstrap";
import "bootstrap-toggle";

@bindable({
    name: 'checked',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'options'
})
@bindable({
    name: 'disabled'
})
@customElement('toggle-button')
@inject(Element, I18N)
export class ToggleButton {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
        this.toggleChecked = undefined;
        this.width = null;
    }

    bind() {
        this.toggleElement = $(this.element.querySelector('[data-toggle="toggle"]'));
        this.options = this.options || {};
        this.width = this.options.width || null;
        let text = this.options.text || ['generic.on', 'generic.off'];
        let styles = this.options.styles || ['success', 'default'];
        let size = this.options.size || 'normal';
        let height = this.options.height || null;
        let width = null;
        if (this.width !== null && this.width !== undefined) {
            if (this.width.call) {
                width = this.width();
            } else {
                width = this.width;
            }
        }
        let settings = {
            on: this.i18n.tr(text[0]),
            off: this.i18n.tr(text[1]),
            onstyle: styles[0],
            offstyle: styles[1],
            size: size,
            width: width,
            height: height
        };
        this.toggleElement.bootstrapToggle(settings);
        this.toggleElement.change(() => {
            this.toggleChecked = this.toggleElement.prop('checked');
            if (this.checked !== this.toggleChecked) {
                this.checked = this.toggleChecked;
                let cEvent = new CustomEvent('change', {
                    bubbles: true,
                    detail: {
                        value: this.checked
                    }
                });
                this.element.dispatchEvent(cEvent);
            }
        });
        this.checkedChanged(this.checked);
    }

    attached() {
        if (this.width !== null && this.width !== undefined && this.width.call) {
            let toggles = $(this.element.querySelector('[data-toggle="toggle"]'));
            toggles[0].style.width = this.width();
        }
    }

    checkedChanged(newValue) {
        if (newValue !== this.toggleChecked) {
            this.disable(false);
            if (newValue) {
                this.toggleElement.bootstrapToggle('on');
            } else {
                this.toggleElement.bootstrapToggle('off');
            }
            this.disable(this.disabled);
        }
    }

    disable(disable) {
        if (disable === true) {
            this.toggleElement.bootstrapToggle('disable');
        } else {
            this.toggleElement.bootstrapToggle('enable');
        }
    }

    disabledChanged(newValue) {
        this.disable(newValue);
    }

    unbind() {
        this.toggleElement.bootstrapToggle('destroy');
    }
}
