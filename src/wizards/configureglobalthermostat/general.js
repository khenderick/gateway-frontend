/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import {computedFrom} from "aurelia-framework";
import {Step} from "../basewizard";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Sensor} from "../../containers/sensor";

export class General extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureglobalthermostat.general.title');
        this.api = Shared.get('api');
        this.data = data;
        this.sensors = [];
    }

    sensorName(item) {
        if (item === undefined) {
            return this.i18n.tr('wizards.configureglobalthermostat.general.nosensor');
        }
        return item.identifier + ' (' + item.temperature + ' ' + this.i18n.tr('generic.sensors.temperature.unit') + ')';
    }

    @computedFrom('data.minutes', 'data.seconds')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (parseInt(this.data.delay.minutes) * 60 + parseInt(this.data.delay.seconds) > 248) {
            let components = Toolbox.splitSeconds(248);
            let parts = [];
            if (components.minutes > 0) {
                parts.push(components.minutes + 'm');
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(components.seconds + 's');
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureglobalthermostat.general.timerlength', {max: parts.join(' ')}));
            fields.add('timer');
        }
        let threshold = parseFloat(this.data.thermostat.thresholdTemperature);
        if (isNaN(threshold) || threshold < -32 || threshold > 95.5 || (Math.abs(threshold) - (Math.round(Math.abs(threshold) * 2) / 2)) !== 0) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureglobalthermostat.general.invalidthreshold'));
            fields.add('threshold');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            resolve();
        });
    }

    prepare() {
        return Promise.all([this.api.getSensorConfigurations(undefined, {dedupe: false}), this.api.getSensorTemperatureStatus({dedupe: false})])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.sensors, 'id', (id, sensorData) => {
                    let sensor = new Sensor(id);
                    sensor.fillData(sensorData);
                    sensor.temperature = data[1].status[id];
                    if (this.data.thermostat.outsideSensor === id) {
                        this.data.sensor = sensor;
                    }
                    if (sensor.inUse && sensor.temperature !== undefined) {
                        return sensor;
                    }
                    return undefined;
                });
                this.sensors.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (!this.sensors.contains(undefined)) {
                    this.sensors.push(undefined);
                }
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Sensor configurations and statusses');
                }
            });
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
