/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {Toolbox} from '../../components/toolbox';

export class History extends Base {
    constructor(...rest) {
        super(...rest);

        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadFrames();
            this.signaler.signal('reload-frames');
        }, 15000);

        this.initVariables();
    }

    initVariables() {
        this.pulseCounterFrames = [];
        this.totalEnergyFrames = [];
        this.pulseCounterFramesLoading = true;
        this.totalEnergyFramesLoading = true;
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    frameLoaded(id) {
        for (let iframe of this.pulseCounterFrames) {
            if (iframe.id === id) {
                iframe.loading = false;
            }
        }
        for (let iframe of this.totalEnergyFrames) {
            if (iframe.id === id) {
                iframe.loading = false;
            }
        }
    }

    async loadFrames() {
        let data;
        try {
            data = await this.api.getMetricPanels();
        } catch (error) {
            console.error(`Could not load frames: ${error.message}`);
            return;
        }
        try {
            Toolbox.crossfiller(data.pulsecounters, this.pulseCounterFrames, 'id', (id, panel) => {
                return this.buildPanel(panel);
            });
            this.pulseCounterFrames.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.pulseCounterFramesLoading = false;
        } catch (error) {
            console.error(`Could not load pulse counter frames: ${error.message}`);
        }
        try {
            Toolbox.crossfiller(data.totals, this.totalEnergyFrames, 'id', (id, panel) => {
                return this.buildPanel(panel);
            });
            this.pulseCounterFrames.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.totalEnergyFramesLoading = false;
        } catch (error) {
            console.error(`Could not load energy frames: ${error.message}`);
        }
    }

    buildPanel(panel) {
        return {
            src: `${this.api.endpoint}../${panel.endpoint}&id=${this.api.installationId}&token=${this.api.token}`,
            loading: true,
            id: panel.id
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    async activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
