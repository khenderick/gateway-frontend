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
import {computedFrom, Container} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import CronParser from 'cron-parser';
import moment from 'moment';
import {Toolbox} from '../components/toolbox';
import {Logger} from '../components/logger';
import {BaseObject} from './baseobject';

export class Schedule extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.i18n = Container.instance.get(I18N);
        this.id = id;
        this.processing = false;
        this.key = 'id';
        this.name = '';
        this.start = undefined;
        this.repeat = undefined;
        this.duration = undefined;
        this.end = undefined;
        this.scheduleType = undefined;
        this.arguments = undefined;
        this.status = undefined;
        this.lastExecuted = undefined;
        this.nextExecution = undefined;

        this.ea.subscribe('i18n:locale:changed', (locales) => {
            if (this.start !== undefined && this.start !== 0) {
                this.start.locale(locales.newValue);
            }
            if (this.end !== undefined && this.end !== 0) {
                this.end.locale(locales.newValue);
            }
            if (this.lastExecuted !== undefined && this.lastExecuted !== 0) {
                this.lastExecuted.locale(locales.newValue);
            }
            if (this.nextExecution !== undefined && this.nextExecution !== 0) {
                this.nextExecution.locale(locales.newValue);
            }
        });

        this.mapping = {
            id: 'id',
            name: 'name',
            start: [['start'], (start) => {

                return start === null ? 0 : moment.unix(start);
            }],
            repeat: 'repeat',
            duration: 'duration',
            end: [['end'], (end) => {
                return end === null ? 0 : moment.unix(end);
            }],
            scheduleType: 'schedule_type',
            arguments: 'arguments',
            status: 'status',
            lastExecuted: [['last_executed'], (lastExecuted) => {
                return lastExecuted === null ? 0 : moment.unix(lastExecuted);
            }],
            nextExecution: [['next_execution'], (nextExecution) => {
                return nextExecution === null ? 0 : moment.unix(nextExecution);
            }]
        };
    }

    @computedFrom('repeat', 'end', 'start', 'nextExecution')
    get schedule() {
        let text = '';
        if (this.repeat == null) {
            text = this.i18n.tr('generic.schedules.once');
            if (this.start.valueOf() > Toolbox.getTimestamp()) {
                text += this.i18n.tr('generic.schedules.at', {start: this.start.format('lll')});
            }
            return text;
        }
        text = this.i18n.tr('generic.schedules.repeats');
        if (this.start.valueOf() > Toolbox.getTimestamp()) {
            text += this.i18n.tr('generic.schedules.startsat', {start: this.start.format('lll')});
        }
        if (this.end !== null) {
            text += this.i18n.tr('generic.schedules.until', {end: this.end.format('lll')});
        }
        if (this.nextExecution !== null) {
            text += this.i18n.tr('generic.schedules.nextat', {next: this.nextExecution.format('lll')});
        }
        return text;
    }

    generateSchedules(start, end, timezone, maximum) {
        let schedules = [];
        let window = null;
        if (this.start.unix() < end.unix() && (this.end === 0 || this.end > start.unix())) {
            window = {
                start: moment.unix(Math.max(this.start.unix(), start.unix())),
                end: moment.unix(this.end.valueOf() === 0 ? end.unix() : Math.min(this.end.unix(), end.unix()))
            };
        }
        let maximumReached = false;
        if (window !== null) {
            let add = (id, title, start, duration) => {
                let schedule = {id, title};
                if (duration !== null) {
                    schedule.start = start;
                    schedule.end = start + duration;
                } else {
                    schedule.start = start;
                    schedule.end = start + (30 * 60);
                }
                schedule.start = moment.unix(schedule.start).toISOString(true);
                schedule.end = moment.unix(schedule.end).toISOString(true);
                schedule.schedule = this;
                if (schedules.length < maximum) {
                    schedules.push(schedule);
                } else {
                    maximumReached = true;
                }
            };
            if (this.repeat === null) {
                add(this.id, this.name, this.start.unix(), this.duration);
            } else {
                let cronOptions = {
                    currentDate: window.start.toISOString(true),
                    endDate: window.end.toISOString(true),
                    iterator: true,
                    tz: timezone
                };
                let cron = CronParser.parseExpression(this.repeat, cronOptions);
                try {
                    let occurence;
                    do {
                        occurence = cron.next();
                        add(this.id, this.name, occurence.value._date.unix(), this.duration);
                    } while (!occurence.done && !maximumReached);
                } catch (error) {
                    if (!`${error}`.contains('Out of the timespan range')) {
                        Logger.error(`Error parsing/processing cron: ${error}`);
                    }
                }
            }
        }
        return [schedules, maximumReached];
    }

    async delete() {
        return this.api.removeSchedule(this.id);
    }
}
