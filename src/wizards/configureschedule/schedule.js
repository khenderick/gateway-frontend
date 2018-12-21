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
import {Toolbox} from "../../components/toolbox";
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
        this.everies = [1, 5, 10, 15, 30, 60, 90, 120, 180, 240, 360, 720];
    }

    @computedFrom(
        'scheduleError', 'data',
        'data.schedule', 'data.dorepeat', 'data.repeat', 'data.start', 'data.end', 'data.advancedrepeat',
        'data.simplerepeat', 'data.simplerepeat.doat', 'data.simplerepeat.at', 'data.simplerepeat.every',
        'data.simplerepeat.day.day0', 'data.simplerepeat.day.day1', 'data.simplerepeat.day.day2', 'data.simplerepeat.day.day3',
        'data.simplerepeat.day.day4', 'data.simplerepeat.day.day5', 'data.simplerepeat.day.day6'
    )
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (!Toolbox.isDate(this.data.start)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidstart'));
            fields.add('start');
        }
        if (this.data.dorepeat && ![undefined, ''].contains(this.data.end) && !Toolbox.isDate(this.data.end)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidend'));
            fields.add('end');
        }
        if (this.data.dorepeat) {
            if (this.data.advancedrepeat) {
                if ([undefined, ''].contains(this.data.repeat) || this.scheduleError === true) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidrepeat'));
                    fields.add('repeat');
                }
            } else {
                let day = false;
                for (let i of [0, 1, 2, 3, 4, 5, 6]) {
                    day |= this.data.simplerepeat.day[`day${i}`];
                }
                if (!day) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invaliddays'));
                    fields.add('when');
                }
                if (![0, 1].contains(this.data.simplerepeat.doat)) {
                    valid = false;
                    reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invaliddoat'));
                    fields.add('when');
                } else {
                    if (this.data.simplerepeat.doat === 1) {
                        if ([undefined, ''].contains(this.data.simplerepeat.at) || !this.data.simplerepeat.at.match('^\\d{1,2}:\\d{2}$') || isNaN(Date.parse(`2000 ${this.data.simplerepeat.at}`))) {
                            valid = false;
                            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidat'));
                            fields.add('when');
                        }
                    } else {
                        if (!this.everies.contains(this.data.simplerepeat.every)) {
                            valid = false;
                            reasons.push(this.i18n.tr('wizards.configureschedule.schedule.invalidevery'));
                            fields.add('when');
                        }
                    }
                }
            }
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    @computedFrom('data.repeat')
    get repeatReset() {
        this.scheduleError = false; // Easy workaround
    }

    everyText(item) {
        return this.i18n.tr(`wizards.configureschedule.schedule.everies.${item}`);
    }

    async proceed() {
        this.data.schedule.start = Date.parse(this.data.start) / 1000;
        if (this.data.dorepeat) {
            this.data.schedule.end = ![undefined, ''].contains(this.data.end) ? Date.parse(this.data.end) / 1000 : undefined;
            if (this.data.advancedrepeat) {
                this.data.schedule.repeat = this.data.repeat;
            } else {
                let days = [];
                for (let i of [0, 1, 2, 3, 4, 5, 6]) {
                    days[i] = this.data.simplerepeat.day[`day${i}`];
                }
                this.data.schedule.repeat = Toolbox.generateCrontab(
                    days,
                    this.data.simplerepeat.doat === 1 ? this.data.simplerepeat.at : undefined,
                    this.data.simplerepeat.doat === 0 ? this.data.simplerepeat.every : undefined,
                ); // [days, at, every]
            }
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
                    action_type: parseInt(this.data.actionType),
                    action_number: parseInt(this.data.actionNumber)
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
