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
import {Output} from 'containers/cloud/output';
import {Shutter} from 'containers/cloud/shutter';
import {DndService} from 'bcx-aurelia-dnd';
import {EventsWebSocketClient} from 'components/websocket-events';

@inject(DndService, Factory.of(Output), Factory.of(Shutter))
export class Outputs extends Base {
    constructor(dndService, outputFactory, shutterFactory, ...rest) {
        super(...rest);
        this.dndService = dndService;
        this.outputFactory = outputFactory;
        this.shutterFactory = shutterFactory;
        this.webSocket = new EventsWebSocketClient(['OUTPUT_CHANGE', 'SHUTTER_CHANGE'], 'v1.1');
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadShutters().then(() => {
                this.signaler.signal('reload-shutters');
            });
        }, 60000);

        this.initVariables();
    }

    // can_led_1_function: "UNKNOWN"
    // can_led_1_id: 255
    // can_led_2_function: "UNKNOWN"
    // can_led_2_id: 255
    // can_led_3_function: "UNKNOWN"
    // can_led_3_id: 255
    // can_led_4_function: "UNKNOWN"
    // can_led_4_id: 255
    // floor: 255
    // id: 0
    // module_type: "O"
    // name: "Entrance"
    // room: 1
    // timer: 65535
    // type: 0

    // ctimer: 0
    // dimmer: 100
    // id: 0
    // locked: false
    // status: 1

    // capabilities: ["ON_OFF"]
    // 0: "ON_OFF"
    // id: 10526
    // last_state_change: 1622069881.153796
    // local_id: 0
    // location: {floor_coordinates: {x: null, y: null}, installation_id: 88, gateway_id: 51, floor_id: null,…}
    // floor_coordinates: {x: null, y: null}
    // x: null
    // y: null
    // floor_id: null
    // gateway_id: 51
    // installation_id: 88
    // room_id: 2715
    // name: "Entrance"
    // status: {on: false, locked: false, manual_override: false}
    // locked: false
    // manual_override: false
    // on: false
    // type: "OUTLET"
    // _version: 1.1

    initVariables() {
        this.editMode = false;
        this.outputs = [];
        this.outputMap = {};
        this.loading = false;
        this.mode = 'list';
        this.modes = ['list', 'visual'];
        this.containerSize = null;
        this.outputsLoading = true;
        this.floors = [];
        this.unassignedOutputs = [];
        this.activeFloor = undefined;
        this.floorsLoading = false;
        this.shutters = [];
        this.shutterMap = {};
        this.shuttersLoading = true;
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
        this.rooms = [];
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
            if (['outlet', 'appliance', 'heater'].contains(output.outputType) && !output.isDimmer && output.inUse) {
                relays.push(output);
            }
        }
        return relays;
    }

    @computedFrom('outputs')
    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (['outlet', 'appliance', 'heater'].contains(output.outputType) && output.isDimmer && output.inUse) {
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

    @computedFrom('containerSize')
    get shouldHide() {
        return !this.containerSize;
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

    async getRooms() {
        try {
            const { data } = await this.api.getRooms();
            this.rooms = data;
        } catch (error) {
            Logger.error(`Could not load rooms: ${error.message}`);
        }
    }

    async loadOutputs() {
        try {
            let data = (await this.api.getOutputs())?.data || [];
            Toolbox.crossfiller(data, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[id] = output;
                return output;
            });
            await this.getRooms();
            this.outputs.forEach(output => {
                if (output.room === undefined) {
                    output.roomName = '';
                }
                const { name: roomName } = this.rooms.find(({ id }) => id === output.room) || { name: '' };
                output.roomName = roomName;
            });
            this.outputs = this.outputs.filter(output => output.name);
            this.outputs.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            this.outputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Outputs: ${error.message}`);
        }
    }

    async loadShutters() {
        try {
            let data = (await this.api.getShutters())?.data || [];
            Toolbox.crossfiller(data, this.shutters, 'id', (id) => {
                let shutter = this.shutterFactory(id);
                this.shutterMap[id] = shutter;
                return shutter;
            });
            this.shutters.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            this.shuttersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Shutters: ${error.message}`);
        }
    }

    async toggleOutput({ activeOutputs, floorOutputs }, { id, status }) {
        if (!status) return;
        try {
            const index = floorOutputs.findIndex(({ id: lightId }) => id === lightId);
            floorOutputs[index].status.on = !status.on;
            const isActive = activeOutputs.findIndex(({ id: lightId }) => id === lightId) !== -1;
            if (isActive) {
                this.removeActiveOutput(id, activeOutputs);
            } else {
                activeOutputs.push(floorOutputs[index]);
            }
            await this.api.toggleOutput(id);
        } catch (error) {
            floorOutputs[index].status.on = status.on;
            this.removeActiveOutput(id, activeOutputs);
            Logger.error(`Could not toggle Output: ${error.message}`);
        }
    }

    async assignOutput(output) {
        const otpIndex = this.unassignedOutputs.findIndex(({ id }) => id === output.id);
        if (otpIndex !== -1) {
            const [prev] = this.unassignedOutputs.splice(otpIndex, 1);
            try {
                this.loading = true;
                output.location.floor_coordinates.x = 1;
                output.location.floor_coordinates.y = 1;
                await this.api.changeOutputFloorLocation({  id: output.id, floor_id: this.activeFloor.id, x: 1, y: 1 })
                this.activeFloor.floorOutputs.push(output);
                this.loading = false;
            } catch (error) {
                this.unassignedOutputs.push(prev);
                this.loading = false;
            }
        }
    }

    async unassignedOutput(output) {
        const otpIndex = this.activeFloor.floorOutputs.findIndex(({ id }) => id === output.id);
        if (otpIndex !== -1) {
            const [prev] = this.activeFloor.floorOutputs.splice(otpIndex, 1);
            try {
                this.loading = true;
                output.location.floor_coordinates.x = null;
                output.location.floor_coordinates.y = null;
                await this.api.changeOutputFloorLocation({ id: output.id, floor_id: null, x: null, y: null })
                this.unassignedOutputs.push(output);
                this.loading = false;
            } catch (err) {
                this.activeFloor.floorOutputs.push(prev);
                this.loading = false;
            }
        }
    }

    removeActiveOutput(id, activeOutputs) {
        const activeIndex = activeOutputs.findIndex(({ id: outputId }) => id === outputId);
        activeOutputs.splice(activeIndex, 1);
    }

    async loadFloors() {
        try {
            this.floorsLoading = true;
            const data = (await this.api.getFloors({ size: 'MEDIUM' })).data.filter(i => i?.image?.url);
            const { data: outputs = [] } = await this.api.getOutputs();
            const { data: shutters = [] } = await this.api.getShutters();
            const deviceTypes = ['LIGHT', 'OUTLET', 'APPLIANCE', 'VALVE', 'HEATER'];
            const filterByUnassigned = ({ name, location: { floor_coordinates: { x, y } }, type }) =>
                    (x === null || y === null) && name && deviceTypes.includes(type);
            this.unassignedOutputs = [...outputs.filter(filterByUnassigned), ...shutters.filter(filterByUnassigned)];
            this.floors = data.map(({ id, ...rest }) => {
                const filterByFloorId = ({ name, location: { floor_id }, type }) =>
                    floor_id === id && name && deviceTypes.includes(type);
                const floorOutputs = [
                    ...outputs.filter(filterByFloorId),
                    ...shutters.filter(filterByFloorId),
                ];
                return {
                    ...rest,
                    id,
                    floorOutputs,
                    activeOutputs: floorOutputs.filter(({ status }) => status && status.on),
                };
            });
            if (this.floors.length) {
                this.activeFloor = this.floors[0];
                this.containerSize = null;
                setTimeout(() => {
                    this.dndService.addTarget(this);
                    const { clientHeight: height, clientWidth } = this.imageContainer || { clientHeight: 0, clientWidth: 0 };
                    this.containerSize = { height, width: Math.min(this.activeFloor?.image?.width, clientWidth) };
                }, 500)
                this.floorsLoading = false;
            }
        } catch (error) {
            Logger.error(`Could not load Floors: ${error.message}`);
            this.floorsLoading = false;
        }
    }

    nextFloor() {
        const indexCurrentFloor = this.floors.findIndex(({ id }) => this.activeFloor.id === id);
        if (indexCurrentFloor !== -1 && this.floors[indexCurrentFloor + 1]) {
            this.activeFloor = this.floors[indexCurrentFloor + 1];
            this.containerSize = null;
            setTimeout(() => {
                const { clientHeight: height, clientWidth } = this.imageContainer || { clientHeight: 0, clientWidth: 0 };
                this.containerSize = { height, width: Math.min(this.activeFloor.image.width, clientWidth) };
                this.floorsLoading = false;
            }, 500);
        }
    }

    prevFloor() {
        const indexCurrentFloor = this.floors.findIndex(({ id }) => this.activeFloor.id === id);
        if (indexCurrentFloor !== -1 && this.floors[indexCurrentFloor - 1]) {
            this.activeFloor = this.floors[indexCurrentFloor - 1];
            this.containerSize = null;
            setTimeout(() => {
                const { clientHeight: height, clientWidth } = this.imageContainer || { clientHeight: 0, clientWidth: 0 };
                this.containerSize = { height, width: Math.min(this.activeFloor.image.width, clientWidth) };
                this.floorsLoading = false;
            }, 500);
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
        this.webSocket.updateSubscription();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
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
        this.refresher.run();
        this.refresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    dndCanDrop(model) {
        return this.editMode && model.type === 'moveItem';
    }

    async dndDrop(location) {
        const BLOCK_OFFSET_HEIGHT = 40;
        const { item } = this.dnd.model;
        const { previewElementRect, targetElementRect } = location;
        let { clientHeight: unassignedBlockHeight, clientWidth } = this.unassignedContainer || { clientHeight: 0 };
        const widthDropArea = Math.min(clientWidth, this.activeFloor.image.width);
        unassignedBlockHeight += BLOCK_OFFSET_HEIGHT;
        const imageHeight = this.imageContainer.clientHeight;
        const newLoc = {
          x: previewElementRect.x - targetElementRect.x,
          y: previewElementRect.y - targetElementRect.y
        };
        if (newLoc.x > widthDropArea) {
            return;
        }
        const floorY = (newLoc.y - unassignedBlockHeight) * 100 / imageHeight;
        const shouldUnnasign = floorY < 0;
        const shouldAssign = item.location.floor_coordinates.x === null;
        if (shouldUnnasign) {
            return this.unassignedOutput(item);
        }
        item.location.floor_coordinates.x = Math.round(newLoc.x * 100 / widthDropArea);
        item.location.floor_coordinates.y = Math.round(floorY);
        const { location: { floor_coordinates } } = item;

        let prev = null;
        if (shouldAssign) {
            const otpIndex = this.unassignedOutputs.findIndex(({ id }) => id === item.id);
            if (otpIndex !== -1) {
                prev = this.unassignedOutputs.splice(otpIndex, 1)[0];
            }
        }

        try {
            this.loading = true;
            await this.api.changeOutputFloorLocation({ id: item.id, floor_id: this.activeFloor.id, ...floor_coordinates });
            if (shouldAssign) {
                this.activeFloor.floorOutputs.unshift(item);
            }
            this.loading = false;
        } catch (error) {
            if (prev) {
                this.unassignedOutputs.push(prev);
            }
            this.loading = false;
            Logger.error(`Could not change coordinates of output: ${error}`);
        }

        // move the item to end of array, in order to show it above others
        const idx = this.activeFloor.floorOutputs.indexOf(item);
        if (idx >= 0) {
            this.activeFloor.floorOutputs.splice(idx, 1);
            this.activeFloor.floorOutputs.push(item);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.webSocket.close();
    }
}
