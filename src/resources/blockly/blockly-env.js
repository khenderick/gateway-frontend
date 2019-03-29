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
import * as Blockly from "node-blockly/lua";

export class BlocklyEnvironment {
    static async registerEnvironmentBlocks(api, i18n) {
        let groupActions = (async () => {
            try {
                let data = await api.getGroupActionConfigurations();
                let options = [];
                for (let action of data.config) {
                    options.push([action.name.replace(/ /g, '\u00a0'), action.id.toString()]);
                }
                if (options.length === 0) {
                    options.push([i18n.tr('builder.nogroupaction'), '-1']);
                }
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
                console.error(`Could not load Group Action configurations: ${error.message}`);
            }
        })();
        let outputs = (async () => {
            try {
                let data = await api.getOutputConfigurations(undefined);
                let outputs = [];
                let dimmers = [];
                for (let output of data.config) {
                    if (output.name !== '' && output.name !== 'NOT_IN_USE') {
                        outputs.push([output.name.replace(/ /g, '\u00a0'), output.id.toString()]);
                        if (output.module_type.toUpperCase() === 'D') {
                            dimmers.push([output.name.replace(/ /g, '\u00a0'), output.id.toString()]);
                        }
                    }
                }
                if (outputs.length === 0) {
                    outputs.push([i18n.tr('builder.nooutput'), '-1']);
                }
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
                if (dimmers.length === 0) {
                    dimmers.push([i18n.tr('builder.nodimmer'), '-1']);
                }
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
                console.error(`Could not load Output configurations: ${error.message}`);
            }
        })();
        let shutters = (async () => {
            try {
                let data = await api.getShutterConfigurations(undefined);
                let shutters = [];
                let groups = [];
                for (let shutter of data.config) {
                    if (shutter.name !== '') {
                        shutters.push([shutter.name.replace(/ /g, '\u00A0'), shutter.id.toString()]);
                    }
                }
                if (shutters.length === 0) {
                    shutters.push([i18n.tr('builder.noshutter'), '-1']);
                    groups.push([i18n.tr('builder.noshuttergroup'), '-1']);
                } else {
                    for (let i = 0; i < 255; i++) {
                        groups.push([i.toString(), i.toString()]);
                    }
                }
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
                console.error(`Could not load Shutter configurations: ${error.message}`);
            }
        })();
        let inputs = (async () => {
            try {
                let data = await api.getInputConfigurations(undefined);
                let inputs = [];
                let canInputs = [];
                for (let input of data.config) {
                    if (input.name !== '' && input.name !== 'NOT_IN_USE') {
                        inputs.push([input.name.replace(/ /g, '\u00a0'), input.id.toString()]);
                        if (input.can === 'C') {
                            canInputs.push([input.name.replace(/ /g, '\u00a0'), input.id.toString()]);
                        }
                    }
                }
                if (inputs.length === 0) {
                    inputs.push([i18n.tr('builder.noinput'), '-1']);
                }
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
                if (canInputs.length === 0) {
                    canInputs.push([i18n.tr('builder.nocaninput'), '-1']);
                }
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
                console.error(`Could not load Input configurations: ${error.message}`);
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
                let options = {
                    temperature: [],
                    humidity: [],
                    brightness: []
                };
                for (let sensor of configuration.config) {
                    if (sensor.name !== '' && sensor.name !== 'NOT_IN_USE') {
                        let set = [sensor.name.replace(/ /g, '\u00a0'), sensor.id.toString()];
                        if (temperature.status[sensor.id] !== 255) {
                            options.temperature.push(set);
                        }
                        if (humidity.status[sensor.id] !== 255) {
                            options.humidity.push(set);
                        }
                        if (brightness.status[sensor.id] !== 255) {
                            options.brightness.push(set)
                        }
                    }
                }
                for (let type of ['temperature', 'humidity', 'brightness']) {
                    let name = `om_sensor_${type}`;
                    if (options[type].length === 0) {
                        options[type].push([i18n.tr('builder.nosensor'), '-1']);
                    }
                    Blockly.Blocks[name] = {
                        init: function() {
                            this.jsonInit({
                                type: name,
                                message0: i18n.tr(`builder.sensor${type}x`),
                                args0: [{
                                    type: 'field_dropdown',
                                    name: 'VALUE',
                                    options: options[type]
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
                console.error(`Could not load Sensor configurations: ${error.message}`);
            }
        })();
        try {
            await Promise.all([groupActions, outputs, inputs, sensors, shutters]);
        } catch (error) {
            console.error(`Could not load Environment information: ${error.message}`);
        }
    }
}
