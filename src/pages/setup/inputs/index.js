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
import {DialogService} from 'aurelia-dialog';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {EventsWebSocketClient} from 'components/websocket-events';
import {Input, times} from 'containers/input';
import {Output} from 'containers/output';
import {GlobalLed} from 'containers/led-global';
import {PulseCounter} from 'containers/pulsecounter';
import {GroupAction} from 'containers/groupaction';
import {Shutter} from 'containers/shutter';
import {Room} from 'containers/room';
import {ConfigureInputWizard} from 'wizards/configureinput/index';

@inject(DialogService, Factory.of(Input), Factory.of(Output), Factory.of(PulseCounter), Factory.of(GlobalLed), Factory.of(GroupAction), Factory.of(Shutter), Factory.of(Room))
export class Inputs extends Base {
    constructor(dialogService, inputFactory, outputFactory, pulseCounterFactory, globalLedFactory, groupActionFactory, shutterFactory, roomFactory, ...rest) {
        super(...rest);
        this.pulseCounterFactory = pulseCounterFactory;
        this.outputFactory = outputFactory;
        this.inputFactory = inputFactory;
        this.globalLedFactory = globalLedFactory;
        this.groupActionFactory = groupActionFactory;
        this.shutterFactory = shutterFactory;
        this.roomFactory = roomFactory;
        this.dialogService = dialogService;
        this.webSocket = new EventsWebSocketClient(['INPUT_TRIGGER']);
        this.webSocket.onMessage = async (message) => {
            return this.processEvent(message);
        };
        this.refresher = new Refresher(() => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            this.loadInputs().then(() => {
                this.signaler.signal('reload-inputs');
            });
            this.loadShutters().catch(() => {});
            this.loadPulseCounters().catch(() => {});
            this.loadOutputs().catch(() => {});
            this.loadGlobalLedConfiguration().catch(() => {});
            this.loadGroupActions().catch(() => {});
            this.loadRooms().catch(() => {});
        }, 5000);
        this.recentRefresher = new Refresher(() => {
            this.loadRecent().catch(() => {});
        }, 2500);
        this.times = times;
        this.initVariables();
    }

    initVariables() {
        this.inputs = [];
        this.inputMap = {};
        this.outputs = [];
        this.outputMap = {};
        this.ledMap = {};
        this.pulseCounters = [];
        this.pulseCounterMap = {};
        this.ledGlobals = [];
        this.ledGlobalsMap = {};
        this.groupActions = [];
        this.groupActionMap = {};
        this.shutters = [];
        this.shutterMap = {};
        this.rooms = [];
        this.roomsMap = {};
        this.roomsLoading = false;
        this.groupActionControlsMap = {};
        this.inputControlsMap = {};
        this.activeInput = undefined;
        this.inputsLoading = true;
        this.pulseCountersLoading = true;
        this.filters = ['notinuse', 'normal', 'virtual', 'can'];
        this.filter = ['notinuse'];
        this.movementsMap = {100: 'up', 101: 'down', 102: 'stop', 103: 'upstopdownstop', 108: 'upstopupstop', 109: 'downstopdownstop'};
        this.inputLastPressed = {};
        this.installationHasUpdated = false;
    }

    @computedFrom('inputs', 'filter')
    get filteredInputs() {
        let inputs = [];
        for (let input of this.inputs) {
            if ((this.filter.contains('virtual') && input.isVirtual) ||
                (this.filter.contains('can') && input.isCan) ||
                (this.filter.contains('normal') && !input.isCan && !input.isVirtual) ||
                (this.filter.contains('notinuse') && !input.inUse)) {
                inputs.push(input);
            }
        }
        return inputs;
    }

    async processEvent(event) {
        switch (event.type) {
            case 'INPUT_TRIGGER': {
                let input = this.inputMap[event.data.id];
                if (input !== undefined) {
                    await input.markPressed();
                }
            }
        }
    }

    async loadInputs() {
        try {
            let data = await this.api.getInputConfigurations();
            Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                let input = this.inputFactory(id);
                this.inputMap[id] = input;
                return input;
            });
            for (let input of this.inputs) {
                let outputIds = [];
                if (input.action === 240) {
                    for (let i = 0; i < input.basicActions.length - 1; i += 2) {
                        if (Toolbox.inRanges(input.basicActions[i], [[154, 162], [165, 170], [176, 206]])) {
                            let outputId = input.basicActions[i + 1];
                            if (!outputIds.contains(outputId)) {
                                outputIds.push(outputId);
                            }
                        }
                    }
                }
                if (outputIds.length > 0) {
                    this.inputControlsMap[input.id] = {outputs: outputIds};
                } else {
                    delete this.inputControlsMap[input.id];
                }
            }
            this.inputs.sort((a, b) => {
                return a.id > b.id ? 1 : -1;
            });
            this.inputsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Input configurations: ${error.message}`);
        }
    }

    async loadRooms() {
        try {
            let rooms = await this.api.getRooms();
            Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                this.roomsMap[id] = room;
                return room;
            });
            this.roomsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    async loadPulseCounters() {
        try {
            let data = await this.api.getPulseCounterConfigurations();
            Toolbox.crossfiller(data.config, this.pulseCounters, 'id', (id, data) => {
                let pulseCounter = this.pulseCounterFactory(id);
                this.pulseCounterMap[data.input] = pulseCounter;
                return pulseCounter;
            });
            for (let input of this.inputs) {
                input.pulseCounter = this.pulseCounterMap[input.id];
            }
            this.pulseCountersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Pulse Counter configurations: ${error.message}`);
        }
    }

    async loadRecent() {
        try {
            let data = await this.api.getLastInputs();
            for (let inputData of data.inputs) {
                let input = this.inputMap[inputData[0]];
                if (input !== undefined) {
                    input.markPressed().catch(() => {});
                }
            }
        } catch (error) {
            Logger.error(`Could not load last Inputs: ${error.message}`);
        }
    }

    async loadOutputs() {
        try {
            let data = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(data.config, this.outputs, 'id', (id) => {
                let output = this.outputFactory(id);
                this.outputMap[output.id] = output;
                return output;
            });
            let newLedMap = {};
            for (let output of this.outputs) {
                for (let i of [1, 2, 3, 4]) {
                    let inputId = output[`led${i}`].id;
                    if (inputId !== 255) {
                        newLedMap[inputId] = [output, `led${i}`];
                    }
                }
            }
            this.ledMap = newLedMap;
        } catch (error) {
            Logger.error(`Could not load Output configurations: ${error.message}`);
        }
    }

    async loadGlobalLedConfiguration() {
        try {
            let data = await this.api.getCanLedConfigurations();
            Toolbox.crossfiller(data.config, this.ledGlobals, 'id', (id) => {
                return this.globalLedFactory(id);
            });
            let newLedGlobalsMap = {};
            for (let globalLed of this.ledGlobals) {
                for (let i of [1, 2, 3, 4]) {
                    let inputId = globalLed[`led${i}`].id;
                    if (inputId !== 255) {
                        let list = newLedGlobalsMap[inputId];
                        if (list === undefined) {
                            list = [];
                            newLedGlobalsMap[inputId] = list;
                        }
                        list.push([globalLed, `led${i}`]);
                    }
                }
            }
            for (let leds of Object.values(newLedGlobalsMap)) {
                leds.sort((first, second) => {
                    return first[0].id - second[0].id;
                });
            }
            this.ledGlobalsMap = newLedGlobalsMap;
        } catch (error) {
            Logger.error(`Could not load Globel Led configurations: ${error.message}`);
        }
    }

    async loadGroupActions() {
        try {
            let data = await this.api.getGroupActionConfigurations();
            Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                let groupAction = this.groupActionFactory(id);
                this.groupActionMap[id] = groupAction;
                return groupAction;
            });
            let newGroupActionControlsMap = {};
            for (let groupAction of this.groupActions) {
                for (let i = 0; i < groupAction.actions.length - 1; i += 2) {
                    if (groupAction.actions[i] >= 212 && groupAction.actions[i] <= 217) {
                        let inputId = groupAction.actions[i + 1];
                        let actions = newGroupActionControlsMap[inputId];
                        if (actions === undefined) {
                            actions = [];
                            newGroupActionControlsMap[inputId] = actions;
                        }
                        if (!actions.contains(groupAction, 'id')) {
                            actions.push(groupAction);
                        }
                    }
                }
            }
            this.groupActionControlsMap = newGroupActionControlsMap;
        } catch (error) {
            Logger.error(`Could not load Group Action Configurations: ${error.message}`);
        }
    }

    async loadShutters() {
        try {
            let data = await this.api.getShutterConfigurations();
            Toolbox.crossfiller(data.config, this.shutters, 'id', (id) => {
                let shutter = this.shutterFactory(id);
                this.shutterMap[id] = shutter;
                return shutter;
            });
        } catch (error) {
            Logger.error(`Could not load Shutter Configurations: ${error.message}`);
        }
    }

    filterText(filter) {
        return this.i18n.tr(`pages.setup.inputs.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-inputs');
    }

    selectInput(inputId) {
        let foundInput = undefined;
        for (let input of this.inputs) {
            if (input.id === inputId) {
                foundInput = input;
            }
        }
        this.activeInput = foundInput;
    }

    edit() {
        if (this.activeInput === undefined) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureInputWizard, model: {input: this.activeInput}}).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeInput.cancel();
                Logger.info('The ConfigureInputWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
        this.recentRefresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        this.recentRefresher.run();
        this.recentRefresher.start();
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for realtime data: ${error}`);
        }
    }

    deactivate() {
        this.refresher.stop();
        this.recentRefresher.stop();
        this.webSocket.close();
    }
}
