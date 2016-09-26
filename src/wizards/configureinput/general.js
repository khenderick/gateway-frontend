import {computedFrom} from "aurelia-framework";
import {Step} from "../basewizard";

export class General extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureinput.general.title');
        this.data = data;

        this.modes = [
            'inactive',
            'linked',
            'lightsoff',
            'outputsoff',
            'pulse',
            'advanced'
        ];
    }

    proceed() {
        return new Promise((resolve) => {
            resolve();
        });
    }

    modeText(item) {
        return this.i18n.tr('wizards.configureinput.general.' + item);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
