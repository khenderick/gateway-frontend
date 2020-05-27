/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Container, computedFrom} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {Toolbox} from '../../components/toolbox';

export class ThermostatSchedule {
    constructor(schedule, timeBased) {
        this.i18n = Container.instance.get(I18N);
        this.timeBased = timeBased;
        this.nightTemperature = undefined;
        this.day1Temperature = undefined;
        this.day2Temperature = undefined;
        this.day1Start = undefined;
        this.day1End = undefined;
        this.day2Start = undefined;
        this.day2End = undefined;
        if (schedule !== undefined) {
            this.load(schedule);
        }
        this.systemSchedule = [
            this.nightTemperature,
            Toolbox.minutesToString(this.day1Start),
            Toolbox.minutesToString(this.day1End),
            this.day1Temperature,
            Toolbox.minutesToString(this.day2Start),
            Toolbox.minutesToString(this.day2End),
            this.day2Temperature
        ];
    }

    load(schedule) {
        // [temp_n(Temp), start_d1(Time), stop_d1(Time), temp_d1(Temp), start_d2(Time), stop_d2(Time), temp_d2(Temp)]
        this.nightTemperature = schedule[0];
        this.day1Start = Toolbox.parseTime(schedule[1], '8:00');
        this.day1End = Toolbox.parseTime(schedule[2], '10:00');
        this.day1Temperature = schedule[3];
        this.day2Start = Toolbox.parseTime(schedule[4], '16:00');
        this.day2End = Toolbox.parseTime(schedule[5], '20:00');
        this.day2Temperature = schedule[6];
        this.ensureValidity();
    }

    ensureValidity() {
        // Normal schedule temperature range is considered to be between 15 (6 for cooling) and 25 degrees
        if (this.nightTemperature === null) {
            this.nightTemperature = 16;
        }
        if (this.day1Temperature === null) {
            this.day1Temperature = 20;
        }
        if (this.day2Temperature === null) {
            this.day2Temperature = 20;
        }
        // Make sure the times are at least sorted correctly
        let times = [this.day1Start, this.day1End, this.day2Start, this.day2End];
        times.sort((a, b) => {
            return a - b;
        });
        this.day1Start = times[0];
        this.day1End = times[1];
        this.day2Start = times[2];
        this.day2End = times[3];
    }

    @computedFrom('day1Temperature', 'day2Temperature', 'nightTemperature')
    get days() {
        let count = 0;
        if (this.day1Temperature !== this.nightTemperature) {
            count++;
        }
        if (this.day2Temperature !== this.nightTemperature) {
            count++;
        }
        return count;
    }

    @computedFrom(
        'day1Temperature', 'day2Temperature', 'nightTemperature',
        'day1Start', 'day1End', 'day2Start', 'day2End'
    )
    get singleDayInfo() {
        if (this.day1Temperature !== this.nightTemperature) {
            return {
                dayStart: this.day1Start,
                dayEnd: this.day1End,
                dayTemperature: this.day1Temperature
            };
        }
        return {
            dayStart: this.day2Start,
            dayEnd: this.day2End,
            dayTemperature: this.day2Temperature
        };
    }

    set singleDayInfo(info) {
        if (this.day1Temperature !== this.nightTemperature) {
            this.day1Start = info.dayStart;
            this.day1End = info.dayEnd;
            this.day1Temperature = info.dayTemperature;
        } else {
            this.day2Start = info.dayStart;
            this.day2End = info.dayEnd;
            this.day2Temperature = info.dayTemperature;
        }
    }

    @computedFrom(
        'timeBased', 'days',
        'nightTemperature', 'dayTemperature', 'day1Temperature', 'day2Temperature',
        'singleDayInfo', 'singleDayInfo.dayStart', 'singleDayInfo.dayEnd',
        'day1Start', 'day1End', 'day2Start', 'day2End', 'dayStart', 'dayEnd'
    )
    get scheduleInfo() {
        if (this.timeBased) {
            if (this.days === 0) {
                return this.i18n.tr('generic.scheduleinfo.simple.inactive');
            }
            if (this.days === 1) {
                return this.i18n.tr('generic.scheduleinfo.simple.one', {
                    daystart: Toolbox.minutesToString(this.singleDayInfo.dayStart),
                    dayend: Toolbox.minutesToString(this.singleDayInfo.dayEnd),
                })
            }
            return this.i18n.tr('generic.scheduleinfo.simple.two', {
                day1start: Toolbox.minutesToString(this.day1Start),
                day1end: Toolbox.minutesToString(this.day1End),
                day2start: Toolbox.minutesToString(this.day2Start),
                day2end: Toolbox.minutesToString(this.day2End)
            });
        }
        if (this.days === 0) {
            return this.i18n.tr('generic.scheduleinfo.normal.inactive', {
                nighttemp: this.nightTemperature,
                interpolation: {escape: false}
            });
        }
        if (this.days === 1) {
            return this.i18n.tr('generic.scheduleinfo.normal.one', {
                daytemp: this.singleDayInfo.dayTemperature,
                daystart: Toolbox.minutesToString(this.singleDayInfo.dayStart),
                dayend: Toolbox.minutesToString(this.singleDayInfo.dayEnd),
                nighttemp: this.nightTemperature,
                interpolation: {escape: false}
            })
        }
        return this.i18n.tr('generic.scheduleinfo.normal.two', {
            day1temp: this.day1Temperature,
            day1start: Toolbox.minutesToString(this.day1Start),
            day1end: Toolbox.minutesToString(this.day1End),
            day2temp: this.day2Temperature,
            day2start: Toolbox.minutesToString(this.day2Start),
            day2end: Toolbox.minutesToString(this.day2End),
            nighttemp: this.nightTemperature,
            interpolation: {escape: false}
        });
    }
}
