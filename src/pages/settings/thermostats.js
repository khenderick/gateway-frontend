import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Thermostat} from "../../containers/thermostat";
import {GlobalThermostat} from "../../containers/thermostat-global";
import {Sensor} from "../../containers/sensor";
import {Output} from "../../containers/output";
import {ConfigureGlobalThermostatWizard} from "../../wizards/configureglobalthermostat/index";

export class Thermostats extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.dialogService = Shared.get('dialogService');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadThermostats().then(() => {
                this.signaler.signal('reload-thermostats');
            });
            this.loadSensors().then(() => {
                this.signaler.signal('reload-sensors');
            });
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
        }, 5000);

        this.globalThermostat = undefined;
        this.globalThermostatDefined = false;
        this.heatingThermostats = [];
        this.coolingThermostats = [];
        this.thermostatsLoading = true;
        this.activeThermostat = undefined;
        this.outputs = [];
        this.outputMap = new Map();
        this.sensors = [];
        this.sensorMap = new Map();
        this.filters = ['configured', 'unconfigured'];
        this.filter = ['configured', 'unconfigured'];
        this.outputsLoading = true;
        this.sensorsLoading = true;
    };

    loadThermostats() {
        return Promise.all([
            this.api.getThermostatsStatus(), this.api.getGlobalThermostatConfiguration(),
            this.api.getThermostatConfigurations(), this.api.getCoolingConfigurations()
        ])
            .then((data) => {
                if (this.globalThermostatDefined === false) {
                    this.globalThermostat = new GlobalThermostat();
                    this.globalThermostatDefined = true;
                }
                this.globalThermostat.fillData(data[0], false);
                this.globalThermostat.fillData(data[1].config, false);
                Toolbox.crossfiller(data[2].config, this.heatingThermostats, 'id', (id) => {
                    return new Thermostat(id, 'heating');
                }, 'mappingConfiguration');
                Toolbox.crossfiller(data[3].config, this.coolingThermostats, 'id', (id) => {
                    return new Thermostat(id, 'cooling');
                }, 'mappingConfiguration');
                if (this.globalThermostat.isHeating) {
                    Toolbox.crossfiller(data[0].status, this.heatingThermostats, 'id', undefined, 'mappingStatus');
                } else {
                    Toolbox.crossfiller(data[0].status, this.coolingThermostats, 'id', undefined, 'mappingStatus');
                }
                this.heatingThermostats.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.coolingThermostats.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.thermostatsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.log(error);
                    console.error('Could not load Thermostats');
                }
            });
    };

    loadOutputs() {
        return this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                    let output = new Output(id);
                    this.outputMap.set(id, output);
                    return output;
                });
                this.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.outputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations');
                }
            });
    };

    loadSensors() {
        return Promise.all([this.api.getSensorConfigurations(), this.api.getSensorTemperatureStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.sensors, 'id', (id) => {
                    let sensor = new Sensor(id);
                    this.sensorMap.set(id, sensor);
                    return sensor;
                });
                for (let sensor of this.sensors) {
                    sensor.temperature = data[1].status[sensor.id];
                }
                this.sensors.sort((a, b) => {
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

    @computedFrom('heatingThermostats', 'filter')
    get filteredHeatingThermostats() {
        let thermostats = [];
        for (let thermostat of this.heatingThermostats) {
            if ((this.filter.contains('unconfigured') && !thermostat.isConfigured) ||
                (this.filter.contains('configured') && thermostat.isConfigured)) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    @computedFrom('coolingThermostats', 'filter')
    get filteredCoolingThermostats() {
        let thermostats = [];
        for (let thermostat of this.coolingThermostats) {
            if ((this.filter.contains('unconfigured') && !thermostat.isConfigured) ||
                (this.filter.contains('configured') && thermostat.isConfigured)) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    @computedFrom('filteredHeatingThermostats', 'filteredCoolingThermostats')
    get possibleThermostats() {
        if (!this.filteredHeatingThermostats.contains(this.activeThermostat) && !this.filteredCoolingThermostats.contains(this.activeThermostat)) {
            this.activeThermostat = undefined;
        }
    }

    filterText(filter) {
        return this.i18n.tr('pages.settings.thermostats.filter.' + filter);
    }

    filterUpdated() {
        this.signaler.signal('reload-thermostats');
    }

    selectThermostat(thermostatId, type) {
        let foundThermostat = undefined;
        if (type === 'heating') {
            for (let thermostat of this.heatingThermostats) {
                if (thermostat.id === thermostatId) {
                    foundThermostat = thermostat;
                    break;
                }
            }
        } else {
            for (let thermostat of this.coolingThermostats) {
                if (thermostat.id === thermostatId) {
                    foundThermostat = thermostat;
                    break;
                }
            }
        }
        this.activeThermostat = foundThermostat;
    }

    editGlobalThermostat() {
        if (this.globalThermostat === undefined || this.thermostatsLoading) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureGlobalThermostatWizard, model: {thermostat: this.globalThermostat}}).then((response) => {
            if (response.wasCancelled) {
                this.globalThermostat.cancel();
                console.info('The ConfigureGlobalThermostatWizard was cancelled');
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
