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
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Sensor} from "../../containers/sensor";
import {ConfigureSensorWizard} from "../../wizards/configuresensor/index";

@inject(DialogService, Factory.of(Sensor))
export class Sensors extends Base {
    constructor(dialogService, sensorFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.sensorFactory = sensorFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadSensors();
            this.signaler.signal('reload-sensors');
        }, 5000);

        this.initVariables();
    };

    initVariables() {
        this.sensors = [];
        this.sensorsLoading = true;
        this.activeSensor = undefined;
        this.filters = ['temperature', 'humidity', 'brightness', 'none'];
        this.filter = ['temperature', 'humidity', 'brightness'];
        this.installationHasUpdated = false;
    }

    async loadSensors() {
        try {
            let [configuration, temperature, humidity, brightness] = await Promise.all([
                this.api.getSensorConfigurations(),
                this.api.getSensorTemperatureStatus(), this.api.getSensorHumidityStatus(), this.api.getSensorBrightnessStatus()
            ]);
            Toolbox.crossfiller(configuration.config, this.sensors, 'id', (id) => {
                return this.sensorFactory(id);
            });
            for (let sensor of this.sensors) {
                sensor.temperature = temperature.status[sensor.id];
                sensor.humidity = humidity.status[sensor.id];
                sensor.brightness = brightness.status[sensor.id];
            }
            this.sensors.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.sensorsLoading = false;
        } catch (error) {
            console.error(`Could not load Sensor configurations and statusses: ${error.message}`);
        }
    };

    get filteredSensors() {
        let sensors = [];
        for (let sensor of this.sensors) {
            if ((this.filter.contains('none') && sensor.temperature === undefined && sensor.humidity === undefined && sensor.brightness === undefined) ||
                (this.filter.contains('temperature') && sensor.temperature !== undefined) ||
                (this.filter.contains('humidity') && sensor.humidity !== undefined) ||
                (this.filter.contains('brightness') && sensor.brightness !== undefined)) {
                sensors.push(sensor);
            }
        }
        if (!sensors.contains(this.activeSensor)) {
            this.activeSensor = undefined;
        }
        return sensors;
    }

    filterText(filter) {
        return this.i18n.tr(`pages.settings.sensors.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-sensors');
    }

    selectSensor(sensorId) {
        let foundSensor = undefined;
        for (let sensor of this.sensors) {
            if (sensor.id === sensorId) {
                foundSensor = sensor;
            }
        }
        this.activeSensor = foundSensor;
    }

    edit() {
        if (this.activeSensor === undefined) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureSensorWizard, model: {sensor: this.activeSensor}}).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeSensor.cancel();
                console.info('The ConfigureSensorWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
