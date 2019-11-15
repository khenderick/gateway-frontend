import moment from 'moment';
import { I18N } from 'aurelia-i18n';
import { bindable, bindingMode, customElement, inject } from 'aurelia-framework';

@inject(I18N)
@customElement('timepicker')
export class TimePicker {
  @bindable onArrowClick;
  @bindable onPeriodClick;
  @bindable({ defaultBindingMode: bindingMode.twoWay }) start = '';
  @bindable({ defaultBindingMode: bindingMode.twoWay }) end = '';
  @bindable({ defaultBindingMode: bindingMode.twoWay }) period = 'Day'; // Day, Week, Month, Year

  DAY_SECONDS_VALUE = 86400;
  WEEK_SECONDS_VALUE = 604800;

  constructor(i18n) {
    this.i18n = i18n;
    this.date = '';
    this.rangeParams = {
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
    console.log(this);

  }

  handleArrowPress = (isRight = false) => {
    console.log(this);
    debugger;
    const { start, end, resolution, period } = this;
    const newParams = { start, end, resolution };
    const factor = isRight ? 1 : -1;
    switch (period) {
      case 'Day': {
        newParams.end += this.DAY_SECONDS_VALUE * factor;
        newParams.start += this.DAY_SECONDS_VALUE * factor;
        break;
      }
      case 'Week': {
        newParams.end += this.WEEK_SECONDS_VALUE * factor;
        newParams.start += this.WEEK_SECONDS_VALUE * factor;
        break;
      }
      case 'Month': {
        newParams.end = moment.utc(newParams.end * 1000).add(factor, 'month').unix();
        newParams.start = moment.utc(newParams.start * 1000).add(factor, 'month').unix();
        break;
      }
      case 'Year': {
        newParams.end = moment.utc(newParams.end * 1000).add(factor, 'year').unix();
        newParams.start = moment.utc(newParams.start * 1000).add(factor, 'year').unix();
        break;
      }
    }
    this.onArrowClick({ newParams });
  }

  handlePeriodClick = (period) => this.onPeriodClick({ period, ...this.rangeParams[period.toLowerCase()] });

}

