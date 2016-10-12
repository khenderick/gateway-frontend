import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Sensor} from "../../containers/sensor";
import {ConfigureSensorWizard} from "../../wizards/configuresensor/index";

export class Sensors extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.dialogService = Shared.get('dialogService');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadSensors().then(() => {
                this.signaler.signal('reload-sensors');
            });
        }, 5000);

        this.allSensors = [];
        this.sensorsLoading = true;
        this.activeSensor = undefined;
    };

    loadSensors() {
        return Promise.all([
            this.api.getSensorConfigurations(),
            this.api.getSensorTemperatureStatus(), this.api.getSensorHumidityStatus(), this.api.getSensorBrightnessStatus()
        ])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.allSensors, 'id', (id) => {
                    return new Sensor(id);
                });
                for (let sensor of this.allSensors) {
                    sensor.temperature = data[1].status[sensor.id];
                    sensor.humidity = data[2].status[sensor.id];
                    sensor.brightness = data[3].status[sensor.id];
                }
                this.allSensors.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.sensorsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Sensor configurations and statusses');
                }
            });
    };

    @computedFrom('allSensors')
    get sensors() {
        let sensors = [];
        for (let sensor of this.allSensors) {
            sensors.push(sensor);
        }
        return sensors;
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
        this.dialogService.open({viewModel: ConfigureSensorWizard, model: {sensor: this.activeSensor}}).then((response) => {
            if (response.wasCancelled) {
                this.activeSensor.cancel();
                console.info('The ConfigureSensorWizard was cancelled');
            }
        });
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
