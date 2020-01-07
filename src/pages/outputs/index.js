/*
 * Copyright (C) 2016 OpenMotics BV
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {Output} from 'containers/output';
import {Shutter} from 'containers/shutter';
import {EventsWebSocketClient} from 'components/websocket-events';

@inject(Factory.of(Output), Factory.of(Shutter))
export class Outputs extends Base {
    constructor(outputFactory, shutterFactory, ...rest) {
        super(...rest);
        this.outputFactory = outputFactory;
        this.shutterFactory = shutterFactory;
        this.webSocket = new EventsWebSocketClient(['OUTPUT_CHANGE', 'SHUTTER_CHANGE']);
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.configurationRefresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadOutputsConfiguration().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadShuttersConfiguration().then(() => {
                this.signaler.signal('reload-shutters');
            });
        }, 30000);
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            if (!this.webSocket.isAlive(30)) {
                this.loadOutputs().then(() => {
                    this.signaler.signal('reload-outputs');
                });
                this.loadShutters().then(() => {
                    this.signaler.signal('reload-shutters');
                });
            }
        }, 5000);

        this.initVariables();
    }

    initVariables() {
        this.outputs = [];
        this.outputMap = {};
        this.outputsLoading = true;
        this.shutters = [];
        this.shutterMap = {};
        this.shuttersLoading = true;
        this.installationHasUpdated = false;
    }

    @computedFrom('outputs')
    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && !output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    }

    @computedFrom('outputs')
    get dimmableLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.isLight && output.isDimmer && output.inUse) {
                lights.push(output);
            }
        }
        return lights;
    }

    @computedFrom('outputs')
    get relays() {
        let relays = [];
        for (let output of this.outputs) {
            if (['outlet', 'appliance'].contains(output.outputType) && !output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    @computedFrom('outputs')
    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (['outlet', 'appliance'].contains(output.outputType) && output.isDimmer && output.inUse) {
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

    async processEvent(event) {
        switch (event.type) {
            case 'OUTPUT_CHANGE': {
                let output = this.outputMap[event.data.id];
                if (output !== undefined) {
                    output.status = event.data.status.on ? 1 : 0;
                    output.dimmer = event.data.status.value;
                }
                break;
            }
            case 'SHUTTER_CHANGE': {
                let shutter = this.shutterMap[event.data.id];
                if (shutter !== undefined) {
                    shutter.status = event.data.status.state.toLowerCase();
                }
                break;
            }
        }
    }

    async loadOutputsConfiguration() {
        try {
            let configuration = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(configuration.config, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[id] = output;
                return output;
            });
            this.outputs.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Ouptut configurations: ${error.message}`);
        }
    }

    async loadOutputs() {
        try {
            let status = await this.api.getOutputStatus();
            Toolbox.crossfiller(status.status, this.outputs, 'id', () => {
                return undefined;
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Ouptut statusses: ${error.message}`);
        }
    }

    async loadShuttersConfiguration() {
        try {
            let configuration = await this.api.getShutterConfigurations();
            Toolbox.crossfiller(configuration.config, this.shutters, 'id', (id) => {
                let shutter = this.shutterFactory(id);
                this.shutterMap[id] = shutter;
                return shutter;
            });
            this.shutters.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.shuttersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Shutter configurations: ${error.message}`);
        }
    }

    async loadShutters() {
        try {
            let status = await this.api.getShutterStatus();
            for (let shutter of this.shutters) {
                shutter.status = status.status[shutter.id];
            }
            this.shuttersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Shutter statusses: ${error.message}`);
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
        this.configurationRefresher.run();
        this.webSocket.updateSubscription();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    async activate() {
        this.configurationRefresher.run();
        this.configurationRefresher.start();
        this.refresher.run();
        this.refresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.configurationRefresher.stop();
        this.webSocket.close();
    }
}
