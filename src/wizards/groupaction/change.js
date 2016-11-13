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
import Shared from "../../components/shared";
import {Step} from "../basewizard";

export class Change extends Step {
    constructor(data) {
        super();
        this.api = Shared.get('api');
        this.data = data;
    }

    get canProceed() {
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
