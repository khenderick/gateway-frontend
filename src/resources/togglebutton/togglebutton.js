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
import {EventAggregator} from "aurelia-event-aggregator";
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
@bindable({
    name: 'enabled'
})
@customElement('toggle-button')
@inject(Element, I18N, EventAggregator)
export class ToggleButton {
    constructor(element, i18n, ea) {
        this.element = element;
        this.i18n = i18n;
        this.ea = ea;
        this.toggleChecked = undefined;
        this.width = null;
        this.translationSubscription = undefined;
        this.text = ['generic.on', 'generic.off'];
    }

    bind() {
        this.toggleElement = $(this.element.querySelector('[data-toggle="toggle"]'));
        this.options = this.options || {};
        this.width = this.options.width || null;
        this.text = this.options.text || this.text;
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
            on: this.i18n.tr(this.text[0]),
            off: this.i18n.tr(this.text[1]),
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
        this.translationSubscription = this.ea.subscribe('i18n:locale:changed', () => {
            let parent = this.toggleElement.parent();
            parent.attr('id', 'fuu');
            parent.find('.toggle-on').html(this.i18n.tr(this.text[0]));
            parent.find('.toggle-off').html(this.i18n.tr(this.text[1]));
            if (this.width !== null) {
                setTimeout(() => {
                    let width = this.width.call ? this.width() : this.width;
                    parent.css('width', width);
                }, 25);
            }
        });
    }

    detached() {
        if (this.translationSubscription !== undefined) {
            this.translationSubscription.dispose();
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
            if (this.disabled !== undefined) {
                this.disable(this.disabled);
            }
            if (this.enabled !== undefined) {
                this.disable(!this.enabled);
            }
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

    enabledChanged(newValue) {
        this.disable(!newValue);
    }

    unbind() {
        this.toggleElement.bootstrapToggle('destroy');
    }
}
