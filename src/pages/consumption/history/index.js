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
    defaultBindingMode: bindingMode.twoWay,
})
export class History extends Base {
    constructor(...rest) {
        super(...rest);
        this.refresher = new Refresher(() => this.getData(), 15000);
        this.data = undefined;
        this.summaryenergy = null;
        this.period = 'Day';
        this.detailData = undefined;
        this.detailGraphLoading = false;
        this.options = {};
        this.detailOptions = {};
        this.measurements = {};
        this.gridData = [];
        this.pickerOptions = {
            format: 'YYYY-MM-DD'
        };
        this.startFormat = moment.utc().startOf('week').add(1, 'days').format('YYYY-MM-DD');
        this.endFormat = moment.utc().startOf('week').add(1, 'days').add(1, 'week').format('YYYY-MM-DD');
        this.unit = '';
        this.shared = Shared;
        this.resolution = 'D',
        this.pickerOptions = { format: 'YYYY-MM-DD' };
        this.start = moment.utc().startOf('week').add(1, 'days').unix();
        this.end = moment.utc().startOf('week').add(1, 'days').add(1, 'week').unix();
    }

    @computedFrom('start', 'end')
    get exportLink() {
        return this.start && this.end;
    }

    @computedFrom('gridData')
    get consumptionData() {
        return this.gridData.map(({ data, name }) =>
            data.map(({ consumption_type, total: { value, unit } }) => ({
                name,
                type: consumption_type,
                text: Number.isInteger(value) && unit ? `${value} ${unit}` : this.i18n.t('pages.consumption.history.none').toLowerCase(),
            }))
        ).filter(arr => arr.length).flat();
    }

    async getData() {
        try {
            const filter = { label_type: ['GRID'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            const [total] = data;
            this.gridData = data;
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
                this.drawChart();
            }
        } catch (error) {
            Logger.error(`Could not load History: ${error.message}`);
        }
    }

    drawChart(index = -1) {
        const { labels, values } = Object.keys(this.measurements)
        .reduce((previousValue, time) => ({
            labels: [
                ...previousValue.labels,
                moment(Number(time) * 1000).utc().format('DD'),
            ],
            values: [...previousValue.values, this.measurements[time]],
        }), { labels: [], values: [] });
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
            legend: {
                display: false
            },
            tooltips: {
                callbacks: { label: this.tooltipLabel },
            },
            onClick: (event, [context]) => {
                if (!context) return;
                const { _index: index, _model: { label } } = context;
                this.selectedBar = { index, label };
                this.drawChart(context._index);
                this.drawDetailChart();
            },
            scales: {
                yAxes: [{
                    ticks: {
                        callback: (value, index, values) => `${value} ${this.unit}`,
                    }
                }]
            }
        };
    }

    async drawDetailChart() {
        try {
            this.detailGraphLoading = true;
            const start = Number(Object.keys(this.measurements)[this.selectedBar.index]);
            const total = this.measurements[start];
            const end = start + 86400;
            const filter = { label_type: ['CUSTOM'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            const { resolution } = this;
            const calls = [];
            data.forEach(({ label_id }) => {
                const history = {
                    start,
                    end,
                    resolution,
                    delta: true,
                    labelId: label_id,
                };
                calls.push(this.api.getHistory(history));
            });
            const consumptionByDate = await Promise.all(calls);
            const totalIndex = consumptionByDate.findIndex(({ data: { name } }) => name === 'Total');
            if (totalIndex !== -1) {
                consumptionByDate[totalIndex].data.data[0].measurements.data[start] = total;
            }
            consumptionByDate.sort(({ data: { data: data1 }}, { data: { data: data2 }}) => (
                data2[0].measurements.data[start] - data1[0].measurements.data[start]
            ));
            const { labels, values } = consumptionByDate.reduce((previousValue, { data: { data, name: label } }) => ({
                labels: [...previousValue.labels, label],
                values: [
                    ...previousValue.values,
                    label === 'Total' ? total : data[0].measurements.data[Object.keys(data[0].measurements.data)[0]]
                ],
            }), { labels: [], values: [] })
            this.detailOptions = {
                legend: {
                    display: false
                },
                tooltips: {
                    callbacks: { label: this.tooltipLabel },
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            callback: (value, index, values) => `${value} ${this.unit}`,
                        }
                    }]
                }
            }
            this.detailData = {
                labels,
                datasets: [{
                    backgroundColor: '#e0cc5d',
                    label: '',
                    data: values,
                    borderWidth: 1,
                }],
            };
            this.detailGraphLoading = false;
        } catch (error) {
            this.detailGraphLoading = false;
            Logger.error(`Could not load History: ${error.message}`);
        }
    }

    tooltipLabel(tooltipItem, data) {
        let { label = '', _meta } = data.datasets[tooltipItem.datasetIndex];
        if (label) {
            label += ': ';
        }
        label += Math.round(tooltipItem[_meta[0] ? 'yLabel' : 'xLabel'] * 100) / 100;
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

    pickerFromChanged() {
        this.pickerFrom.methods.defaultDate(moment.utc().startOf('week').add(1, 'days'))
        this.pickerFrom.events.onChange = (e) => {
            this.start = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
            this.startFormat = moment(e.date).format('YYYY-MM-DD');
            this.getData();
        };
    }

    pickerToChanged() {
        this.pickerTo.methods.defaultDate(moment.utc().startOf('week').add(1, 'days').add(1, 'week'))
        this.pickerTo.methods.maxDate(moment.utc());
        this.pickerTo.events.onChange = (e) => {
            this.end = moment.utc(moment(e.date).format('YYYY-MM-DD')).unix();
            this.endFormat = moment(e.date).format('YYYY-MM-DD');
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
