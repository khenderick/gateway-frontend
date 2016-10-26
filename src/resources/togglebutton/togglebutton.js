import {inject, customElement, bindable, bindingMode} from "aurelia-framework";
import $ from "jquery";
import "bootstrap";
import "bootstrap-toggle";
import "bootstrap-toggle/css/bootstrap-toggle.css";
import Shared from "../../components/shared";

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
@inject(Element)
export class ToggleButton {
    constructor(element) {
        this.element = element;
        this.i18n = Shared.get('i18n');
        this._lastChecked = undefined;
    }

    bind() {
        this.toggleElement = $(this.element.querySelector('[data-toggle="toggle"]'));
        this.options = this.options || {};
        let text = this.options.text || ['generic.on', 'generic.off'];
        let styles = this.options.styles || ['success', 'default'];
        let size = this.options.size || 'normal';
        let width = this.options.width || null;
        let height = this.options.height || null;
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
        this.disable(false);
        if (newValue) {
            this.toggleElement.bootstrapToggle('on');
        } else {
            this.toggleElement.bootstrapToggle('off');
        }
        this.disable(this.disabled);
    }

    disable(disable) {
        let toggle = $(this.element.querySelector('[data-toggle="toggle"]'));
        if (disable === true) {
            toggle.addClass('disabled');
            toggle.prop('disabled', true);
        } else {
            toggle.removeClass('disabled');
            toggle.prop('disabled', false);
        }
    }

    disabledChanged(newValue) {
        this.disable(newValue);
    }

    unbind() {
        this.toggleElement.bootstrapToggle('destroy');
    }
}
