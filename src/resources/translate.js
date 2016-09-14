import {inject, customAttribute} from "aurelia-framework";
import Shared from "../components/shared";

@customAttribute('translate')
@inject(Element)
export class Translate {
    constructor(element) {
        this.element = element;
        this.i18n = Shared.get('i18n');
    };

    valueChanged(newValue) {
        this.element.innerHTML = this.i18n.tr(newValue);
    };
}
