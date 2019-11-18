import moment from 'moment';
import { I18N } from 'aurelia-i18n';
import { bindable, bindingMode, computedFrom, customElement, inject } from 'aurelia-framework';

@inject(Element, I18N)
@customElement('timepicker')
export class TimePicker {
    @bindable({ defaultBindingMode: bindingMode.twoWay }) start;
    @bindable({ defaultBindingMode: bindingMode.twoWay }) end;
    @bindable({ defaultBindingMode: bindingMode.twoWay }) resolution = 'h';
    @bindable({ defaultBindingMode: bindingMode.twoWay }) activeperiod = 'Day';
    @bindable periods = []; // Day, Week, Month, Year

    DAY_SECONDS_VALUE = 86400;
    WEEK_SECONDS_VALUE = 604800;
    rangeParams = {
        day: {
            start: moment.utc().startOf('day').unix(),
            end: moment.utc().add(1, 'days').startOf('day').unix(),
            resolution: 'h',
        },
        week: {
            start: moment.utc().startOf('week').add(1, 'days').unix(),
            end: moment.utc().startOf('week').add(1, 'days').add(1, 'week').unix(),
            resolution: 'D',
        },
        month: {
            start: moment.utc().startOf('month').unix(),
            end: moment.utc().startOf('month').add(1, 'month').unix(),
            resolution: 'D',
        },
        year: {
            start: moment.utc().startOf('year').unix(),
            end: moment.utc().startOf('year').add(1, 'year').unix(),
            resolution: 'M',
        },
    };

    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
    }

    handleArrowPress = (isRight = false) => {
        const { activeperiod: activePeriod } = this;

        const factor = isRight ? 1 : -1;
        switch (activePeriod) {
            case 'Day': {
                this.end += this.DAY_SECONDS_VALUE * factor;
                this.start += this.DAY_SECONDS_VALUE * factor;
                break;
            }
            case 'Week': {
                this.end += this.WEEK_SECONDS_VALUE * factor;
                this.start += this.WEEK_SECONDS_VALUE * factor;
                break;
            }
            case 'Month': {
                this.end = moment.utc(this.end * 1000).add(factor, 'month').unix();
                this.start = moment.utc(this.start * 1000).add(factor, 'month').unix();
                break;
            }
            case 'Year': {
                this.end = moment.utc(this.end * 1000).add(factor, 'year').unix();
                this.start = moment.utc(this.start * 1000).add(factor, 'year').unix();
                break;
            }
        }
        this.resolution = this.rangeParams[activePeriod.toLowerCase()].resolution;

        const e = new CustomEvent('change', { bubbles: true });
        this.element.dispatchEvent(e);
    }

    @computedFrom('start', 'end', 'activePeriod')
    get isDisabledNextStep() {
        return moment().unix() < moment.utc(this.start * 1000).add(1, this.activeperiod.toLowerCase()).unix();
    }

    @computedFrom('start', 'end', 'activePeriod')
    get renderDate() {
        const { start, end, activeperiod: activePeriod } = this;
        const currentDate = moment();
        const startDate = moment(start * 1000);

        if (activePeriod === 'Day') {
            return startDate.format('MM-DD-YYYY') === moment().format('MM-DD-YYYY')
                ? this.i18n.tr('generic.today')
                : startDate.format('MMMM Do, YYYY');
        }
        if (activePeriod === 'Week') {
            const startDay = startDate.date();
            const endDay = moment(end * 1000).date() - 1;
            return startDate.year() === currentDate.year() && startDate.week() === currentDate.week()
                ? this.i18n.tr('generic.thisweek')
                : `${startDay}-${endDay} ${startDate.format('MMMM, YYYY')}`;
        }
        if (activePeriod === 'Month') {
            return startDate.format('MMMM, YYYY');
        }
        return startDate.year();
    }

    handlePeriodClick = (activePeriod) => {
        const { start, end, resolution } = this.rangeParams[activePeriod.toLowerCase()];
        this.start = start;
        this.end = end;
        this.activeperiod = activePeriod;
        this.resolution = resolution;
        const e = new CustomEvent('change', { bubbles: true });
        this.element.dispatchEvent(e);
    }
}
