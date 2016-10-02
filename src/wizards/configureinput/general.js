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

    @computedFrom('data.input.name')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.input.name.length > 8) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureinput.general.nametoolong'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
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
