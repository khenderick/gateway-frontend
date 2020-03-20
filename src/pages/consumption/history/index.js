/*
 * Copyright (C) 2019 OpenMotics BV
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
import moment from 'moment';
import {bindable, bindingMode, computedFrom} from 'aurelia-framework';
import {isEqual} from 'lodash';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Logger} from 'components/logger';
import Shared from 'components/shared';

@bindable({
    name: 'pickerFrom',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'pickerTo',
    defaultBindingMode: bindingMode.twoWay
})
export class History extends Base {
    constructor(...rest) {
        super(...rest);
        this.labels = [];
        this.refresher = new Refresher(() => this.getData(), 15000);
        this.data = undefined;
        this.summaryenergy = null;
        this.period = 'Day';
        this.options = {};
        this.measurements = {};
        this.unit = '';
        this.periods = ['Day', 'Week', 'Month', 'Year'];
        this.resolution = 'h';
        this.exportDateFrom = '';
        this.exportDateTo = '';
        this.shared = Shared;
        this.pickerOptions = { format: 'YYYY-MM-DD' };
        this.start = moment.utc().startOf('day').unix();
        this.end = moment.utc().add(1, 'days').startOf('day').unix();
    }

    pickerFromChanged() {
        this.pickerFrom.events.onChange = (e) => {
            this.exportDateFrom = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
        };
    }

    pickerToChanged() {
        this.pickerTo.events.onChange = (e) => {
            this.exportDateTo = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
        };
    }

    @computedFrom('exportDateFrom', 'exportDateTo')
    get exportLink() {
        return this.exportDateFrom && this.exportDateTo;
    }

    async getData() {
        try {
            const filter = { label_type: ['GRID'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            const [total] = data;
            if (!total) {
                throw new Error('Total data is empty');
            }
            const { start, end, period, resolution } = this;
            const history = {
                start,
                end,
                resolution,
                labelId: total.label_id,
            };
            const { data: historyData } = await this.api.getHistory(history);
            if (!historyData || !historyData.data.length) {
                throw new Error('Total data is empty');
            }
            const { measurements: { data: measurements, unit } } = historyData.data[0];

            if (!isEqual(this.measurements, measurements)) {
                this.measurements = measurements;
                this.unit = unit;

                const dateFormat = {
                    day: 'HH',
                    week: 'dd',
                    month: 'DD',
                    year: 'MMM',
                };
                const { labels, values } = Object.keys(measurements)
                    .reduce((previousValue, time) => ({
                        labels: [
                            ...previousValue.labels,
                            moment(Number(time) * 1000).utc().format(dateFormat[period.toLowerCase()]).concat(period === 'Day' ? 'h' : ''),
                        ],
                        values: [...previousValue.values, measurements[time]],
                    }), { labels: [], values: [] });
                if (period === 'Day' || period === 'Week') {
                    labels.pop();
                    values.pop();
                }
                this.data = {
                    labels,
                    datasets: [{
                        label: 'Energy',
                        data: values,
                        backgroundColor: '#e0cc5d',
                        borderWidth: 1,
                    }],
                };
                this.options = {
                    tooltips: {
                        callbacks: { label: this.tooltipLabel },
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                callback: (value, index, values) => `${value} ${unit}`,
                            }
                        }]
                    }
                };
            }
        } catch (error) {
            Logger.error(`Could not load History: ${error.message}`);
        }
    }

    tooltipLabel(tooltipItem, data) {
        let label = data.datasets[tooltipItem.datasetIndex].label || '';

        if (label) {
            label += ': ';
        }
        label += Math.round(tooltipItem.yLabel * 100) / 100;
        return `${label} ${this.unit || 'Wh'}`;
    }

    async showSummary() {
        try {
            const { start, end } = this;
            const { msg } = await this.api.getExport({
                start,
                end,
                exportType: 'summary',
                type: 'txt',
                download: false,
            })
            this.summaryenergy = msg;
        } catch (error) {
            Logger.error(`Could not load Summary: ${error.message}`);
        }
    }
    async downloadAllHistory() {
        try {
            const { start, end } = this;
            const { msg } = await this.api.getExport({
                start,
                end,
                exportType: 'full',
                type: 'csv',
                download: true,
            });
            if (msg) {
                const a = document.createElement('a');
                a.id = 'export-data';
                a.href = `data:text/csv;charset=utf-8,${msg}`;
                a.setAttribute('download', `history_from_${this.start}_to_${this.end}.csv`);
                a.click();
                a.remove();
            }
        } catch (error) {
            Logger.error(`Could not load Summary: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    async activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
