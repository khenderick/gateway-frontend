import {I18N} from "aurelia-i18n";
import {inject, customAttribute} from "aurelia-framework";

@customAttribute('translate')
@inject(Element, I18N)
export class Translate {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
    };

    valueChanged(newValue) {
        this.element.innerHTML = this.i18n.tr(newValue);
    };
}
