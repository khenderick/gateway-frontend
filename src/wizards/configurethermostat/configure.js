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
import {inject, Factory} from "aurelia-framework";
import {Step} from "../basewizard";
import {Toolbox} from "../../components/toolbox";
import {Sensor} from "../../containers/sensor";
import {Output} from "../../containers/output";

@inject(Factory.of(Output), Factory.of(Sensor))
export class Configure extends Step {
    constructor(outputFactory, sensorFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.outputFactory = outputFactory;
        this.sensorFactory = sensorFactory;
        this.title = this.i18n.tr('wizards.configurethermostat.configure.title');
        this.data = data;
        this.sensors = [];
        this.outputs = [];

        this.timeSensor = this.sensorFactory(240);
    }

    sensorName(item) {
        if (item === undefined) {
            return this.i18n.tr('wizards.configurethermostat.configure.nosensor');
        }
        if (item.id === 240) {
            return this.i18n.tr('wizards.configurethermostat.configure.timebased');
        }
        return item.identifier + ' (' + item.temperature + ' ' + this.i18n.tr('generic.sensors.temperature.unit') + ')';
    }

    outputName(output) {
        if (output === undefined) {
            return this.i18n.tr('wizards.configurethermostat.configure.nooutput');
        }
        return output.identifier;
    }

    get canBeUsed() {
        return this.data.thermostat !== undefined && this.data.sensor !== undefined && this.data.output0 !== undefined;
    }

    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.thermostat !== undefined && this.data.thermostat.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.nametoolong'));
            fields.add('name');
        }
        if (this.data.output0 !== undefined && this.data.output0 === this.data.output1) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.sameoutput'));
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            let thermostat = this.data.thermostat;
            thermostat.sensorId = this.data.sensor !== undefined ? this.data.sensor.id : 255;
            thermostat.output0Id = this.data.output0 !== undefined ? this.data.output0.id : 255;
            thermostat.output1Id = this.data.output1 !== undefined ? this.data.output1.id : 255;
            thermostat.save();
            resolve();
        });
    }

    prepare() {
        let promises = [];
        promises.push(Promise.all([this.api.getSensorConfigurations(undefined, {dedupe: false}), this.api.getSensorTemperatureStatus({dedupe: false})])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.sensors, 'id', (id, sensorData) => {
                    let sensor = this.sensorFactory(id);
                    sensor.fillData(sensorData);
                    sensor.temperature = data[1].status[id];
                    if (this.data.thermostat.sensorId === id) {
                        this.data.sensor = sensor;
                        return sensor;
                    }
                    if (sensor.inUse && sensor.temperature !== undefined) {
                        return sensor;
                    }
                    return undefined;
                });
                if (this.data.thermostat.sensorId === 240) {
                    this.data.sensor = this.timeSensor;
                }
                this.sensors.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (!this.sensors.contains(this.timeSensor)) {
                    this.sensors.push(this.timeSensor);
                }
                if (!this.sensors.contains(undefined)) {
                    this.sensors.push(undefined);
                }
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Sensor configurations and statusses');
                }
            }));
        promises.push(this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id, entry) => {
                    let output = this.outputFactory(id);
                    output.fillData(entry);
                    if (id === this.data.thermostat.output0Id) {
                        this.data.output0 = output;
                        return output;
                    }
                    if (id == this.data.thermostat.output1Id) {
                        this.data.output1 = output;
                        return output;
                    }
                    if (!output.inUse || output.isLight) {
                        return undefined;
                    }
                    return output;
                });
                this.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (!this.outputs.contains(undefined)) {
                    this.outputs.push(undefined);
                }
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations');
                }
            }));
        return Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
