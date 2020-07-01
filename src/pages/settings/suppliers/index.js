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
import {inject} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';

export class Suppliers extends Base {
    constructor(...props) {
        super(...props);
        this.suppliers = [];
        this.units = ['kWh', 'liter', 'm3', 'kg', 'ton'];
        this.newSupplier = {
            billing: {
                currency: 'USD',
                peak_price: 0,
                peak_times: {},
                double_tariff: false,
                // peak_times: {
                //     friday: { end_time: '22:00', start_time: '07:00' },
                //     monday: { end_time: '22:00', start_time: '07:00' },
                //     saturday: { end_time: '00:00', start_time: '00:00' },
                //     sunday: { end_time: '00:00', start_time: '00:00' },
                //     thursday: { end_time: '22:00', start_time: '07:00' },
                //     tuesday: { end_time: '22:00', start_time: '07:00' },
                //     wednesday: { end_time: '22:00', start_time: '07:00' },
                // },
            },
        };
        this.loadSuppliers();
    }

    async loadSuppliers() {
        try {
            const { data } = await this.api.getSuppliers();
            this.suppliers = data;
        } catch (error) {
            Logger.error(`Could not load Suppliers: ${error.message}`);
        }
    }

    getPricePerUnit = ({ billing: { base_price, peak_price }}) =>
        base_price === 0 && peak_price === 0
            ? this.i18n.tr('pages.settings.suppliers.table.free')
            : `${base_price} / (${peak_price} ${this.i18n.tr('pages.settings.suppliers.table.peak')})`;
    
    getPeakTimes = ({ billing: { peak_times }}) => Object.keys(peak_times)
        .map(key => `${key.substring(0, 3)}: ${peak_times[key].start_time} - ${peak_times[key].end_time}`)
        .join(', ');

    async addSupplier() {
        try {
            this.newSupplier.billing.base_price = Number(this.newSupplier.billing.base_price);
            debugger;
            const { data } = await this.api.addSupplier(this.newSupplier);
            this.suppliers = data;
        } catch (error) {
            Logger.error(`Could not load Suppliers: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
    }

    deactivate() {
    }
}
