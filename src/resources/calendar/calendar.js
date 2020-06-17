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
import {inject, customElement, bindable} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {EventAggregator} from 'aurelia-event-aggregator';
import moment from 'moment';
import Shared from '../../components/shared';
import TuiCalendar from 'tui-calendar';

@bindable({ name: 'collectSchedules' })
@bindable({ name: 'editSchedule' })
@customElement('calendar')
@inject(Element, EventAggregator, I18N)
export class Calendar {

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
                this.editSchedule({id: event.schedule.raw.id});
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
        return rawSchedules.map(r => {
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
        let start = moment.unix(this.calendar.getDateRangeStart() / 1000).startOf('day');
        let end = moment.unix(this.calendar.getDateRangeEnd() / 1000).endOf('day');
        let rawSchedules = this.collectSchedules({ start, end });
        let parsedSchedules = this.parseSchedules(rawSchedules);
        this.calendar.clear();
        this.calendar.createSchedules(parsedSchedules, true);
        this.calendar.render();
        return [start, end];
    }

    destroy() {
        this.calendar.destroy();
        this.translationSubscription.dispose();
    }

    unbind() {
        this.destroy();
    }
}
