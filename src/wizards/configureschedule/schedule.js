/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {computedFrom, inject, BindingEngine} from "aurelia-framework";
import {Step} from "../basewizard";

@inject(BindingEngine)
export class Schedule extends Step {
    constructor(bindingEngine, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.bindingEngine = bindingEngine;
        this.title = this.i18n.tr('wizards.configureschedule.schedule.title');
        this.data = data;
        this.scheduleError = false;
        this.repeatSubscription = this.bindingEngine
            .propertyObserver(this.data, 'repeat')
            .subscribe(() => {
                this.scheduleError = false;
            });
    }

    @computedFrom('data', 'data.schedule', 'data.dorepeat', 'data.repeat', 'data.start', 'data.end', 'scheduleError')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if ([undefined, ''].contains(this.data.start) || !this.data.start.match('^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$') || isNaN(Date.parse(this.data.start))) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidstart'));
            fields.add('start');
        }
        if (this.data.dorepeat && ![undefined, ''].contains(this.data.end) && (!this.data.end.match('^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})?$') || isNaN(Date.parse(this.data.end)))) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidend'));
            fields.add('end');
        }
        if (this.data.dorepeat && ([undefined, ''].contains(this.data.repeat) || this.scheduleError === true)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidrepeat'));
            fields.add('repeat');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    @computedFrom('data.repeat')
    get repeatReset() {
        this.scheduleError = false; // Easy workaround
    }

    async proceed() {
        this.data.schedule.start = Date.parse(this.data.start) / 1000;
        if (this.data.dorepeat) {
            this.data.schedule.end = ![undefined, ''].contains(this.data.end) ? Date.parse(this.data.end) / 1000 : undefined;
            this.data.schedule.repeat = this.data.repeat;
        } else {
            this.data.schedule.end = undefined;
            this.data.schedule.repeat = undefined;
        }
        switch (this.data.mode) {
            case 'groupaction':
                this.data.schedule.arguments = this.data.groupAction.id;
                this.data.schedule.scheduleType = 'GROUP_ACTION';
                break;
            case 'basicaction':
                this.data.schedule.arguments = {
                    action_type: this.data.actionType,
                    action_number: this.data.actionNumber
                };
                this.data.schedule.scheduleType = 'BASIC_ACTION';
                break;
        }
        try {
            if (this.data.edit) {
                await this.api.removeSchedule(this.data.scheduleId);
            }
            await this.api.addSchedule(
                this.data.schedule.name,
                this.data.schedule.start,
                this.data.schedule.scheduleType,
                this.data.schedule.arguments,
                this.data.schedule.repeat,
                undefined, // duration
                this.data.schedule.end
            );
        } catch (error) {
            if (error.message.contains('Invalid `repeat`')) {
                this.scheduleError = true;
                return 'abort';
            }
            throw error;
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    detached() {
        this.repeatSubscription.dispose();
    }
}
