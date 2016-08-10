import {customElement, bindable, bindingMode} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import {inject} from "aurelia-dependency-injection";
import $ from "jquery";
import "bootstrap";
import "bootstrap-toggle";
import "bootstrap-toggle/css/bootstrap-toggle.css";

@bindable({
    name: 'checked',
    defaultBindingMode: bindingMode.twoWay
})
@inject(Element, I18N)
@customElement('toggle-button')
export class ToggleButton {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
        this._lastChecked = undefined;
    }

    bind() {
        this.toggleElement = $(this.element.querySelector('[data-toggle="toggle"]'));
        this.toggleElement.bootstrapToggle({
            on: this.i18n.tr('generic.on'),
            off: this.i18n.tr('generic.off'),
            width: this.width
        });
        this.toggleElement.change(() => {
            this.checked = this.toggleElement.prop('checked');
            if (this.checked !== this._lastChecked) {
                this._lastChecked = this.checked;
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
        this._lastChecked = this.checked;
    }

    checkedChanged(newValue) {
        if (newValue) {
            this.toggleElement.bootstrapToggle('on');
        } else {
            this.toggleElement.bootstrapToggle('off');
        }
    }

    unbind() {
        this.toggleElement.bootstrapToggle('destroy');
    }
}
