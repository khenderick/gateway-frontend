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
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";

export class Cloud extends Base {
    constructor(...rest) {
        super(...rest);
        this.refresher = new Refresher(async () => {
            let settings = ['cloud_enabled', 'cloud_metrics_enabled|energy', 'cloud_metrics_enabled|counter', 'cloud_support'];
            let values = await this.api.getSettings(settings);
            [
                this.cloudEnabled,
                this.metricEnabledEnergy,
                this.metricEnabledPulseCounters,
                this.cloudSupport
            ] = Array.from(settings, setting => values.values[setting]);
            this.settingsLoading = false;
        }, 5000);

        this.cloudEnabled = true;
        this.cloudEnabledSaving = false;
        this.metricEnabledEnergy = true;
        this.metricEnabledEnergySaving = false;
        this.metricEnabledPulseCounters = true;
        this.metricEnabledPulseCountersSaving = false;
        this.cloudSupport = null;
        this.cloudSupportSaving = false;
        this.settingsLoading = true;
    }

    async toggleCloudEnabled(enabled) {
        this.cloudEnabledSaving = true;
        let newValue = !!enabled;
        if (enabled === undefined) {
            newValue = !this.cloudEnabled;
        }
        try {
            await this.api.setSetting('cloud_enabled', newValue);
            this.cloudEnabled = newValue;
        } finally {
            this.cloudEnabledSaving = false;
        }
    }

    async toggleCloudSupport(enabled) {
        this.cloudSupportSaving = true;
        let newValue = !!enabled;
        if (enabled === undefined) {
            newValue = !this.cloudSupport;
        }
        try {
            await this.api.setSetting('cloud_support', newValue);
            this.cloudSupport = newValue;
        } finally {
            this.cloudSupportSaving = false;
        }
    }

    async toggleMetricEnabledEnergy(enabled) {
        this.metricEnabledEnergySaving = true;
        let newValue = !!enabled;
        if (enabled === undefined) {
            newValue = !this.metricEnabledEnergy;
        }
        try {
            await this.api.setSetting('cloud_metrics_enabled|energy', newValue);
            this.metricEnabledEnergy = newValue;
        } finally {
            this.metricEnabledEnergySaving = false;
        }
    }
    async toggleMetricEnabledPulseCounters(enabled) {
        this.metricEnabledPulseCountersSaving = true;
        let newValue = !!enabled;
        if (enabled === undefined) {
            newValue = !this.metricEnabledPulseCounters;
        }
        try {
            await this.api.setSetting('cloud_metrics_enabled|counter', newValue);
            this.metricEnabledPulseCounters = newValue;
        } finally {
            this.metricEnabledPulseCountersSaving = false;
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}