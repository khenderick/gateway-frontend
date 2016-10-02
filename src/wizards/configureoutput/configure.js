import {computedFrom} from "aurelia-framework";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Step} from "../basewizard";

export class Configure extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureoutput.configure.title');
        this.api = Shared.get('api');
        this.data = data;

        this.types = ['light', 'relay'];
    }

    typeText(type) {
        return this.i18n.tr('generic.' + type);
    }

    @computedFrom('data.output.name', 'data.hours', 'data.minutes', 'data.seconds')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.output.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.nametoolong'));
            fields.add('name');
        }
        if (parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds) > 65536) {
            let components = Toolbox.splitSeconds(65536);
            let parts = [];
            if (components.hours > 0) {
                parts.push(components.hours + 'h');
            }
            if (components.minutes > 0) {
                parts.push(components.minutes + 'm');
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(components.seconds + 's');
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureoutput.configure.timerlength', {max: parts.join(' ')}));
            fields.add('timer');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            let output = this.data.output;
            output.type = this.data.type === 'light' ? 255 : 0;
            output.timer = parseInt(this.data.hours) * 60 * 60 + parseInt(this.data.minutes) * 60 + parseInt(this.data.seconds);
            output.save();
            resolve();
        });
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
