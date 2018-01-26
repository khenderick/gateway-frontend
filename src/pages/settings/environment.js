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
import {inject} from "aurelia-framework";
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import Shared from "../../components/shared";

@inject(DialogService)
export class Environment extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.refresher = new Refresher(() => {
            this.loadVersions().catch(() => {});
        }, 5000);

        this.versions = {
            system: undefined,
            masterhardware: undefined,
            masterfirmware: undefined,
            gateway: undefined,
            frontend: Shared.target !== 'cloud' ? Shared.version : undefined
        };
        this.shared = Shared;
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

    async loadVersions() {
        let promises = [];
        promises.push((async () => {
            try {
                let data = await this.api.getVersion();
                this.versions.system = data.version;
                this.versions.gateway = data.gateway;
            } catch (error) {
                console.error(`Could not load Version: ${error.message}`);
            }
        })());
        promises.push((async () => {
            try {
                let data = await this.api.getStatus();
                this.versions.masterhardware = data['hw_version'];
                this.versions.masterfirmware = data.version;
                this.time = data.time;
            } catch (error) {
                console.error(`Could not load Status: ${error.message}`);
            }
        })());
        if (this.updatingTimezone === false) {
            promises.push((async () => {
                try {
                    let data = await this.api.getTimezone();
                    this.timezone = data.timezone;
                } catch (error) {
                    console.error(`Could not load Timezone: ${error.message}`);
                }
            })());
        }
        await Promise.all(promises);
        this.versionLoading = false;
        this.timeLoading = false;
    }

    async setTimezone(event) {
        this.updatingTimezone = true;
        this.timezone = event.detail.value;
        try {
            await this.api.setTimezone(event.detail.value);
        } catch (error) {
            console.error(`Could not store timezone: ${error.message}`);
        }
        this.updatingTimezone = false;
    }

    installationUpdated() {
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
