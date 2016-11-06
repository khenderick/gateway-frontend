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
    static registerEnvironmentBlocks(api, i18n) {
        let groupActions = api.getGroupActionConfigurations({dedupe: false})
            .then((data) => {
                let options = [];
                for (let action of data.config) {
                    options.push([action.name, action.id.toString()]);
                }
                Blockly.Blocks['om_groupaction'] = {
                    init: function () {
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
                Blockly.Lua['om_groupaction'] = function (block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            });
        let outputs = api.getOutputConfigurations(undefined, {dedupe: false})
            .then((data) => {
                let outputs = [];
                let dimmers = [];
                for (let output of data.config) {
                    if (output.name !== '' && output.name !== 'NOT_IN_USE') {
                        outputs.push([output.name, output.id.toString()]);
                        if (output.module_type.toUpperCase() === 'D') {
                            dimmers.push([output.name, output.id.toString()]);
                        }
                    }
                }
                Blockly.Blocks['om_output'] = {
                    init: function () {
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
                Blockly.Lua['om_output'] = function (block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
                Blockly.Blocks['om_dimmer'] = {
                    init: function () {
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
                Blockly.Lua['om_dimmer'] = function (block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            });
        let inputs = api.getInputConfigurations(undefined, {dedupe: false})
            .then((data) => {
                let options = [];
                for (let input of data.config) {
                    if (input.name !== '' && input.name !== 'NOT_IN_USE') {
                        options.push([input.name, input.id.toString()]);
                    }
                }
                Blockly.Blocks['om_input'] = {
                    init: function () {
                        this.jsonInit({
                            type: 'om_input',
                            message0: i18n.tr('builder.inputx'),
                            args0: [{
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: options
                            }],
                            output: 'om_input',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_input'] = function (block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE]
                };
            });
        let sensors = Promise.all([
            api.getSensorConfigurations(undefined, {dedupe: false}),
            api.getSensorTemperatureStatus({dedupe: false}),
            api.getSensorHumidityStatus({dedupe: false}),
            api.getSensorBrightnessStatus({dedupe: false})
        ])
            .then((data) => {
                let options = {
                    temperature: [],
                    humidity: [],
                    brightness: []
                };
                for (let sensor of data[0].config) {
                    if (sensor.name !== '' && sensor.name !== 'NOT_IN_USE') {
                        let set = [sensor.name, sensor.id.toString()];
                        if (data[1].status[sensor.id] !== 255) {
                            options.temperature.push(set);
                        }
                        if (data[2].status[sensor.id] !== 255) {
                            options.humidity.push(set);
                        }
                        if (data[3].status[sensor.id] !== 255) {
                            options.brightness.push(set)
                        }
                    }
                }
                for (let type of ['temperature', 'humidity', 'brightness']) {
                    let name = 'om_sensor_' + type;
                    if (options[type].length === 0) {
                        options[type].push([i18n.tr('builder.nosensor'), '-1']);
                    }
                    Blockly.Blocks[name] = {
                        init: function () {
                            this.jsonInit({
                                type: name,
                                message0: i18n.tr('builder.sensor' + type + 'x'),
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
                    Blockly.Lua[name] = function (block) {
                        return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                    };
                }
            });
        return Promise.all([groupActions, outputs, inputs, sensors])
            .catch((error) => {
                if (!api.isDeduplicated(error)) {
                    console.error('Could not load Environment information');
                }
            });
    };
}
