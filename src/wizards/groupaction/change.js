import {computedFrom} from "aurelia-framework";
import Shared from "../../components/shared";
import {Step} from "../basewizard";

export class Change extends Step {
    constructor(id, data) {
        super(id);
        this.api = Shared.get('api');
        this.data = data;
    }

    @computedFrom('data.groupAction.actions', 'data.groupAction.name')
    get canContinue() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.groupAction.actions.split(',').length > 32) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.groupaction.toolong'));
            fields.add('actions');
        }
        if (this.data.groupAction.actions === undefined || this.data.groupAction.actions === '' || this.data.groupAction.actions.split(',').length === 0) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.groupaction.noactions'));
            fields.add('actions');
        }
        if (this.data.groupAction.name === '') {
            valid = false;
            reasons.push(this.i18n.tr('wizards.groupaction.noname'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        let groupAction = this.data.groupAction;
        return this.api.setGroupActionConfiguration(groupAction.id, groupAction.name, groupAction.actions)
            .then(() => {
                return [this.data.new ? 'new' : 'update', this.data.groupAction];
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not save Group Action configuration');
                }
            });
    }

    @computedFrom('data.new')
    get canRemove() {
        return !this.data.new;
    }

    remove() {
        return this.api.setGroupActionConfiguration(this.data.groupAction.id, '', '')
            .then(() => {
                return ['remove', this.data.groupAction];
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not clean Group Action configuration');
                }
            });
    }

    attached() {
        super.attached();
    }
}
