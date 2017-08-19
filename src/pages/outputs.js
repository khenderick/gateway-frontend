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
import {Output} from "../containers/output";
import {Shutter} from "../containers/shutter";

@inject(Factory.of(Output), Factory.of(Shutter))
export class Outputs extends Base {
    constructor(outputFactory, shutterFactory, ...rest) {
        super(...rest);
        this.outputFactory = outputFactory;
        this.shutterFactory = shutterFactory;
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadShutters().then(() => {
                this.signaler.signal('reload-shutters');
            });
        }, 5000);

        this.x = [];

        this.outputs = [];
        this.outputsLoading = true;
        this.shutters = [];
        this.shuttersLoading = true;
    };

    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && !output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    };

    get dimmableLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    };

    get relays() {
        let relays = [];
        for (let output of this.outputs) {
            if (!output.isLight && !output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (!output.isLight && output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    get availableShutters() {
        let shutters = [];
        for (let shutter of this.shutters) {
            if (shutter.inUse) {
                shutters.push(shutter);
            }
        }
        return shutters;
    }

    async loadOutputs() {
        try {
            let [configuration, status] = await Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()]);
            Toolbox.crossfiller(configuration.config, this.outputs, 'id', (id) => {
                return this.outputFactory(id);
            });
            Toolbox.crossfiller(status.status, this.outputs, 'id', (id) => {
                return this.outputFactory(id);
            });
            this.outputs.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.outputsLoading = false;
        } catch (error) {
            console.error(`Could not load Ouptut configurations and statusses: ${error.message}`);
        }
    };

    async loadShutters() {
        try {
            let [configuration, status] = await Promise.all([this.api.getShutterConfigurations(), this.api.getShutterStatus()]);
            Toolbox.crossfiller(configuration.config, this.shutters, 'id', (id) => {
                return this.shutterFactory(id);
            });
            for (let shutter of this.shutters) {
                shutter.status = status.status[shutter.id];
            }
            this.shutters.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.shuttersLoading = false;
        } catch (error) {
            console.error(`Could not load Shutter configurations and statusses: ${error.message}`);
        }
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
