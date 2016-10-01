import {inject, customElement, bindable, bindingMode, noView} from "aurelia-framework";
import $ from "jquery";
import ionRangeSlider from "ion-rangeslider";
import "ion-rangeslider/css/ion.rangeSlider.css";
import "ion-rangeslider/css/ion.rangeSlider.skinModern.css";
import Shared from "../../components/shared";

@bindable({
    name: 'value',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'status',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'options'
})
@noView()
@customElement('slider')
@inject(Element)
export class Slider {
    constructor(element) {
        this.element = element;
        this.i18n = Shared.get('i18n');
        this.slider = undefined;
        this.busy = false;
    }

    bind() {
        let settings = {
            min: this.options.minimum,
            max: this.options.maximum,
            step: this.options.step,
            from: this.value,
            grid: true,
            prettify_enabled: true,
            disabled: !this.status,
            prettify: ((value) => {
                let prettyValue = '';
                if (this.options.prefix !== undefined) {
                    prettyValue += this.i18n.tr(this.options.prefix) + ' ';
                }
                prettyValue += Number(value).toFixed(1);
                if (this.options.suffix !== undefined) {
                    prettyValue += ' ' + this.i18n.tr(this.options.suffix);
                }
                return prettyValue;
            }),
            onStart: (() => {
                this.busy = true;
            }),
            onFinish: ((data) => {
                this.value = data.from;
                let cEvent = new CustomEvent('change', {
                    bubbles: true,
                    detail: {
                        value: this.value
                    }
                });
                this.element.dispatchEvent(cEvent);
                this.busy = false;
            })
        };
        if (this.status !== undefined) {
            settings.disable = !this.status;
        }
        $(this.element).ionRangeSlider(settings);
        this.slider = $(this.element).data('ionRangeSlider');
    }

    unbind() {
        this.slider.destroy();
    }

    valueChanged(newValue) {
        if (this.busy === false) {
            this.slider.update({
                from: newValue
            });
        }
    }
    statusChanged(newStatus) {
        this.slider.update({
            disable: !newStatus
        });
    }
}
