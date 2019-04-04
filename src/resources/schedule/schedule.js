/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import {inject, customElement, bindable, bindingMode} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import * as noUiSlider from "nouislider";
import {Toolbox} from "../../components/toolbox";

@bindable({
    name: 'schedule',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'status',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: true
})
@bindable({
    name: 'options'
})
@customElement('schedule')
@inject(Element, I18N)
export class Schedule {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
        this.busy = false;
        this.slider = undefined;
    }

    bind() {
        this.slider = this.element.querySelector('[data-slider="slider"]');
        this.create(this.schedule);
        this.statusChanged(this.status);
    }

    create(schedule) {
        let connect = false;
        let start = 0;
        if (schedule.days === 1) {
            start = [
                schedule.singleDayInfo.dayStart,
                schedule.singleDayInfo.dayEnd
            ];
            connect = [false, true, false];
        } else if (schedule.days === 2) {
            start = [
                schedule.day1Start,
                schedule.day1End,
                schedule.day2Start,
                schedule.day2End
            ];
            connect = [false, true, false, true, false];
        }
        let formatter = {
            to: Toolbox.minutesToString,
            from: Toolbox.parseTime
        };
        noUiSlider.create(this.slider, {
            start: start,
            connect: connect,
            step: 10,
            behaviour: 'tap-drag',
            range: {
                min: 0,
                max: 1440
            },
            pips: {
                mode: 'steps',
                density: 2,
                filter: (value) => {
                    return value % 60 === 0 ? 1 : 0;
                },
                format: formatter
            }
        });
        this.slider.noUiSlider.on('change', () => {
            if (this.busy === true) {
                let values = this.slider.noUiSlider.get();
                if (schedule.days === 1) {
                    schedule.singleDayInfo = {
                        dayStart: parseInt(values[0]),
                        dayEnd: parseInt(values[1]),
                        dayTemperature: schedule.singleDayInfo.dayTemperature
                    };
                } else if (schedule.days === 2) {
                    schedule.day1Start = parseInt(values[0]);
                    schedule.day1End = parseInt(values[1]);
                    schedule.day2Start = parseInt(values[2]);
                    schedule.day2End = parseInt(values[3]);
                }
            }
        });
        this.slider.noUiSlider.on('start', () => {
            this.busy = true;
        });
        this.slider.noUiSlider.on('end', () => {
            this.busy = false;
        });
        for (let connector of this.slider.querySelectorAll('.noUi-connect')) {
            connector.classList.add('active');
        }
    }

    destroy() {
        this.slider.noUiSlider.off();
        this.slider.noUiSlider.destroy();
    }

    scheduleChanged(newSchedule) {
        if (this.busy === false) {
            this.destroy();
            this.create(newSchedule);
        }
    }

    statusChanged(newStatus) {
        if (newStatus) {
            this.slider.removeAttribute('disabled');
        } else {
            this.slider.setAttribute('disabled', true);
        }
    }

    unbind() {
        this.destroy();
    }
}
