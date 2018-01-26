/*
 * Copyright (C) 2016 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {Step} from "../basewizard";

export class Change extends Step {
    constructor(...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = '';
        this.data = data;
        this.errors = [];
    }

    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.errors.length > 0) {
            valid = false;
            for (let error of this.errors) {
                reasons.push(this.i18n.tr(`generic.actionerrors.${error}`));
            }
            fields.add('actions');
        }
        if (this.data.groupAction.name === '') {
            valid = false;
            reasons.push(this.i18n.tr('wizards.groupaction.noname'));
            fields.add('name');
        } else if (this.data.groupAction.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.groupaction.nametoolong'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        let groupAction = this.data.groupAction;
        try {
            await this.api.setGroupActionConfiguration(groupAction.id, groupAction.name, groupAction.actions.join(','));
            return [this.data.isNew ? 'new' : 'update', this.data.groupAction];
        } catch (error) {
            console.error(`Could not save Group Action configuration: ${error.message}`);
        }
    }

    get canRemove() {
        return !this.data.isNew;
    }

    async remove() {
        try {
            await this.api.setGroupActionConfiguration(this.data.groupAction.id, '', '');
            return ['remove', this.data.groupAction];
        } catch (error) {
            console.error(`Could not clean Group Action configuration: ${error.message}`);
        }
    }

    attached() {
        super.attached();
    }
}
