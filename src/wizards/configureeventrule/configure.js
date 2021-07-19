/*
 * Copyright (C) 2019 OpenMotics BV
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
import {Step} from '../basewizard';
import {EventRule} from '../../containers/eventrule';

@inject(Factory.of(EventRule))
export class Configure extends Step {
    constructor(eventRuleFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.eventRuleFactory = eventRuleFactory;
        this.title = this.i18n.tr('wizards.configureeventrule.title');
        this.data = data;
        if (this.shared.installation.gateway_features.contains('input_states')) {
            this.data.triggerTypes = ['input', 'output'];
        } else {
            this.data.triggerTypes = ['output'];
        }
    }

    getTriggerTypeText(triggerType) {
        return this.i18n.tr(`pages.settings.eventrules.triggerTypes.${triggerType}`)
    }

    getTriggerStatusText(triggerStatus) {
        return this.i18n.tr(`pages.settings.eventrules.triggerStatuses.${triggerStatus}`)
    }

    getTriggerText(trigger) {
        if (trigger) {
            if (trigger.roomName !== '') {
                return `${trigger.name} (${trigger.roomName})`;
            } else {
                return trigger.name;
            }
        } else {
            return undefined;
        }
    }

    @computedFrom('data.triggerType', 'data.triggers')
    get triggers() {
        return this.data.triggers[this.data.triggerType].filter(trigger => trigger.inUse);
    }

    set triggers(triggerList) {}

    @computedFrom('data.trigger', 'data.triggers', 'data.triggerType')
    get selectedTrigger() {
        const triggerList = this.triggers;
        if (!triggerList.includes(this.data.trigger)) {
            this.data.trigger = triggerList[0];
        }
        return this.data.trigger;
    }

    set selectedTrigger(trigger) {
        this.data.trigger = trigger;
    }

    @computedFrom('data.title', 'data.message', 'data.triggerType', 'data.trigger', 'data.triggerStatus')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        const fieldRules = {
            title: {required: true, maxLength: 256},
            message: {required: true, maxLength: 2048},
            triggerType: {required: true},
            trigger: {required: true},
            triggerStatus: {required: true},
        };
        for (let [field, rules] of Object.entries(fieldRules)) {
            if (rules.required && !this.data[field]) {
                valid = false;
                reasons.push(this.i18n.tr(`wizards.configureeventrule.empty${field}`));
                fields.add(field);
            }
            if (rules.maxLength && this.data[field] && this.data[field].length > rules.maxLength) {
                valid = false;
                reasons.push(this.i18n.tr(`wizards.configureeventrule.toolong${field}`));
                fields.add(field);
            }
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        const eventRule = this.data.eventRule || this.eventRuleFactory(undefined);
        eventRule.id = this.data.id;
        eventRule.title = this.data.title;
        eventRule.message = this.data.message;
        eventRule.target = this.data.target;
        eventRule.triggerType = this.data.triggerType;
        eventRule.triggerId = this.data.trigger.id;
        eventRule.triggerStatus = this.data.triggerStatus;
        await eventRule.save();
        return eventRule;
    }

    async prepare() {
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
