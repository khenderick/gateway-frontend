/*
 * Copyright (C) 2018 OpenMotics BV
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Step} from '../basewizard';
import {GroupAction} from '../../containers/groupaction';

@inject(Factory.of(GroupAction))
export class Configure extends Step {
    constructor(groupActionFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.groupActionFactory = groupActionFactory;
        this.title = this.i18n.tr('wizards.configureschedule.configure.title');
        this.groupActions = [];
        this.data = data;
    }

    groupActionName(groupAction) {
        return groupAction.name;
    }

    @computedFrom('data.mode', 'data.actionType', 'data.actionNumber', 'data.groupAction')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        switch (this.data.mode) {
            case 'groupaction':
                if (this.data.groupAction === undefined) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.configure.missinggroupaction'));
                    fields.add('groupaction');
                }
                break;
            case 'basicaction':
                let actionType = parseInt(this.data.actionType);
                let actionNumber = parseInt(this.data.actionNumber);
                if (actionType < 0 || actionType > 255) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.configure.invalidactiontype'));
                    fields.add('actiontype');
                }
                if (actionNumber < 0 || actionNumber > 255) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.configure.invalidactionnumber'));
                    fields.add('actionnumber');
                }
                break;
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        this.data.actionType = parseInt(this.data.actionType);
        this.data.actionNumber = parseInt(this.data.actionNumber);
    }

    async prepare() {
        let promises = [];
        switch (this.data.mode) {
            case 'groupaction':
                promises.push((async () => {
                    try {
                        let data = await this.api.getGroupActionConfigurations();
                        Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                            let groupAction = this.groupActionFactory(id);
                            if (id === this.data.groupActionId) {
                                this.data.groupAction = groupAction;
                            }
                            return groupAction;
                        });
                        this.groupActions.sort((a, b) => {
                            return a.name > b.name ? 1 : -1;
                        });
                    } catch (error) {
                        Logger.error(`Could not load Group Action configurations: ${error.message}`);
                    }
                })());
        }
        return Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
