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
import * as Blockly from 'node-blockly/lua';

export class BlocklyBlocks {
    static registerBlocks(i18n) {
        return new Promise((resolve) => {
            // Start
            Blockly.Blocks['om_start'] = {
                init: function () {
                    this.jsonInit({
                        'type': 'om_start',
                        'message0': i18n.tr('builder.start'),
                        'nextStatement': null,
                        'colour': 120
                    });
                }
            };
            Blockly.Lua['om_start'] = function () {
                return '';
            };

            // Conditional
            Blockly.Blocks['om_check_io_on'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_check_io_on',
                        message0: i18n.tr('builder.checkioon'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'TARGET',
                                check: ['om_placeholder_input_output', 'om_input', 'om_output', 'om_dimmer']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [['on', '1'], ['off', '0']]
                            },
                            {
                                type: 'input_value',
                                name: 'NEXT',
                                check: ['om_placeholder_operator', 'om_where_operator']
                            }
                        ],
                        inputsInline: true,
                        output: 'om_check_io_on',
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_check_io_on'] = function (block) {
                let ioID = Blockly.Lua.valueToCode(block, 'TARGET', Blockly.Lua.ORDER_NONE);
                if (ioID === '' || ioID === '-1') {
                    return '';
                }
                let on = block.getFieldValue('VALUE') === '1';
                let valueType = block.getInputTargetBlock('TARGET').type;
                let code = `${241 + (valueType === 'om_input' ? 0 : 2) + (on ? 0 : 1)} ${ioID}\n`;
                let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
                return [code + nextCode, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_check_validationbit'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_check_validationbit',
                        message0: i18n.tr('builder.validationbitset'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'BIT',
                                value: 0,
                                min: 0,
                                max: 255
                            },
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [[i18n.tr('builder.set'), '1'], [i18n.tr('builder.cleared'), '0']]
                            },
                            {
                                type: 'input_value',
                                name: 'NEXT',
                                check: ['om_placeholder_operator', 'om_where_operator']
                            }
                        ],
                        inputsInline: true,
                        output: 'om_check_validationbit',
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_check_validationbit'] = function (block) {
                let set = block.getFieldValue('VALUE') === '1';
                let bit = block.getFieldValue('BIT');
                let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
                let code = `${245 + (set ? 0 : 1)} ${bit}\n`;
                return [code + nextCode, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_check_sensor'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_check_sensor',
                        message0: i18n.tr('builder.checksensor'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'SENSOR',
                                check: ['om_placeholder_sensor', 'om_sensor_temperature', 'om_sensor_humidity', 'om_sensor_brightness']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'CHECK',
                                options: [
                                    [i18n.tr('builder.equalsto'), '0'],
                                    [i18n.tr('builder.higherthan'), '1'],
                                    [i18n.tr('builder.lowerthan'), '2']
                                ]
                            },
                            {
                                type: 'field_number',
                                name: 'VALUE',
                                value: 0,
                                min: -32,
                                max: 254,
                                precision: 0.5
                            },
                            {
                                type: 'input_value',
                                name: 'NEXT',
                                check: ['om_placeholder_operator', 'om_where_operator']
                            }
                        ],
                        inputsInline: true,
                        output: 'om_check_sensor',
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_check_sensor'] = function (block) {
                let sensorType = block.getInputTargetBlock('SENSOR').type;
                let sensorID = Blockly.Lua.valueToCode(block, 'SENSOR', Blockly.Lua.ORDER_NONE);
                if (sensorID === '' || sensorID === '-1') {
                    return '';
                }
                sensorID = parseInt(sensorID);
                let offset = 0;
                if (sensorType === 'om_sensor_humidity') {
                    offset = 32;
                } else if (sensorType === 'om_sensor_brightness') {
                    offset = 64;
                }
                let check = parseInt(block.getFieldValue('CHECK'));
                let rawValue = parseFloat(block.getFieldValue('VALUE'));
                let value = 0;
                if (sensorType === 'om_sensor_temperature') {
                    value = Math.max(0, Math.min(254, (rawValue + 32) * 2));
                } else if (sensorType === 'om_sensor_humidity') {
                    value = Math.max(0, Math.min(254, rawValue * 2));
                } else { // sensorType === 'om_sensor_brightness'
                    value = Math.max(0, Math.min(254, rawValue));
                }
                let code = `247 ${sensorID + offset}\n`;
                code += `${248 + check} ${value}\n`;
                let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
                return [code + nextCode, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_check_datetime'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_check_datetime',
                        message0: i18n.tr('builder.checkdatetime'),
                        args0: [
                            {
                                type: 'field_dropdown',
                                name: 'DATETIME_TYPE',
                                options: [
                                    [i18n.tr('builder.hour'), '0'],
                                    [i18n.tr('builder.minutes'), '1'],
                                    [i18n.tr('builder.day'), '2']
                                ]
                            },
                            {
                                type: 'field_dropdown',
                                name: 'CHECK',
                                options: [
                                    [i18n.tr('builder.equalsto'), '0'],
                                    [i18n.tr('builder.higherthan'), '1'],
                                    [i18n.tr('builder.lowerthan'), '2']
                                ]
                            },
                            {
                                type: 'field_number',
                                name: 'VALUE',
                                value: 0,
                                min: 0,
                                max: 59,
                                precision: 1
                            },
                            {
                                type: 'input_value',
                                name: 'NEXT',
                                check: ['om_placeholder_operator', 'om_where_operator']
                            }
                        ],
                        inputsInline: true,
                        output: 'om_check_datetime',
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_check_datetime'] = function (block) {
                let timeType = parseInt(block.getFieldValue('DATETIME_TYPE'));
                let check = parseInt(block.getFieldValue('CHECK'));
                let value = parseInt(block.getFieldValue('VALUE'));
                let ifCode = 0;
                if (timeType === 0) {
                    ifCode = 228;
                } else if (timeType === 1) {
                    ifCode = 229;
                } else { // timeType === 2
                    ifCode = 230;
                }
                let code = `247 ${ifCode}\n`;
                code += `${248 + check} ${value}\n`;
                let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
                return [code + nextCode, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_where_operator'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_where_operator',
                        message0: i18n.tr('builder.ifoperation'),
                        args0: [
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [
                                    [i18n.tr('generic.and'), '1'], [i18n.tr('generic.or'), '2'],
                                    [i18n.tr('generic.xor'), '3'], [i18n.tr('generic.nand'), '4'],
                                    [i18n.tr('generic.nor'), '5'], [i18n.tr('generic.nxor'), '6']
                                ]
                            },
                            {
                                type: 'input_value',
                                name: 'NEXT',
                                check: ['om_placeholder_check', 'om_check_io_on', 'om_check_sensor', 'om_check_validationbit', 'om_check_datetime']
                            }
                        ],
                        inputsInline: false,
                        output: 'om_where_operator',
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_where_operator'] = function (block) {
                let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
                if (nextCode === '') {
                    return ''
                }
                let operator = block.getFieldValue('VALUE');
                let code = `240 ${operator}\n`;
                return [code + nextCode, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_if'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_if',
                        message0: i18n.tr('builder.if'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'CHECK',
                                align: 'RIGHT',
                                check: ['om_placeholder_check', 'om_check_io_on', 'om_check_sensor', 'om_check_validationbit', 'om_check_datetime']
                            },
                            {
                                type: 'input_statement',
                                name: 'THEN',
                                align: 'RIGHT'
                            },
                            {
                                type: 'input_statement',
                                name: 'ELSE',
                                align: 'RIGHT'
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 290
                    });
                }
            };
            Blockly.Lua['om_if'] = function (block) {
                let ifCode = Blockly.Lua.valueToCode(block, 'CHECK', Blockly.Lua.ORDER_NONE);
                let thenCode = Blockly.Lua.valueToCode(block, 'THEN', Blockly.Lua.ORDER_NONE);
                let elseCode = Blockly.Lua.valueToCode(block, 'ELSE', Blockly.Lua.ORDER_NONE);
                if (ifCode === '' || thenCode === '') {
                    return '';
                }
                let code = '240 0\n';
                code += ifCode;
                code += '240 10\n';
                code += thenCode;
                if (elseCode !== '') {
                    code += '240 20\n';
                    code += elseCode;
                }
                code += '240 255\n';
                return [code, Blockly.Lua.ORDER_NONE];
            };

            // Actions
            Blockly.Blocks['om_exec_groupaction'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_exec_groupaction',
                        message0: i18n.tr('builder.execgroupaction'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'GROUPACTION',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_exec_groupaction'] = function (block) {
                let groupActionID = Blockly.Lua.valueToCode(block, 'GROUPACTION', Blockly.Lua.ORDER_NONE);
                if (groupActionID === '' || groupActionID === '-1') {
                    return '';
                }
                return [`2 ${groupActionID}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_delayed_set'] = {
                init: function () {
                    this.jsonInit({
                        type: 'block_type',
                        message0: i18n.tr('builder.delayset'),
                        args0: [
                            {
                                type: 'input_dummy'
                            },
                            {
                                type: 'input_statement',
                                name: 'ACTIONS'
                            },
                            {
                                type: 'input_dummy'
                            },
                            {
                                type: 'input_value',
                                name: 'GROUPACTION_2',
                                align: 'RIGHT',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            },
                            {
                                type: 'input_value',
                                name: 'GROUPACTION_3',
                                align: 'RIGHT',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            },
                            {
                                type: 'input_value',
                                name: 'GROUPACTION_4',
                                align: 'RIGHT',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            },
                            {
                                type: 'input_value',
                                name: 'GROUPACTION_5',
                                align: 'RIGHT',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            },
                            {
                                type: 'input_value',
                                name: 'GROUPACTION_6',
                                align: 'RIGHT',
                                check: ['om_placeholder_groupaction', 'om_groupaction']
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120,
                    })
                }
            };
            Blockly.Lua['om_delayed_set'] = function (block) {
                let commands = [];
                for (let value of [2, 3, 4, 5, 6]) {
                    let code = Blockly.Lua.valueToCode(block, `GROUPACTION_${value}`, Blockly.Lua.ORDER_NONE);
                    if (code !== '' && code !== '-1') {
                        commands.push(`${205 + value} ${code}\n`);
                    }
                }

                let releaseCode = Blockly.Lua.valueToCode(block, 'ACTIONS', Blockly.Lua.ORDER_NONE);
                if (releaseCode !== '') {
                    commands.push('236 0\n');
                    commands.push(releaseCode);
                    commands.push('236 255\n');
                }
                if (commands.length === 0) {
                    return '';
                }
                return [commands.join(''), Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_delay'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_delay',
                        message0: i18n.tr('builder.delaywith'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'DELAY',
                                value: 1,
                                min: 1,
                                max: 248,
                                precision: 1
                            },
                            {
                                type: 'input_dummy'
                            },
                            {
                                type: 'input_statement',
                                name: 'ACTIONS'
                            }
                        ],
                        inputsInline: false,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_delay'] = function (block) {
                let statementsCode = Blockly.Lua.valueToCode(block, 'ACTIONS', Blockly.Lua.ORDER_NONE);
                if (statementsCode !== '') {
                    let delay = block.getFieldValue('DELAY');
                    let commands = [];
                    commands.push(`235 ${delay}\n`);
                    commands.push(statementsCode);
                    commands.push('235 255\n');
                    return [commands.join(''), Blockly.Lua.ORDER_NONE];
                }
                return '';
            };
            Blockly.Blocks['om_send_event'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_send_event',
                        message0: i18n.tr('builder.sendevent'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'NUMBER',
                                value: 0,
                                min: 0,
                                max: 255
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_send_event'] = function (block) {
                let number = block.getFieldValue('NUMBER');
                return [`60 ${number}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_fade'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_fade',
                        message0: i18n.tr('builder.fade'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'DIMMER',
                                check: ['om_placeholder_dimmer', 'om_dimmer']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'DIRECTION',
                                options: [[i18n.tr('builder.up'), '0'], [i18n.tr('builder.down'), '3']]
                            },
                            {
                                type: 'field_dropdown',
                                name: 'STEPS',
                                options: [['1', '0'], ['2', '1'], ['3', '2']]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_fade'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'DIMMER', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }
                let direction = parseInt(block.getFieldValue('DIRECTION'));
                let steps = parseInt(block.getFieldValue('STEPS'));
                return [`${154 + direction + steps} ${outputID}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_set_bit'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_set_bit',
                        message0: i18n.tr('builder.setbit'),
                        args0: [
                            {
                                type: 'field_dropdown',
                                name: 'ACTION',
                                options: [[i18n.tr('builder.set'), '0'], [i18n.tr('builder.clear'), '1'], [i18n.tr('builder.toggle'), '2']]
                            },
                            {
                                type: 'field_number',
                                name: 'BIT',
                                value: 0,
                                min: 0,
                                max: 255
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_set_bit'] = function (block) {
                let action = parseInt(block.getFieldValue('ACTION'));
                let bit = block.getFieldValue('BIT');
                return [`${237 + action} ${bit}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_toggle'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_toggle',
                        message0: i18n.tr('builder.toggleoutput'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_output_dimmer', 'om_output', 'om_dimmer']
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_toggle'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }
                return [`162 ${outputID}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_toggle_with_dimmer'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_toggle_with_dimmer',
                        message0: i18n.tr('builder.toggleoutputwithdimmer'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_dimmer', 'om_dimmer']
                            },
                            {
                                type: 'input_value',
                                name: 'VALUE',
                                check: ['om_placeholder_dimmer_value', 'om_dimmer_value']
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_toggle_with_dimmer'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }
                let value = Blockly.Lua.valueToCode(block, 'VALUE', Blockly.Lua.ORDER_NONE);
                if (value === '') {
                    return '';
                }
                value = parseInt(value);
                let valueType = block.getInputTargetBlock('VALUE').type;
                if (valueType === 'om_dimmer_value') {
                    if (value === 0) {
                        return [`160 ${outputID}\n169 ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                    }
                    return [`${184 + value} ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                }
                return '';
            };
            Blockly.Blocks['om_output_onoff'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_output_onoff',
                        message0: i18n.tr('builder.outputonoff'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_output_dimmer', 'om_output', 'om_dimmer']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [[i18n.tr('builder.on'), '1'], [i18n.tr('builder.off'), '0']]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_output_onoff'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }
                let value = parseInt(block.getFieldValue('VALUE'));
                return [`${160 + value} ${outputID}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_output_on_with_timer'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_output_on_with_timer',
                        message0: i18n.tr('builder.outputonwithx'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_output_dimmer', 'om_output', 'om_dimmer']
                            },
                            {
                                type: 'input_value',
                                name: 'VALUE',
                                check: ['om_placeholder_timer_value', 'om_timer_value']
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_output_on_with_timer'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }

                let valueBlock = block.getInputTargetBlock('VALUE');
                let valueType = valueBlock.type;
                if (valueType === 'om_timer_value') {
                    let value = parseInt(valueBlock.getFieldValue('VALUE'));
                    let reset = valueBlock.getFieldValue('RESET') === '1';
                    return [`${(reset ? 195 : 201) + value} ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                }
                return '';
            };
            Blockly.Blocks['om_output_on_with_dimmer'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_output_on_with_dimmer',
                        message0: i18n.tr('builder.outputonwithx'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_dimmer', 'om_dimmer']
                            },
                            {
                                type: 'input_value',
                                name: 'VALUE',
                                check: ['om_placeholder_dimmer_value', 'om_dimmer_value']
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_output_on_with_dimmer'] = function (block) {
                let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
                if (outputID === '' || outputID === '-1') {
                    return '';
                }

                let valueBlock = block.getInputTargetBlock('VALUE');
                let valueType = valueBlock.type;
                if (valueType === 'om_dimmer_value') {
                    let value = Blockly.Lua.valueToCode(block, 'VALUE', Blockly.Lua.ORDER_NONE);
                    if (value === '') {
                        return '';
                    }
                    value = parseInt(value);
                    if (value === 0) {
                        return [`165 ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                    }
                    if (value === 10) {
                        return [`166 ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                    }
                    return [`${175 + value} ${outputID}\n`, Blockly.Lua.ORDER_NONE];
                }
                return '';
            };
            Blockly.Blocks['om_set_variable'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_set_variable',
                        message0: i18n.tr('builder.changevar'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'VARIABLE',
                                value: 0,
                                min: 0,
                                max: 31,
                                precision: 1
                            },
                            {
                                type: 'field_dropdown',
                                name: 'ACTION',
                                options: [
                                    [i18n.tr('builder.decreasewithx', {value: 3}), '5'],
                                    [i18n.tr('builder.decreasewithx', {value: 2}), '3'],
                                    [i18n.tr('builder.decreasewithx', {value: 1}), '1'],
                                    [i18n.tr('builder.settozero'), '0'],
                                    [i18n.tr('builder.increasewithx', {value: 1}), '2'],
                                    [i18n.tr('builder.increasewithx', {value: 2}), '4'],
                                    [i18n.tr('builder.increasewithx', {value: 3}), '6']
                                ]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_set_variable'] = function (block) {
                let number = block.getFieldValue('VARIABLE');
                let action = parseInt(block.getFieldValue('ACTION'));
                return [`${120 + action} ${number}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_can_led'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_can_led',
                        message0: i18n.tr('builder.canled'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'CAN_INPUT',
                                check: ['om_placeholder_can_input', 'om_can_input']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [
                                    [i18n.tr('builder.canleds.off'), '0'],
                                    [i18n.tr('builder.canleds.on'), '1'],
                                    [i18n.tr('builder.canleds.fast'), '2'],
                                    [i18n.tr('builder.canleds.medium'), '3'],
                                    [i18n.tr('builder.canleds.slow'), '4'],
                                    [i18n.tr('builder.canleds.fade'), '5']
                                ]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_can_led'] = function (block) {
                let inputID = Blockly.Lua.valueToCode(block, 'CAN_INPUT', Blockly.Lua.ORDER_NONE);
                if (inputID === '' || inputID === '-1') {
                    return '';
                }
                let value = parseInt(block.getFieldValue('VALUE'));
                return [`${212 + value} ${inputID}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_all_outputs_off'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_all_outputs_off',
                        message0: i18n.tr('builder.alloutputsoff'),
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_all_outputs_off'] = function () {
                return ['164 0\n', Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_toggle_all_lights'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_toggle_all_lights',
                        message0: i18n.tr('builder.togglealllights'),
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_toggle_all_lights'] = function () {
                return ['173 255\n', Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_onoff_all_lights'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_onoff_all_lights',
                        message0: i18n.tr('builder.onoffalllights'),
                        args0: [
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [[i18n.tr('builder.on'), '1'], [i18n.tr('builder.off'), '0']]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_onoff_all_lights'] = function (block) {
                let value = parseInt(block.getFieldValue('VALUE'));
                return [`${171 + value} 255\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_toggle_floor'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_toggle_floor',
                        message0: i18n.tr('builder.togglefloor'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'FLOOR',
                                value: 0,
                                min: 0,
                                max: 254,
                                precision: 1
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_toggle_floor'] = function (block) {
                let floor = block.getFieldValue('FLOOR');
                return [`173 ${floor}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_onoff_floor'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_onoff_floor',
                        message0: i18n.tr('builder.onofffloor'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'FLOOR',
                                value: 0,
                                min: 0,
                                max: 254,
                                precision: 1
                            },
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [[i18n.tr('builder.on'), '1'], [i18n.tr('builder.off'), '0']]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_onoff_floor'] = function (block) {
                let floor = parseInt(block.getFieldValue('FLOOR'));
                let value = parseInt(block.getFieldValue('VALUE'));
                return [`${171 + value} ${floor}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_raw'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_raw',
                        message0: i18n.tr('builder.executeraw'),
                        args0: [
                            {
                                type: 'field_number',
                                name: 'ACTION',
                                value: 0,
                                min: 0,
                                max: 255
                            },
                            {
                                type: 'field_number',
                                name: 'NUMBER',
                                value: 0,
                                min: 0,
                                max: 255
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_raw'] = function (block) {
                let action = block.getFieldValue('ACTION');
                let number = block.getFieldValue('NUMBER');
                return [`${action} ${number}\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_toggle_follow'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_toggle_follow',
                        message0: i18n.tr('builder.togglefollow'),
                        args0: [
                            {
                                type: 'input_dummy'
                            },
                            {
                                type: 'input_statement',
                                name: 'TOGGLES',
                                check: ['om_toggle']
                            }
                        ],
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                },
                onchange: function () {
                    let toggles = Blockly.Lua.valueToCode(this, 'TOGGLES', Blockly.Lua.ORDER_NONE);
                    let warning = null;
                    let amount = 0;
                    for (let entry of toggles.trim().split('\n')) {
                        if (!entry.startsWith('162')) {
                            warning = i18n.tr('builder.warnnotoggle');
                            break;
                        } else {
                            amount++;
                        }
                    }
                    if (amount < 2) {
                        warning = i18n.tr('builder.warnnotoggle');
                    }
                    this.setWarningText(warning);
                }
            };
            Blockly.Lua['om_toggle_follow'] = function (block) {
                let toggles = Blockly.Lua.valueToCode(block, 'TOGGLES', Blockly.Lua.ORDER_NONE);
                if (toggles.trim().split('\n').length < 2) {
                    return '';
                }
                return [`174 0\n${toggles}175 0\n`, Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_change_shutters'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_change_shutters',
                        message0: i18n.tr('builder.shutters'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'SHUTTER',
                                check: ['om_placeholder_shutter', 'om_shutter', 'om_shutter_group']
                            },
                            {
                                type: 'field_dropdown',
                                name: 'ACTION',
                                options: [
                                    [i18n.tr('builder.shutter.up'), '0'],
                                    [i18n.tr('builder.shutter.down'), '1'],
                                    [i18n.tr('builder.shutter.stop'), '2'],
                                    [i18n.tr('builder.shutter.upstopdownstop'), '3'],
                                    [i18n.tr('builder.shutter.upstop'), '4'],
                                    [i18n.tr('builder.shutter.downstop'), '5']
                                ]
                            }
                        ],
                        inputsInline: true,
                        previousStatement: null,
                        nextStatement: null,
                        colour: 120
                    });
                }
            };
            Blockly.Lua['om_change_shutters'] = function (block) {
                let shutterBlock = block.getInputTargetBlock('SHUTTER');
                let shutterType = shutterBlock.type;
                let shutterID = Blockly.Lua.valueToCode(block, 'SHUTTER', Blockly.Lua.ORDER_NONE);
                if (shutterID === '' || shutterID === '-1') {
                    return '';
                }
                let value = parseInt(block.getFieldValue('ACTION'));
                if (shutterType === 'om_shutter') {
                    return [`${100 + (value <= 3 ? value : value + 4)} ${shutterID}\n`, Blockly.Lua.ORDER_NONE];
                }
                return [`${104 + (value <= 3 ? value : value + 2)} ${shutterID}\n`, Blockly.Lua.ORDER_NONE];
            };

            // Values
            Blockly.Blocks['om_dimmer_value'] = {
                init: function () {
                    let options = [];
                    for (let i = 0; i <= 10; i += 1) {
                        options.push([`${i * 10}%`, i.toString()]);
                    }
                    this.jsonInit({
                        type: 'om_dimmer_value',
                        message0: i18n.tr('builder.dimmerat'),
                        args0: [{
                            type: 'field_dropdown',
                            name: 'VALUE',
                            options: options
                        }],
                        output: 'om_dimmer_value',
                        colour: 210
                    });
                }
            };
            Blockly.Lua['om_dimmer_value'] = function (block) {
                return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
            };
            Blockly.Blocks['om_timer_value'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_timer_value',
                        message0: i18n.tr('builder.timerat'),
                        args0: [
                            {
                                type: 'field_dropdown',
                                name: 'VALUE',
                                options: [
                                    ['2m 30s', '0'],
                                    ['7m 30s', '1'],
                                    ['15m', '2'],
                                    ['25m', '3'],
                                    ['37m', '4'],
                                    ['52m', '5']
                                ]
                            },
                            {
                                type: 'field_dropdown',
                                name: 'RESET',
                                options: [
                                    [i18n.tr('builder.notresettimer'), '0'],
                                    [i18n.tr('builder.resettimer'), '1']
                                ]
                            }
                        ],
                        output: 'om_timer_value',
                        colour: 210
                    });
                }
            };
            resolve();
        });
    }
}
