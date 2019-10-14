/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {Step} from '../basewizard';
import {Logger} from '../../components/logger';
import {EventRule} from '../../containers/eventrule';

@inject(Factory.of(EventRule))
export class Configure extends Step {
    constructor(eventRuleFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.eventRuleFactory = eventRuleFactory;
        this.title = this.i18n.tr('wizards.configureeventrule.title');
        this.data = data;
    }

    @computedFrom('data.title', 'data.message', 'data.target',
        'data.triggerType', 'data.triggerId')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        const eventRule = this.data.eventRule || this.eventRuleFactory();
        eventRule.title = this.data.title;
        eventRule.message = this.data.message;
        eventRule.target = this.data.target;
        eventRule.triggerType = this.data.triggerType;
        eventRule.triggerId = this.data.triggerId;
        return eventRule.save();
    }

    async prepare() {
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
