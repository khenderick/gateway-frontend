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
import {DndService} from 'bcx-aurelia-dnd';
import {EventsWebSocketClient} from 'components/websocket-events';

@inject(DndService, Factory.of(Output), Factory.of(Shutter))
export class Outputs extends Base {
    constructor(dndService, outputFactory, shutterFactory, ...rest) {
        super(...rest);
        this.dndService = dndService;
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
        this.editMode = false;
        this.outputs = [];
        this.outputMap = {};
        this.mode = 'list';
        this.modes = ['list', 'visual'];
        this.outputsLoading = true;
        this.floors = [];
        this.activeFloor = undefined;
        this.floorsLoading = false;
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

    get editModeText() {
        return this.i18n.tr('pages.outputs.editmode').toLowerCase();
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

    
    async toggleOutput({ activeOutputs, floorOutputs }, { id, status: { on } }) {
        try {
            const index = floorOutputs.findIndex(({ id: lightId }) => id === lightId);
            floorOutputs[index].status.on = !on;
            const isActive = activeOutputs.findIndex(({ id: lightId }) => id === lightId) !== -1;
            if (isActive) {
                this.removeActiveOutput(id, activeOutputs);
            } else {
                activeOutputs.push(floorOutputs[index]);
            }
            await this.api.toggleOutput(id);
        } catch (error) {
            floorOutputs[index].status.on = on;
            this.removeActiveOutput(id, activeOutputs);
            Logger.error(`Could not toggle Output: ${error.message}`);
        }
    }

    removeActiveOutput(id, activeOutputs) {
        const activeIndex = activeOutputs.findIndex(({ id: outputId }) => id === outputId);
        activeOutputs.splice(activeIndex, 1);
    }

    async loadFloors() {
        try {
            this.floorsLoading = true;
            const { data = [] } = await this.api.getFloors({ size: 'ORIGINAL' });
            const { data: outputs = [] } = await this.api.getOutputs();
            this.floors = data.map(({ id, ...rest }) => {
                const floorOutputs = outputs.filter(({ location: { floor_id } }) => floor_id === id);
                return {
                    ...rest,
                    id,
                    floorOutputs,
                    activeOutputs: floorOutputs.filter(({ status: { on } }) => on),
                };
            });
            if (this.floors.length) {
                this.activeFloor = this.floors[0];
                setTimeout(() => this.dndService.addTarget(this), 1000) 
            }
            this.floorsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Floors: ${error.message}`);
            this.floorsLoading = false;
        }
    }

    nextFloor() {
        const indexCurrentFloor = this.floors.findIndex(({ id }) => this.activeFloor.id === id);
        if (indexCurrentFloor !== -1 && this.floors[indexCurrentFloor + 1]) {
            this.activeFloor = this.floors[indexCurrentFloor + 1];
        }
    }

    prevFloor() {
        const indexCurrentFloor = this.floors.findIndex(({ id }) => this.activeFloor.id === id);
        if (indexCurrentFloor !== -1 && this.floors[indexCurrentFloor - 1]) {
            this.activeFloor = this.floors[indexCurrentFloor - 1];
        }
    }

    modeText(mode) {
        return this.i18n.tr(`pages.outputs.modes.${mode}`);
    }
    
    modeUpdated() {
        if (this.mode === 'list') {
            this.loadFloors();
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

    detached() {
        this.dndService.removeTarget(this);
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

    dndCanDrop(model) {
        return model.type === 'moveItem';
    }

    dndDrop(location) {
        const { item } = this.dnd.model;
        const { previewElementRect, targetElementRect } = location;
        const newLoc = {
          x: previewElementRect.x - targetElementRect.x,
          y: previewElementRect.y - targetElementRect.y
        };
        item.location.floor_coordinates.x = newLoc.x / 7.14;
        item.location.floor_coordinates.y = newLoc.y / 6.25;
    
        // move the item to end of array, in order to show it above others
        const idx = this.activeFloor.floorOutputs.indexOf(item);
        if (idx >= 0) {
            this.activeFloor.floorOutputs.splice(idx, 1);
            this.activeFloor.floorOutputs.push(item);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.configurationRefresher.stop();
        this.webSocket.close();
    }
}
