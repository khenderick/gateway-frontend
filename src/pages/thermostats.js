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
import {Base} from "../resources/base";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {GlobalThermostat} from "../containers/thermostat-global";
import {Thermostat} from "../containers/thermostat";

@inject(Factory.of(Thermostat), Factory.of(GlobalThermostat))
export class Thermostats extends Base {
    constructor(thermostatFactory, globalThermostatFactory, ...rest) {
        super(...rest);
        this.thermostatFactory = thermostatFactory;
        this.globalThermostatFactory = globalThermostatFactory;
        this.refresher = new Refresher(() => {
            this.loadThermostats().then(() => {
                this.signaler.signal('reload-thermostats');
            });
        }, 5000);

        this.globalThermostat = undefined;
        this.globalThermostatDefined = false;
        this.heatingThermostats = [];
        this.coolingThermostats = [];
        this.thermostatsLoading = true;
        this.initialThermostats = false;
    };

    get temperatureThermostats() {
        let thermostats = [];
        let allThermostats = this.globalThermostat !== undefined && this.globalThermostat.isHeating ? this.heatingThermostats : this.coolingThermostats;
        for (let thermostat of allThermostats) {
            if (!thermostat.isRelay) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    };

    get onOffThermostats() {
        let thermostats = [];
        let allThermostats = this.globalThermostat !== undefined && this.globalThermostat.isHeating ? this.heatingThermostats : this.coolingThermostats;
        for (let thermostat of allThermostats) {
            if (thermostat.isRelay) {
                thermostats.push(thermostat);
            }
        }
        return thermostats;
    }

    get hasThermostats() {
        for (let thermostat of this.heatingThermostats) {
            if (thermostat.isConfigured) {
                return true;
            }
        }
        for (let thermostat of this.coolingThermostats) {
            if (thermostat.isConfigured) {
                return true;
            }
        }
        return false;
    }

    loadThermostats() {
        let calls = [this.api.getThermostatsStatus()];
        if (this.initialThermostats === false) {
            calls.push(this.api.getThermostatConfigurations());
            calls.push(this.api.getCoolingConfigurations());
        }
        return Promise.all(calls)
            .then((data) => {
                if (this.globalThermostatDefined === false) {
                    this.globalThermostat = this.globalThermostatFactory();
                    this.globalThermostatDefined = true;
                }
                this.globalThermostat.fillData(data[0], false);
                if (this.initialThermostats === false) {
                    Toolbox.crossfiller(data[1].config, this.heatingThermostats, 'id', (id) => {
                        return this.thermostatFactory(id, 'heating');
                    }, 'mappingConfiguration');
                    Toolbox.crossfiller(data[2].config, this.coolingThermostats, 'id', (id) => {
                        return this.thermostatFactory(id, 'cooling');
                    }, 'mappingConfiguration');
                    this.initialThermostats = true;
                }
                if (this.globalThermostat.isHeating) {
                    Toolbox.crossfiller(data[0].status, this.heatingThermostats, 'id', (id) => {
                        return this.thermostatFactory(id, 'heating');
                    }, 'mappingStatus');
                } else {
                    Toolbox.crossfiller(data[0].status, this.coolingThermostats, 'id', (id) => {
                        return this.thermostatFactory(id, 'cooling');
                    }, 'mappingStatus');
                }
                this.heatingThermostats.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.coolingThermostats.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.thermostatsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Thermostats');
                }
            });
    };

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
    };
}
