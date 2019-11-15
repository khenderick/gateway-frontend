/*
 * Copyright (C) 2019 OpenMotics BVBA
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
// import {inject, Factory} from 'aurelia-framework';
import moment from 'moment';
import { Base } from '../../resources/base';
import { Refresher } from '../../components/refresher';
import { Logger } from '../../components/logger';

// @inject(Factory.of(EnergyModule))
export class History extends Base {
    constructor(...rest) {
        super(...rest);
        this.labels = [];
        this.refresher = new Refresher(() => this.getData(), 5000);
        this.data = undefined;
    }

    async getData() {
        try {
            const filter = { label_type: ['GRID'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            const [total] = data;
            if (!total) {
                throw new Error('Total data is empty');
            }
            const history = {
                labelId: total.label_id,
                start: 1573689600,
                end: 1573775999,
                resolution: 'h',
            };
            const { data: historyData } = await this.api.getHistory(history);
            if (!historyData || !historyData.data.length) {
                throw new Error('Total data is empty');
            }
            const { measurements } = historyData.data[0];
            const { labels, values } = Object.keys(measurements.data)
                .reduce((previousValue, time) => ({
                    labels: [...previousValue.labels, moment(Number(time) * 1000).utc().format('HH')],
                    values: [...previousValue.values, measurements.data[time]],
                }), { labels: [], values: [] });
            this.data = {
                labels,
                datasets: [{
                    label: '',
                    data: values,
                    borderWidth: 1
                }]
            };
        } catch (error) {
            Logger.error(`Could not load History: ${error.message}`);
        }
    }

    dateChange(newParams) {
        console.log('data change! ', newParams);
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
