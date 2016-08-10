import {customElement, bindable, bindingMode, noView} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import {inject} from "aurelia-dependency-injection";
import $ from "jquery";
import ionRangeSlider from "ion-rangeslider";
import "ion-rangeslider/css/ion.rangeSlider.css";
import "ion-rangeslider/css/ion.rangeSlider.skinModern.css";

@bindable({
    name: 'value',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'started',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'options'
})
@noView()
@inject(Element, I18N)
@customElement('slider')
export class Slider {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
        this.slider = undefined;
        this.busy = false;
    }

    bind() {
        $(this.element).ionRangeSlider({
            min: this.options.minimum,
            max: this.options.maximum,
            step: this.options.step,
            from: this.value,
            grid: true,
            prettify_enabled: true,
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
        });
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
}
