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
        this.newSupplier = {};
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

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
    }

    deactivate() {
    }
}
