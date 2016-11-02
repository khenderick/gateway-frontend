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
        this.thermostats = [];
        this.thermostatsLoading = true;
    };

    @computedFrom('thermostats')
    get heatings() {
        let heatings = [];
        for (let thermostat of this.thermostats) {
            if (!thermostat.isRelay) {
                heatings.push(thermostat);
            }
        }
        return heatings;
    };

    @computedFrom('thermostats')
    get relays() {
        let relays = [];
        for (let thermostat of this.thermostats) {
            if (thermostat.isRelay) {
                relays.push(thermostat);
            }
        }
        return relays;
    }

    loadThermostats() {
        return this.api.getThermostatsStatus()
            .then((data) => {
                this.globalThermostat = new GlobalThermostat();
                this.globalThermostat.fillData(data, false);
                Toolbox.crossfiller(data.status, this.thermostats, 'id', (id) => {
                    return new Thermostat(id, this.globalThermostat.isHeating);
                }, 'mappingStatus');
                this.thermostats.sort((a, b) => {
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
