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
import {inject, customElement, bindable} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import moment from "moment";
import Shared from "../../components/shared";
import TuiCalendar from "tui-calendar";

@customElement('calendar')
@inject(Element, EventAggregator, I18N)
export class Calendar {
    @bindable collectSchedules;

    constructor(element, ea, i18n) {
        this.element = element;
        this.ea = ea;
        this.i18n = i18n;
        this.shared = Shared;
        this.days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        this.calendarContainer = undefined;
        this.calendar = undefined;
        this.view = undefined;
        this.translationSubscription = undefined;

        this.translationSubscription = this.ea.subscribe('i18n:locale:changed', () => {
            this.refresh();
        });
    }

    bind() {
        this.calendarContainer = this.element.querySelector('[data-calendar="calendar"]');
        this.create();
    }

    create() {
        this.calendar = new TuiCalendar(this.calendarContainer, {
            defaultView: 'month',
            taskView: false,
            scheduleView: true,
            useCreationPopup: false,
            useDetailPopup: false,
            disableDblClick: true,
            calendars: [
                {
                    id: '1',
                    name: 'OpenMotics',
                    color: '#ffffff',
                    bgColor: '#00a65a',
                    dragBgColor: '#008d4c',
                    borderColor: '#008d4c'
                }
            ],
            month: {
                daynames: this.days.map(d => this.i18n.tr('generic.days.short.' + d)),
                startDayOfWeek: 1,
                isAlways6Week: false
            },
            week: {
                daynames: this.days.map(d => this.i18n.tr('generic.days.short.' + d)),
                startDayOfWeek: 1
            },
            template: {
                allday: (schedule) => { return this.templateTitle(schedule); },
                time: (schedule) => { return this.templateTitle(schedule); }
            }
        });
        this.calendar.setTheme({
            'common.holiday.color': '#333',
            'common.saturday.color': '#333',
            'common.dayname.color': '#333',
            'common.today.color': '#333',
        });
        this.calendar.on({
            'clickSchedule': (event) => {
                let schedule = event.schedule;
                event.guide.clearGuideElement();
            },
            'beforeCreateSchedule': (event) => {
                event.guide.clearGuideElement();
            },
            'beforeUpdateSchedule': function(e) {
                event.guide.clearGuideElement();
            },
            'beforeDeleteSchedule': function(e) {
                event.guide.clearGuideElement();
            }
        });
    }

    templateTitle(schedule) {
        let icons = [];
        if (schedule.raw.repeat !== null) {
            icons.push(`<i class="fa">${this.i18n.tr('icons.repeat')}</i>`);
        }
        if (schedule.raw.scheduleType === 'BASIC_ACTION') {
            icons.push(`<i class="fa">${this.i18n.tr('icons.basicaction')}</i>`);
        } else if (schedule.raw.scheduleType === 'GROUP_ACTION') {
            icons.push(`<i class="fa">${this.i18n.tr('icons.groupaction')}</i>`);
        }
        return [...icons, schedule.title].join(' &nbsp;');
    }

    parseSchedules(rawSchedules) {
        let schedules = [];
        if (this.view === 'month' || this.view === 'week') {
            let map = new Map();
            for (let schedule of rawSchedules) {
                if (!map.has(schedule.id)) {
                    map.set(schedule.id, new Map());
                }
                let scheduleMap = map.get(schedule.id);
                let dayBlock = moment(schedule.start).startOf('day').unix();
                let hourBlock = moment(schedule.start).startOf('hour').unix();
                if (!scheduleMap.has(dayBlock)) {
                    scheduleMap.set(dayBlock, {schedule: undefined, count: 0, hour: new Map()})
                }
                let day = scheduleMap.get(dayBlock);
                day.count += 1;
                day.schedule = schedule;
                if (!day.hour.has(hourBlock)) {
                    schedule.count = 1;
                    day.hour.set(hourBlock, schedule);
                } else {
                    day.hour.get(hourBlock).count += 1;
                }
                schedule.id = schedule.start;
            }
            for (let scheduleInfo of map.values()) {
                for (let dayInfo of scheduleInfo.values()) {
                    if (this.view === 'month') {
                        if (dayInfo.count > 1) {
                            dayInfo.schedule.allDay = true;
                            delete dayInfo.schedule.end;
                            dayInfo.schedule.title = `${dayInfo.schedule.title} (${dayInfo.count} occurences)`;
                        }
                        schedules.push(dayInfo.schedule);
                    } else {
                        if (dayInfo.count > 24) {
                            dayInfo.schedule.allDay = true;
                            delete dayInfo.schedule.end;
                            dayInfo.schedule.title = `${dayInfo.schedule.title} (${dayInfo.count} occurences)`;
                            schedules.push(dayInfo.schedule);
                        } else {
                            for (let schedule of dayInfo.hour.values()) {
                                if (schedule.count > 1) {
                                    schedule.title = `${schedule.title} (${schedule.count} occurences)`;
                                }
                                schedules.push(schedule);
                            }
                        }
                    }
                }
            }
        } else {
            schedules.push(...rawSchedules);
        }
        return schedules.map(r => {
            return {
                id: r.id,
                calendarId: '1',
                title: r.title,
                isAllDay: r.allDay,
                category: r.allDay ? 'allday' : 'time',
                dueDateClass: '',
                start: r.start,
                end: r.end,
                isReadOnly: true,
                raw: r.schedule,
                color: '#ffffff',
                bgColor: '#00a65a',
                dragBgColor: '#008d4c',
                borderColor: '#008d4c'
            };
        });
    }

    today() {
        this.calendar.today();
        return this.refresh();
    }

    next() {
        this.calendar.next();
        return this.refresh();
    }

    previous() {
        this.calendar.prev();
        return this.refresh();
    }

    changeView(view) {
        this.view = view;
        this.calendar.changeView(view);
        return this.refresh();
    }

    refresh() {
        let start = moment.unix(this.calendar.getDateRangeStart() / 1000);
        let end = moment.unix(this.calendar.getDateRangeEnd() / 1000);
        if (start.unix() === end.unix()) {
            start = start.startOf('day');
            end = end.endOf('day');
        }
        let rawSchedules = this.collectSchedules({start, end});
        let parsedSchedules = this.parseSchedules(rawSchedules);
        this.calendar.clear();
        this.calendar.createSchedules(parsedSchedules, true);
        this.calendar.render();
        return [start.toDate(), end.toDate()];
    }

    destroy() {
        this.calendar.destroy();
        this.translationSubscription.dispose();
    }

    unbind() {
        this.destroy();
    }
}
