import {customElement, bindable, bindingMode} from "aurelia-framework";
import {inject} from "aurelia-dependency-injection";
import {I18N} from "aurelia-i18n";
import * as Blockly from "node-blockly/lua";
import {API} from "../../components/api";
import {Toolbox} from "../../components/toolbox";

@bindable({
    name: 'config',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('blockly')
@inject(API, I18N, Blockly)
export class BlocklyWrapper {
    constructor(api, i18n, blockly) {
        this.api = api;
        this.i18n = i18n;
        this.loading = true;
        this.workspace = undefined;

        window.Blockly = blockly;
        window.i18n = i18n;
    }

    loadBlockly() {
        let startXML = '<xml><block type="om_start" deletable="false" movable="false" y="20" x="10"></block></xml>';

        this.loading = false;
        this.workspace = Blockly.inject('blockly-container', {
            toolbox: document.getElementById('blockly-toolbox')
        });
        this.workspace.addChangeListener(() => {
            let xml = Blockly.Xml.workspaceToDom(this.workspace);
            document.getElementById('blockly-xml').innerText = Toolbox.prettifyXml(xml);
            let code = Blockly.Lua.workspaceToCode(this.workspace);
            while (code.indexOf(',99') !== -1) {
                code = code.replace(',99', '');
            }
            code = code.trim();
            document.getElementById('blockly-code').innerText = code;
        });
        this.workspace.addChangeListener(Blockly.Events.disableOrphans);
        Blockly.BlockSvg.START_HAT = true;
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(startXML), this.workspace);
    }

    registerBlocks() {
        // Start
        Blockly.Blocks['om_start'] = {
            init: function () {
                this.jsonInit({
                    "type": "om_start",
                    "message0": i18n.tr('builder.start'),
                    "nextStatement": null,
                    "colour": 120
                });
            }
        };
        Blockly.Lua['om_start'] = function () {
            return '';
        };

        // Logic
        Blockly.Blocks['om_check_io_on'] = {
            init: function () {
                this.jsonInit({
                    type: "om_check_io_on",
                    message0: i18n.tr('builder.checkioon'),
                    args0: [
                        {
                            type: 'input_value',
                            name: 'TARGET',
                            check: ['om_placeholder_input_output', 'om_input', 'om_output']
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
                    output: null,
                    colour: 290
                });
            }
        };
        Blockly.Lua['om_check_io_on'] = function (block) {
            let ioID = Blockly.Lua.valueToCode(block, 'TARGET', Blockly.Lua.ORDER_NONE);
            if (ioID === '') {
                return '';
            }
            let on = block.getFieldValue('VALUE') === '1';
            let valueType = block.getInputTargetBlock('TARGET').type;
            let code = (241 + (valueType === 'om_input' ? 0 : 2) + (on ? 0 : 1)).toString() + ' ' + ioID + '\n';
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
                            options: [['set', '1'], ['cleared', '0']]
                        },
                        {
                            type: 'input_value',
                            name: 'NEXT',
                            check: ['om_placeholder_operator', 'om_where_operator']
                        }
                    ],
                    inputsInline: true,
                    output: null,
                    colour: 290
                });
            }
        };
        Blockly.Lua['om_check_validationbit'] = function (block) {
            let set = block.getFieldValue('VALUE') === '1';
            let bit = block.getFieldValue('BIT');
            let nextCode = Blockly.Lua.valueToCode(block, 'NEXT', Blockly.Lua.ORDER_NONE);
            let code = (245 + (set ? 0 : 1)).toString() + ' ' + bit + '\n';
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
                    output: null,
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
            let code = '247 ' + (sensorID + offset).toString() + '\n';
            code += (248 + check).toString() + ' ' + value + '\n';
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
                            check: ['om_placeholder_check', 'om_check_io_on']
                        }
                    ],
                    inputsInline: true,
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
            let code = '240 ' + operator + '\n';
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
                            check: ['om_placeholder_check', 'om_check_io_on']
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
            if (groupActionID === '') {
                return '';
            }
            return ['2 ' + groupActionID + '\n', Blockly.Lua.ORDER_NONE];
        };
        Blockly.Blocks['om_toggle_with'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_toggle_with',
                    message0: i18n.tr('builder.toggleoutputwithdimmer'),
                    args0: [
                        {
                            type: 'input_value',
                            name: 'OUTPUT',
                            check: ['om_placeholder_output', 'om_output']
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
        Blockly.Lua['om_toggle_with'] = function (block) {
            let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
            if (outputID === '') {
                return '';
            }
            let value = Blockly.Lua.valueToCode(block, 'VALUE', Blockly.Lua.ORDER_NONE);
            if (value == '') {
                return '';
            }
            value = parseInt(value);
            let valueType = block.getInputTargetBlock('VALUE').type;
            if (valueType === 'om_dimmer_value') {
                if (value === 0) {
                    return ['160 ' + outputID + '\n169 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
                }
                return [(184 + value).toString() + ' ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
            }
            return '';
        };
        Blockly.Blocks['om_output_on_with'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_output_on_with',
                    message0: i18n.tr('builder.outputonwithx'),
                    args0: [
                        {
                            type: 'input_value',
                            name: 'OUTPUT',
                            check: ['om_placeholder_output', 'om_output']
                        },
                        {
                            type: 'input_value',
                            name: 'VALUE',
                            check: ['om_placeholder_dimmer_timer_value', 'om_dimmer_value', 'om_timer_value']
                        }
                    ],
                    inputsInline: true,
                    previousStatement: null,
                    nextStatement: null,
                    colour: 120
                });
            }
        };
        Blockly.Lua['om_output_on_with'] = function (block) {
            let outputID = Blockly.Lua.valueToCode(block, 'OUTPUT', Blockly.Lua.ORDER_NONE);
            if (outputID === '') {
                return '';
            }

            let valueBlock = block.getInputTargetBlock('VALUE');
            let valueType = valueBlock.type;
            if (valueType === 'om_dimmer_value') {
                let value = Blockly.Lua.valueToCode(block, 'VALUE', Blockly.Lua.ORDER_NONE);
                if (value == '') {
                    return '';
                }
                value = parseInt(value);
                if (value === 0) {
                    return ['161 ' + outputID + '\n169 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
                }
                if (value === 10) {
                    return ['161 ' + outputID + '\n170 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
                }
                return [(175 + value).toString() + ' ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
            }
            if (valueType === 'om_timer_value') {
                let value = parseInt(valueBlock.getFieldValue('VALUE'));
                let reset = valueBlock.getFieldValue('RESET') === '1';
                return [((reset ? 195 : 201) + value).toString() + ' ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
            }
            return '';
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
        Blockly.Lua['om_raw'] = function(block) {
            let action = block.getFieldValue('ACTION');
            let number = block.getFieldValue('NUMBER');
            return [action + ' ' + number + '\n', Blockly.Lua.ORDER_NONE];
        };

        // Values
        Blockly.Blocks['om_dimmer_value'] = {
            init: function () {
                let options = [];
                for (let i = 0; i <= 10; i += 1) {
                    options.push([(i * 10) + '%', i.toString()]);
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
    }

    registerEnvironmentBlocks() {
        let groupActions = this.api.getGroupActionConfigurations(false)
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
        let outputs = this.api.getOutputConfigurations(undefined, false)
            .then((data) => {
                let options = [];
                for (let output of data.config) {
                    if (output.name !== '' && output.name !== 'NOT_IN_USE') {
                        options.push([output.name, output.id.toString()]);
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
                                options: options
                            }],
                            output: 'om_output',
                            colour: 65
                        });
                    }
                };
                Blockly.Lua['om_output'] = function (block) {
                    return [block.getFieldValue('VALUE'), Blockly.Lua.ORDER_NONE];
                };
            });
        let inputs = this.api.getInputConfigurations(undefined, false)
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
            this.api.getSensorConfigurations(undefined, false),
            this.api.getSensorTemperatureStatus(false),
            this.api.getSensorHumidityStatus(false),
            this.api.getSensorBrightnessStatus(false)
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
        return Promise.all([groupActions, outputs, inputs, sensors]);
    };

    registerPlaceholderBlocks() {
        let placeholders = [
            ['check', 'check', 290, 1],
            ['operator', 'operator', 290, 1],
            ['action', 'action', 290, 2],
            ['optionalaction', 'optionalaction', 290, 2],
            ['dimmer_value', 'dimmervalue', 210, 1],
            ['dimmer_timer_value', 'dimmertimervalue', 210, 1],
            ['input_output', 'inputoutput', 65, 1],
            ['groupaction', 'groupaction', 65, 1],
            ['output', 'output', 65, 1],
            ['input', 'input', 65, 1],
            ['sensor', 'sensor', 65, 1]
        ];
        for (let placeholder of placeholders) {
            let name = 'om_placeholder_' + placeholder[0];
            Blockly.Blocks[name] = {
                init: function () {
                    let json = {
                        type: name,
                        message0: i18n.tr('builder.placeholders.' + placeholder[1]),
                        colour: placeholder[2]
                    };
                    if (placeholder[3] === 1) {
                        json.output = name;
                    } else if (placeholder[3] === 2) {
                        json.previousStatement = null;
                        json.nextStatement = null;
                    }
                    this.jsonInit(json);
                }
            };
            Blockly.Lua[name] = function () {
                return '';
            };
        }
    }

    // Aurelia
    attached() {
        this.registerBlocks();
        this.registerPlaceholderBlocks();
        this.registerEnvironmentBlocks()
            .then(() => {
                this.loadBlockly();
            });
    };
}
