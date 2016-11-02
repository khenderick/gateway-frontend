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
import {Output} from "../containers/output";
import {Shutter} from "../containers/shutter";

export class Outputs extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
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

    @computedFrom('outputs')
    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && !output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get dimmableLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get relays() {
        let relays = [];
        for (let output of this.outputs) {
            if (!output.isLight && !output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    @computedFrom('outputs')
    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (!output.isLight && output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    @computedFrom('shutters')
    get availableShutters() {
        let shutters = [];
        for (let shutter of this.shutters) {
            if (shutter.inUse) {
                shutters.push(shutter);
            }
        }
        return shutters;
    }

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return new Output(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return new Output(id);
                });
                this.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.outputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations and statusses');
                }
            });
    };

    loadShutters() {
        return Promise.all([this.api.getShutterConfigurations(), this.api.getShutterStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.shutters, 'id', (id) => {
                    return new Shutter(id);
                });
                for (let shutter of this.shutters) {
                    shutter.status = data[1].status[shutter.id];
                }
                this.shutters.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.shuttersLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Shutter configurations and statusses');
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
