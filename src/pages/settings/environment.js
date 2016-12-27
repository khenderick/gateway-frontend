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
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";

export class Environment extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.dialogService = Shared.get('dialogService');
        this.refresher = new Refresher(() => {
            this.loadVersions();
        }, 5000);

        this.versions = {
            system: undefined,
            masterhardware: undefined,
            masterfirmware: undefined
        };
        this.versionLoading = true;
        this.timeLoading = true;
        this.time = undefined;
        this.timezone = 'UTC';
        this.timezones = [
            'UTC',
            'Pacific/Honolulu', 'Pacific/Noumea', 'Pacific/Auckland',
            'Europe/London', 'Europe/Moscow', 'Europe/Paris',
            'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin', 'Australia/Sydney',
            'Asia/Dhaka', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Karachi', 'Asia/Tokyo',
            'America/Anchorage', 'America/Caracas', 'America/Chicago', 'America/Denver',
            'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo',
            'Africa/Cairo'];
        this.updatingTimezone = false;
    };

    loadVersions() {
        let promises = [];
        promises.push(this.api.getVersion()
            .then((data) => {
                this.versions.system = data.version;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Version');
                }
            }));
        promises.push(this.api.getStatus()
            .then((data) => {
                this.versions.masterhardware = data['hw_version'];
                this.versions.masterfirmware = data.version;
                this.time = data.time;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Status');
                }
            }));
        if (this.updatingTimezone === false) {
            promises.push(this.api.getTimezone()
                .then((data) => {
                    this.timezone = data.timezone;
                })
                .catch((error) => {
                    if (!this.api.isDeduplicated(error)) {
                        console.error('Could not load Timezone');
                    }
                }));
        }
        return Promise.all(promises)
            .then(() => {
                this.versionLoading = false;
                this.timeLoading = false;
            });
    }

    setTimezone(event) {
        this.updatingTimezone = true;
        this.timezone = event.detail.value;
        this.api.setTimezone(event.detail.value)
            .then(() => {
                this.updatingTimezone = false;
            })
            .catch(() => {
                this.updatingTimezone = false;
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
