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
import { bindable, bindingMode } from 'aurelia-framework';
import { isEqual } from 'lodash';
import { Base } from 'resources/base';
import { Refresher } from 'components/refresher';
import { Logger } from 'components/logger';

@bindable({
    name: 'pickerFrom',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'pickerTo',
    defaultBindingMode: bindingMode.twoWay,
})
export class History extends Base {
    constructor(...rest) {
        super(...rest);
        this.refresher = new Refresher(() => this.getData(), 15000);
        this.data = undefined;
        this.options = {};
        this.measurements = {};
        this.pickerOptions = {
            format: 'YYYY-MM-DD'
        };
        this.unit = '';
        this.resolution = 'D',
            this.start = moment.utc().startOf('week').add(1, 'days').unix();
        this.end = moment.utc().startOf('week').add(1, 'days').add(1, 'week').unix();
    }

    async getData() {
        try {
            const filter = { label_type: ['GRID'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            const [total] = data;
            if (!total) {
                throw new Error('Total data is empty');
            }
            const { start, end, resolution } = this;
            const history = {
                start,
                end,
                resolution,
                delta: true,
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

                const { labels, values } = Object.keys(measurements)
                    .reduce((previousValue, time) => ({
                        labels: [
                            ...previousValue.labels,
                            moment(Number(time) * 1000).utc().format('DD'),
                        ],
                        values: [...previousValue.values, measurements[time]],
                    }), { labels: [], values: [] });
                this.drawChart(labels, values, unit);
            }
        } catch (error) {
            Logger.error(`Could not load History: ${error.message}`);
        }
    }

    drawChart(labels, values, unit, index = -1) {
        const backgroundColor = new Array(labels.length).fill('#e0cc5d');
        if (index !== -1) {
            backgroundColor[index] = '#ffd800';
        }
        this.data = {
            labels,
            datasets: [{
                backgroundColor,
                label: 'Energy',
                data: values,
                borderWidth: 1,
            }],
        };
        this.options = {
            tooltips: {
                callbacks: { label: this.tooltipLabel },
            },
            onClick: (event, [context]) => {
                if (!context) return;
                const { _index: index, _model: { label } } = context;
                this.selectedBar = { index, label };
                this.drawChart(labels, values, unit, context._index);
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

    tooltipLabel(tooltipItem, data) {
        let label = data.datasets[tooltipItem.datasetIndex].label || '';

        if (label) {
            label += ': ';
        }
        label += Math.round(tooltipItem.yLabel * 100) / 100;
        return `${label} ${this.unit || 'Wh'}`;
    }

    pickerFromChanged() {
        this.pickerFrom.methods.defaultDate(moment.utc().startOf('week').add(1, 'days'))
        this.pickerFrom.events.onChange = (e) => {
            this.start = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
            this.getData();
        };
    }

    pickerToChanged() {
        this.pickerTo.methods.defaultDate(moment.utc().startOf('week').add(1, 'days').add(1, 'week'))
        this.pickerTo.methods.maxDate(moment.utc());
        this.pickerTo.events.onChange = (e) => {
            this.end = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
            this.getData();
        };
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
