import {inject, customElement, bindable, bindingMode, noView} from "aurelia-framework";
import $ from "jquery";
import * as noUiSlider from "nouislider";
import "nouislider/distribute/nouislider.css";
import Shared from "../../components/shared";

@bindable({
    name: 'value',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'status',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: true
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
        this.busy = false;

        this.slider = document.createElement('div');
        this.element.appendChild(this.slider);
    }

    bind() {
        let formatter = {
            to: (value) => {
                let prettyValue = '';
                if (this.options.prefix !== undefined) {
                    prettyValue += this.i18n.tr(this.options.prefix) + '&nbsp;';
                }
                prettyValue += Number(value).toFixed(1);
                if (this.options.suffix !== undefined) {
                    prettyValue += '&nbsp;' + this.i18n.tr(this.options.suffix);
                }
                return prettyValue;
            },
            from: (value) => {
                let cleanValue = value.toString();
                if (this.options.prefix !== undefined) {
                    let prefixLength = this.i18n.tr(this.options.prefix).length + 1;
                    cleanValue = cleanValue.substr(prefixLength);
                }
                if (this.options.suffix !== undefined) {
                    let suffixLength = this.i18n.tr(this.options.suffix).length + 1;
                    cleanValue = cleanValue.substr(0, cleanValue.length - suffixLength);
                }
                return parseFloat(cleanValue);
            }
        };
        noUiSlider.create(this.slider, {
            start: [this.value],
            step: this.options.step,
            connect: [true, false],
            tooltips: [formatter],
            range: {
                min: this.options.minimum,
                max: this.options.maximum
            },
            pips: {
                mode: 'steps',
                format: formatter,
                density: 100,
                filter: (value) => {
                    let range = this.options.maximum - this.options.minimum;
                    let mod = Math.floor(range / 5);
                    while (range % mod > 0 && mod > 0) {
                        mod--;
                    }
                    return (value - this.options.minimum) % mod === 0 ? 1 : 0;
                }
            }
        });
        $(this.slider).find('.noUi-tooltip').hide();
        this.slider.noUiSlider.on('change', () => {
            if (this.busy === true) {
                this.value = parseFloat(this.slider.noUiSlider.get());
                let cEvent = new CustomEvent('change', {
                    bubbles: true,
                    detail: {
                        value: this.value
                    }
                });
                this.element.dispatchEvent(cEvent);
            }
        });
        this.slider.noUiSlider.on('start', () => {
            this.busy = true;
            $(this.slider).find('.noUi-tooltip').show();
        });
        this.slider.noUiSlider.on('end', () => {
            this.busy = false;
            $(this.slider).find('.noUi-tooltip').hide();
        });
        this.valueChanged(this.value);
        this.statusChanged(this.status);
    }

    valueChanged(newValue) {
        if (this.busy === false) {
            this.slider.noUiSlider.set([newValue]);
        }
    }

    statusChanged(newStatus) {
        if (newStatus) {
            this.slider.removeAttribute('disabled');
        } else {
            this.slider.setAttribute('disabled', true);
        }
    }

    unbind() {
        this.slider.noUiSlider.off();
        this.slider.noUiSlider.destroy();
    }
}
