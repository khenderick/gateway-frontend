import $ from "jquery";
import Shared from "../components/shared";

export class Base {
    constructor() {
        this.i18n = Shared.get('i18n');
        this.ea = Shared.get('ea');

        this.ea.subscribe('i18n:locale:changed', () => {
            this.i18n.updateTranslations($('body'));
        });
    }

    attached() {
        this.i18n.updateTranslations($('body'));
    }
}
