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
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {GlobalThermostat} from "../containers/thermostat-global";
import {Thermostat} from "../containers/thermostat";

export class Thermostats extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
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

    loadThermostats() {
        return this.api.getThermostatsStatus()
            .then((data) => {
                if (this.globalThermostatDefined === false) {
                    this.globalThermostat = new GlobalThermostat();
                    this.globalThermostatDefined = true;
                }
                this.globalThermostat.fillData(data, false);
                if (this.globalThermostat.isHeating) {
                    Toolbox.crossfiller(data.status, this.heatingThermostats, 'id', (id) => {
                        return new Thermostat(id, 'heating');
                    }, 'mappingStatus');
                } else {
                    Toolbox.crossfiller(data.status, this.coolingThermostats, 'id', (id) => {
                        return new Thermostat(id, 'cooling');
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
