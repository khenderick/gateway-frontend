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

import {Base} from 'resources/base';
import {Logger} from 'components/logger';
import { days } from 'resources/constants';
import {upperFirstLetter} from 'resources/generic';

export class Suppliers extends Base {
    initSupplierData = {
        display: 0,
        unit: 'kWh',
        billing: {
            currency: 'USD',
            peak_price: undefined,
            peak_times: {},
            double_tariff: false,
        },
    };

    constructor(...props) {
        super(...props);
        this.suppliers = [];
        this.removingSupplierId = undefined;
        this.units = ['kWh', 'liter', 'm3', 'kg', 'ton'];
        this.slidervalue = 0;
        this.newSupplier = JSON.parse(JSON.stringify(this.initSupplierData));
        this.activeSupplier = undefined;
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
            : `${base_price} / (${Number(peak_price)} ${this.i18n.tr('pages.settings.suppliers.table.peak')})`;
    
    getPeakTimes = ({ billing: { peak_times }}) => Object.keys(peak_times)
        .map(key => `${key.substring(0, 3)}: ${peak_times[key].start_time} - ${peak_times[key].end_time}`)
        .join(', ');

    valueToTime = (val) => `${('0' + Math.floor(val / 6)).slice(-2)}:${('0' + Math.round(val / 6 % 1 * 60)).slice(-2)}`
    timeToValue = (time) => time.split(':')[0] * 6 + time.split(':')[1] / 10;

    async addSupplier() {
        try {
            this.newSupplier.billing.base_price = Number(this.newSupplier.billing.base_price);
            this.newSupplier.billing.peak_price = Number(this.newSupplier.billing.peak_price);
            if (this.newSupplier.billing.double_tariff) {
                this.newSupplier.billing.peak_times = this.fillPeakTime();
            }
            const { data } = await this.api.addSupplier(this.newSupplier);
            this.suppliers.push(data);
            this.newSupplier = JSON.parse(JSON.stringify(this.initSupplierData));
        } catch (error) {
            Logger.error(`Could not add Supplier: ${error.message}`);
        }
    }

    async removeSupplier() {
        try {
            const { data } = await this.api.removeSupplier(this.removingSupplierId);
            const index = this.suppliers.findIndex(el => el.id === this.removingSupplierId);
            if (index !== -1) {
                this.suppliers.splice(index, 1);
            }
            if (this.removingSupplierId === this.activeSupplier.id) {
                this.activeSupplier = undefined;
            }
        } catch (error) {
            Logger.error(`Could not remove Supplier: ${error.message}`);
        }
    }

    async saveSupplier() {
        try {
            this.activeSupplier.display = 0;
            this.activeSupplier.billing.base_price = Number(this.activeSupplier.billing.base_price);
            this.activeSupplier.billing.peak_price = Number(this.activeSupplier.billing.peak_price);
            const { data } = await this.api.updateSupplier(this.activeSupplier);
            const index = this.suppliers.findIndex(el => el.id === data.id);
            if (index !== -1) {
                this.suppliers[index] = data;
            }
            this.suppliers = [...this.suppliers];
            this.signaler.signal('updated-supplier');
        } catch (error) {
            Logger.error(`Could not update Supplier: ${error.message}`);
        }
    }

    onSupplierSelect(supplier) {
        this.activeSupplier = supplier;
        this.buildPeakTimes();
    }

    fillPeakTime = () => days.reduce((prev, day) => ({ ...prev, [day]: { start_time: '00:00', end_time: '00:00' }}), {});

    buildPeakTimes() {
        let { billing: { peak_times, double_tariff } } = this.activeSupplier;
        $('#peak-times-container').empty();
        if (!double_tariff) {
            this.activeSupplier.billing.peak_times = this.fillPeakTime();
            return;
        }
        if (!peak_times) {
            this.activeSupplier.billing.peak_times = this.fillPeakTime();
        }
        setTimeout(() => {
            $('#peak-times-container').append(
                ...days.map(day => {
                    const { end_time, start_time } = this.activeSupplier.billing.peak_times[day];
                    return $('<div/>', { class: 'peak-block' }).append(
                        ...[
                            $('<span/>', { id: `${day}-value` }).text(`${upperFirstLetter(day)} peak times from ${start_time} until ${end_time}`),
                            $('<div/>', { id: day, class: 'peak-slider' }).slider({
                                range: true,
                                min: 0,
                                max: 143,
                                values: [this.timeToValue(start_time), this.timeToValue(end_time)],
                                slide: (event, ui) => {
                                    const start_time = this.valueToTime(ui.values[0]);
                                    const end_time = this.valueToTime(ui.values[1]);
                                    this.activeSupplier.billing.peak_times = {
                                        ...this.activeSupplier.billing.peak_times,
                                        [day]: { start_time, end_time },
                                    };
                                    $(`#${day}-value`).text(`${upperFirstLetter(day)} peak times from ${start_time} until ${end_time}`);
                                }
                            })
                        ]
                    )
                })
            );
        }, 0);
    }

    installationUpdated() {
        this.loadSuppliers();
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
