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
import {Toolbox} from "../../components/toolbox";
import $ from "jquery";
import "fullcalendar";
import "fullcalendar/dist/locale-all";

@customElement('calendar')
@inject(Element, EventAggregator, I18N)
export class Calendar {
    @bindable loadEvents;
    @bindable timezone;

    constructor(element, ea, i18n) {
        this.element = element;
        this.ea = ea;
        this.i18n = i18n;
        this.shared = Shared;
        this.calendar = undefined;
        this.translationSubscription = undefined;

        this.translationSubscription = this.ea.subscribe('i18n:locale:changed', (locale) => {
            this.calendar.fullCalendar('option', 'locale', locale.newValue);
        });
    }

    bind() {
        this.calendar = $(this.element.querySelector('[data-calendar="calendar"]'));
        this.create();
    }

    create() {
        this.calendar.fullCalendar({
            timezone: this.timezone,
            locale: this.shared.locale,
            weekNumberCalculation: 'ISO',
            weekNumbersWithinDays: true,
            header: {
                left: 'today,prev,next',
                center: 'title',
                right: ['xs', 'sm'].contains(Toolbox.getDeviceViewport()) ? 'listWeek' : 'month,agendaWeek'
            },
            views: {
                month: {
                    timeFormat: 'H:mm'
                },
                week: {
                    timeFormat: 'H:mm',
                    slotLabelFormat: 'H:mm',
                    columnHeaderFormat: 'ddd D/M'
                }
            },
            lazyFetching: false,
            eventLimit: 3,
            agendaEventMinHeight: 17,
            timeFormat: 'H:mm',
            themeSystem: 'bootstrap3',
            aspectRatio: 2.5,
            selectable: true,
            selectHelper: true,
            navLinks: true,
            navLinkDayClick: (date) => {
                this.calendar.fullCalendar('changeView', 'agendaWeek', date);
            },
            windowResize: (view) => {
                if (['xs', 'sm'].contains(Toolbox.getDeviceViewport())) {
                    if (['month', 'agendaWeek'].contains(view.name)) {
                        this.calendar.fullCalendar('changeView', 'listWeek');
                        this.calendar.fullCalendar('option', 'header', {
                            left: 'today,prev,next',
                            center: 'title',
                            right: 'listWeek'
                        });
                    }
                } else {
                    if (view.name === 'listWeek') {
                        this.calendar.fullCalendar('changeView', 'month');
                        this.calendar.fullCalendar('option', 'header', {
                            left: 'today,prev,next',
                            center: 'title',
                            right: 'month,agendaWeek'
                        })
                    }
                }
                this.refetchEvents();
                this.render();
            },
            events: (start, end, timezone, callback) => {
                let events = this.loadEvents({start, end, timezone: this.timezone});
                let view = this.calendar.fullCalendar('getView').name;
                let filteredEvents = [];
                if (view === 'month' || view === 'agendaWeek') {
                    let map = new Map();
                    for (let event of events) {
                        if (!map.has(event.id)) {
                            map.set(event.id, new Map());
                        }
                        let eventMap = map.get(event.id);
                        let dayBlock = moment(event.start).startOf('day').unix();
                        let hourBlock = moment(event.start).startOf('hour').unix();
                        if (!eventMap.has(dayBlock)) {
                            eventMap.set(dayBlock, {event: undefined, count: 0, hour: new Map()})
                        }
                        let day = eventMap.get(dayBlock);
                        day.count += 1;
                        day.event = event;
                        if (!day.hour.has(hourBlock)) {
                            event.count = 1;
                            day.hour.set(hourBlock, event);
                        } else {
                            day.hour.get(hourBlock).count += 1;
                        }
                    }
                    for (let eventInfo of map.values()) {
                        for (let dayInfo of eventInfo.values()) {
                            if (view === 'month') {
                                if (dayInfo.count > 1) {
                                    dayInfo.event.allDay = true;
                                    delete dayInfo.event.end;
                                    dayInfo.event.title = `${dayInfo.event.title} (${dayInfo.count} occurences)`;
                                }
                                filteredEvents.push(dayInfo.event);
                            } else {
                                if (dayInfo.count > 24) {
                                    dayInfo.event.allDay = true;
                                    delete dayInfo.event.end;
                                    dayInfo.event.title = `${dayInfo.event.title} (${dayInfo.count} occurences)`;
                                    filteredEvents.push(dayInfo.event);
                                } else {
                                    for (let event of dayInfo.hour.values()) {
                                        if (event.count > 1) {
                                            event.title = `${event.title} (${event.count} occurences)`;
                                        }
                                        filteredEvents.push(event);
                                    }
                                }
                            }
                        }
                    }
                } else {
                    filteredEvents.push(...events);
                }
                callback(filteredEvents);
            }
        });
        setTimeout(() => { this.render(); }, 100);
    }

    timezoneChanged(timezone) {
        this.calendar.fullCalendar('option', 'timezone', timezone);
    }

    render() {
        this.calendar.fullCalendar('render');
    }

    refetchEvents() {
        this.calendar.fullCalendar('refetchEvents');
    }

    destroy() {
        this.calendar.fullCalendar('destroy');
    }

    unbind() {
        this.destroy();
    }
}
