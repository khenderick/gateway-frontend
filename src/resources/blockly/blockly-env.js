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
import * as Blockly from 'node-blockly/lua';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {NOT_IN_USE} from 'resources/constants';

export class BlocklyEnvironment {
    static async loadEnvironment(api) {
        let groupActions = (async () => {
            try {
                let data = await api.getGroupActionConfigurations();
                let actions = {};
                for (let action of data.config) {
                    actions[action.id] = action.name;
                }
                return actions;
            } catch (error) {
                Logger.error(`Could not load Group Action configurations: ${error.message}`);
            }
        })();
        let outputs = (async () => {
            try {
                const { data: rooms = [] } = await api.getRooms();
                let data = await api.getOutputConfigurations(undefined);
                let outputs = {};
                let dimmers = {};
                for (let output of data.config) {
                    if (output.name !== '' && output.name !== NOT_IN_USE) {
                        const room = rooms.find(({ id }) => id === output.room);
                        if (room) {
                            output.name += ` (${room.name})`;
                        }
                        if (output.module_type.toUpperCase() === 'D') {
                            dimmers[output.id] = output.name;
                        } else {
                            outputs[output.id] = output.name;
                        }
                    }
                }
                return {
                    outputs: outputs,
                    dimmers: dimmers
                };
            } catch (error) {
                Logger.error(`Could not load Output configurations: ${error.message}`);
            }
        })();
        let shutters = (async () => {
            try {
                let data = await api.getShutterConfigurations(undefined);
                let shutters = {};
                let groups = {};
                for (let shutter of data.config) {
                    if (shutter.name !== '') {
                        shutters[shutter.id] = shutter.name;
                    }
                }
                if (Object.keys(shutters).length > 0) {
                    for (let i = 0; i < 255; i++) {
                        groups[i] = i.toString();
                    }
                }
                return {
                    shutters: shutters,
                    groups: groups
                };
            } catch (error) {
                Logger.error(`Could not load Shutter configurations: ${error.message}`);
            }
        })();
        let inputs = (async () => {
            try {
                let data = await api.getInputConfigurations(undefined);
                let inputs = {};
                let canInputs = {};
                for (let input of data.config) {
                    if (input.name !== '' && input.name !== NOT_IN_USE) {
                        inputs[input.id] = input.name;
                        if (input.can === 'C') {
                            canInputs[input.id] = input.name;
                        }
                    }
                }
                return {
                    inputs: inputs,
                    can: canInputs
                };
            } catch (error) {
                Logger.error(`Could not load Input configurations: ${error.message}`);
            }
        })();
        let sensors = (async () => {
            try {
                let [configuration, temperature, humidity, brightness] = await Promise.all([
                    api.getSensorConfigurations(undefined),
                    api.getSensorTemperatureStatus(),
                    api.getSensorHumidityStatus(),
                    api.getSensorBrightnessStatus()
                ]);
                let sensors = {
                    temperature: {},
                    humidity: {},
                    brightness: {}
                };
                for (let sensor of configuration.config) {
                    if (sensor.name !== '' && sensor.name !== NOT_IN_USE) {
                        if (![255, undefined, null].contains(temperature.status[sensor.id])) {
                            sensors.temperature[sensor.id] = sensor.name;
                        }
                        if (![255, undefined, null].contains(humidity.status[sensor.id])) {
                            sensors.humidity[sensor.id] = sensor.name;
                        }
                        if (![255, undefined, null].contains(brightness.status[sensor.id])) {
                            sensors.brightness[sensor.id] = sensor.name;
                        }
                    }
                }
                return sensors;
            } catch (error) {
                Logger.error(`Could not load Sensor configurations: ${error.message}`);
            }
        })();
        try {
            let [groupActionsData, outputsData, inputsData, sensorsData, shuttersData] = await Promise.all([groupActions, outputs, inputs, sensors, shutters]);
            return {
                groupActions: groupActionsData,
                outputs: outputsData,
                inputs: inputsData,
                sensors: sensorsData,
                shutters: shuttersData
            };
        } catch (error) {
            Logger.error(`Could not load Environment information: ${error.message}`);
        }
    }

    static async registerEnvironmentBlocks(environment, i18n) {
        let groupActions = (async () => {
            try {
                let options = [];
                for (let [id, name] of Object.entries(environment.groupActions)) {
                    options.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (options.length === 0) {
                    options.push([i18n.tr('builder.nogroupaction'), '-1']);
                }
                options.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_groupaction'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_groupaction',
                            message0: i18n.tr('builder.groupactionx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: options
                            }],
                            output: 'om_groupaction',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_groupaction'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            } catch (error) {
                Logger.error(`Could not generate Group Action blocks: ${error.message}`);
            }
        })();
        let outputs = (async () => {
            try {
                let outputs = [];
                for (let [id, name] of Object.entries(environment.outputs.outputs)) {
                    outputs.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (outputs.length === 0) {
                    outputs.push([i18n.tr('builder.nooutput'), '-1']);
                }
                outputs.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_output'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_output',
                            message0: i18n.tr('builder.outputx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: outputs
                            }],
                            output: 'om_output',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_output'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
                let dimmers = [];
                for (let [id, name] of Object.entries(environment.outputs.dimmers)) {
                    dimmers.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (dimmers.length === 0) {
                    dimmers.push([i18n.tr('builder.nodimmer'), '-1']);
                }
                dimmers.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_dimmer'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_dimmer',
                            message0: i18n.tr('builder.dimmerx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: dimmers
                            }],
                            output: 'om_dimmer',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_dimmer'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            } catch (error) {
                Logger.error(`Could not load Output configurations: ${error.message}`);
            }
        })();
        let shutters = (async () => {
            try {
                let shutters = [];
                for (let [id, name] of Object.entries(environment.shutters.shutters)) {
                    shutters.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (shutters.length === 0) {
                    shutters.push([i18n.tr('builder.noshutter'), '-1']);
                }
                shutters.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_shutter'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_shutter',
                            message0: i18n.tr('builder.shutterx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: shutters
                            }],
                            output: 'om_shutter',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_shutter'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
                let groups = [];
                for (let [id, name] of Object.entries(environment.shutters.groups)) {
                    groups.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (groups.length === 0) {
                    groups.push([i18n.tr('builder.noshuttergroup'), '-1']);
                }
                groups.sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
                Blockly.Blocks['om_shutter_group'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_shutter_group',
                            message0: i18n.tr('builder.shuttergroupx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: groups
                            }],
                            output: 'om_shutter_group',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_shutter_group'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            } catch (error) {
                Logger.error(`Could not load Shutter configurations: ${error.message}`);
            }
        })();
        let inputs = (async () => {
            try {
                let inputs = [];
                for (let [id, name] of Object.entries(environment.inputs.inputs)) {
                    inputs.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (inputs.length === 0) {
                    inputs.push([i18n.tr('builder.noinput'), '-1']);
                }
                inputs.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_input'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_input',
                            message0: i18n.tr('builder.inputx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: inputs
                            }],
                            output: 'om_input',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_input'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE]
                };
                let canInputs = [];
                for (let [id, name] of Object.entries(environment.inputs.can)) {
                    canInputs.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                }
                if (canInputs.length === 0) {
                    canInputs.push([i18n.tr('builder.nocaninput'), '-1']);
                }
                canInputs.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                Blockly.Blocks['om_can_input'] = {
                    init: function() {
                        this.jsonInit({
                            type: 'om_can_input',
                            message0: i18n.tr('builder.caninputx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: canInputs
                            }],
                            output: 'om_can_input',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_can_input'] = function(block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE]
                };
            } catch (error) {
                Logger.error(`Could not load Input configurations: ${error.message}`);
            }
        })();
        let sensors = (async () => {
            try {
                for (let type of ['temperature', 'humidity', 'brightness']) {
                    let name = `om_sensor_${type}`;
                    let sensors = [];
                    for (let [id, name] of Object.entries(environment.sensors[type])) {
                        sensors.push([name.replace(/ /g, '\u00a0'), id.toString()]);
                    }
                    if (sensors.length === 0) {
                        sensors.push([i18n.tr('builder.nosensor'), '-1']);
                    }
                    sensors.sort((a, b) => Toolbox.sortStrings(a[0], b[0]));
                    Blockly.Blocks[name] = {
                        init: function() {
                            this.jsonInit({
                                type: name,
                                message0: i18n.tr(`builder.sensor${type}x`),
                                args0: [{
                                    type: 'field_dropdown',
                                    name: 'VALUE',
                                    options: sensors
                                }],
                                output: name,
                                colour: 65
                            });
                        }
                    };
                    Blockly.Lua[name] = function(block) {
                        return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                    };
                }
            } catch (error) {
                Logger.error(`Could not load Sensor configurations: ${error.message}`);
            }
        })();
        try {
            await Promise.all([groupActions, outputs, inputs, sensors, shutters]);
        } catch (error) {
            Logger.error(`Could not load Environment information: ${error.message}`);
        }
    }
}
