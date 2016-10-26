import {inject, customElement, bindable, bindingMode, noView} from "aurelia-framework";
import * as noUiSlider from "nouislider";
import "nouislider/distribute/nouislider.css";
import Shared from "../../components/shared";
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
@noView()
@customElement('schedule')
@inject(Element)
export class Schedule {
    constructor(element) {
        this.element = element;
        this.i18n = Shared.get('i18n');
        this.busy = false;

        this.slider = document.createElement('div');
        this.element.appendChild(this.slider);
    }

    bind() {
        let start = [
            this.schedule.day1Start,
            this.schedule.day1End,
            this.schedule.day2Start,
            this.schedule.day2End
        ];
        let formatter = {
            to: Toolbox.minutesToString,
            from: Toolbox.parseTime
        };
        noUiSlider.create(this.slider, {
            start: start,
            connect: [false, true, false, true, false],
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
                this.schedule.day1Start = parseInt(values[0]);
                this.schedule.day1End = parseInt(values[1]);
                this.schedule.day2Start = parseInt(values[2]);
                this.schedule.day2End = parseInt(values[3]);
            }
        });
        this.slider.noUiSlider.on('start', () => {
            this.busy = true;
        });
        this.slider.noUiSlider.on('end', () => {
            this.busy = false;
        });
        this.statusChanged(this.status);
    }

    scheduleChanged(newSchedule) {
        if (this.busy === false) {
            this.slider.noUiSlider.set([
                newSchedule.day1Start,
                newSchedule.day1End,
                newSchedule.day2Start,
                newSchedule.day2End
            ]);
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
        this.slider.noUiSlider.off();
        this.slider.noUiSlider.destroy();
    }
}
