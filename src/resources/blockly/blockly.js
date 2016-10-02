import {customElement, bindable, bindingMode} from "aurelia-framework";
import * as Blockly from "node-blockly/lua";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Storage} from "../../components/storage";

@bindable({
    name: 'actions',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'loaded',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('blockly')
export class BlocklyWrapper extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.debugMode = Storage.getItem('debug');
        this.loading = true;
        this.space = undefined;
        this.startXML = undefined;
        this.hasChange = false;
        this.debug = false;

        window.Blockly = Blockly;
        window.i18n = Shared.get('i18n');
    }

    toggleDebug() {
        this.debug = !this.debug;
    }

    loadBlockly() {
        this.space = Blockly.inject('blockly-container', {
            toolbox: document.getElementById('blockly-toolbox')
        });
        this.space.addChangeListener(() => {
            // XML preview
            let xml = Blockly.Xml.workspaceToDom(this.space);
            document.getElementById('blockly-xml').innerText = Toolbox.prettifyXml(xml);
            // Fetch code
            let code = Blockly.Lua.workspaceToCode(this.space);
            while (code.indexOf(',99') !== -1) {
                code = code.replace(',99', '');
            }
            code = code.trim();
            // Code to actions-string
            let newActions = code.split(/[ \n]/).join(',');
            if (this.actions !== newActions) {
                this.hasChange = true;
            }
            this.actions = newActions;
        });
        this.space.addChangeListener(Blockly.Events.disableOrphans);
        Blockly.BlockSvg.START_HAT = true;
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(this.startXML), this.space);
        this.loading = false;
    }

    registerBlocks() {
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
                                options: [[i18n.tr('builder.set'), '1'], [i18n.tr('builder.cleared'), '0']]
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
                    let code = Blockly.Lua.valueToCode(block, 'GROUPACTION_' + value, Blockly.Lua.ORDER_NONE);
                    if (code !== '') {
                        commands.push((205 + value) + ' ' + code + '\n');
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
                return ['60 ' + number + '\n', Blockly.Lua.ORDER_NONE];
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
                return [(237 + action).toString() + ' ' + bit + '\n', Blockly.Lua.ORDER_NONE];
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
                                check: ['om_placeholder_output', 'om_output']
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
                if (outputID === '') {
                    return '';
                }
                return ['162 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
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
            Blockly.Blocks['om_output_onoff'] = {
                init: function () {
                    this.jsonInit({
                        type: 'om_output_onoff',
                        message0: i18n.tr('builder.outputonoff'),
                        args0: [
                            {
                                type: 'input_value',
                                name: 'OUTPUT',
                                check: ['om_placeholder_output', 'om_output']
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
                if (outputID === '') {
                    return '';
                }
                let value = parseInt(block.getFieldValue('VALUE'));
                return [(160 + value).toString() + ' ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
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
                        return ['165 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
                    }
                    if (value === 10) {
                        return ['166 ' + outputID + '\n', Blockly.Lua.ORDER_NONE];
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
            Blockly.Lua['om_raw'] = function (block) {
                let action = block.getFieldValue('ACTION');
                let number = block.getFieldValue('NUMBER');
                return [action + ' ' + number + '\n', Blockly.Lua.ORDER_NONE];
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
                return ['174 0\n' + toggles + '175 0\n', Blockly.Lua.ORDER_NONE];
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
            resolve();
        });
    }

    registerEnvironmentBlocks() {
        let groupActions = this.api.getGroupActionConfigurations({dedupe: false})
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
        let outputs = this.api.getOutputConfigurations(undefined, {dedupe: false})
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
        let inputs = this.api.getInputConfigurations(undefined, {dedupe: false})
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
            this.api.getSensorConfigurations(undefined, {dedupe: false}),
            this.api.getSensorTemperatureStatus({dedupe: false}),
            this.api.getSensorHumidityStatus({dedupe: false}),
            this.api.getSensorBrightnessStatus({dedupe: false})
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
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Environment information');
                }
            });
    };

    registerPlaceholderBlocks() {
        return new Promise((resolve) => {
            let placeholders = [
                ['check', 'check', 290, 1],
                ['operator', 'operator', 290, 1],
                ['action', 'action', 290, 2],
                ['optionalaction', 'optionalaction', 290, 2],
                ['dimmer_value', 'dimmervalue', 210, 1],
                ['dimmer_timer_value', 'dimmertimervalue', 210, 1],
                ['toggle', 'toggle', 120, 2],
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
            resolve();
        });
    }

    generateStartXML() {
        // TODO: Add shadow blocks
        return new Promise((resolve) => {
            let actions = [];
            if (this.actions !== undefined && this.actions !== '') {
                actions = this.actions.split(',');
            }
            for (let i = 0; i < actions.length; i++) {
                actions[i] = parseInt(actions[i]);
            }
            let parser = new DOMParser();
            let xml = parser.parseFromString('<xml></xml>', 'text/xml');
            let root = xml.childNodes[0];
            let block = xml.createElement('block');
            root.appendChild(block);
            block.setAttribute('type', 'om_start');
            block.setAttribute('deletable', 'false');
            block.setAttribute('movable', 'false');
            block.setAttribute('x', '10');
            block.setAttribute('y', '20');
            let next = xml.createElement('next');
            block.appendChild(next);
            BlocklyWrapper.generateXMLChunck(xml, next, actions);
            let serializer = new XMLSerializer();
            this.startXML = serializer.serializeToString(xml);
            console.log(this.startXML);
            resolve();
        });
    }

    static generateXMLChunck(xml, parent, actions) {
        console.log('Processing ' + JSON.stringify(actions));
        let i = 0;
        let next = parent;
        while (true) {
            if (i >= actions.length)
                break;
            let action = actions[i];
            let number = actions[i + 1];
            let block = xml.createElement('block');
            next.appendChild(block);
            if (action === 2) {
                // om_exec_groupaction - Execute Group Action
                console.log('Found 2: om_exec_groupaction');
                block.setAttribute('type', 'om_exec_groupaction');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'GROUPACTION');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_groupaction');
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action === 60) {
                // om_send_event - Send event
                console.log('Found 60: om_send_event');
                block.setAttribute('type', 'om_send_event');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'NUMBER');
                field.textContent = number;
            } else if (action === 161 || (action === 160 && (actions.length <= i + 2 || actions[i + 2] !== 169))) {
                // om_output_onoff - Turn an Output on/off
                console.log('Found 160|161: om_output_onoff');
                block.setAttribute('type', 'om_output_onoff');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action === 160 ? '0' : '1';
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_output');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action === 162) {
                // om_toggle - Toggles output
                console.log('Found 162: om_toggle');
                block.setAttribute('type', 'om_toggle');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_output');
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action === 174) {
                // om_toggle_follow - Let a group of toggles follow the first
                console.log('Found 174: om_follow_toggle');
                block.setAttribute('type', 'om_toggle_follow');
                let statement = xml.createElement('statement');
                block.appendChild(statement);
                statement.setAttribute('name', 'TOGGLES');
                let toggles = [];
                i += 2;
                while (actions[i] !== 175) {
                    toggles.push(actions[i]);
                    toggles.push(actions[i + 1]);
                    i += 2;
                }
                console.log('+ Toggles');
                BlocklyWrapper.generateXMLChunck(xml, statement, toggles);
                console.log('+ End follow toggle')
            } else if ((action >= 176 && action <= 184) || (action >= 195 && action <= 206) || action === 165 || action === 166) {
                // om_output_on_with - Output ON with dimmer at X
                console.log('Found 165|166|176-184|195-206: om_output_on_with');
                block.setAttribute('type', 'om_output_on_with');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_output');
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
                value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'VALUE');
                innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                if (action >= 195 && action <= 206) {
                    innerBlock.setAttribute('type', 'om_timer_value');
                    field = xml.createElement('field');
                    innerBlock.appendChild(field);
                    field.setAttribute('name', 'VALUE');
                    field.textContent = action >= 201 ? action - 201 : action - 195;
                    field = xml.createElement('field');
                    innerBlock.appendChild(field);
                    field.setAttribute('name', 'RESET');
                    field.textContent = action >= 201 ? '0' : '1';
                } else {
                    innerBlock.setAttribute('type', 'om_dimmer_value');
                    field = xml.createElement('field');
                    innerBlock.appendChild(field);
                    field.setAttribute('name', 'VALUE');
                    if (action === 165) {
                        field.textContent = '0';
                    } else if (action === 166) {
                        field.textContent = '10';
                    } else {
                        field.textContent = action - 176 + 1;
                    }
                }
            } else if ((action >= 185 && action <= 194) || action === 160) {
                // om_toggle_with - Toggle output with dimmer at X
                console.log('Found 185-194|160+169: om_toggle_with');
                block.setAttribute('type', 'om_toggle_with');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_output');
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
                value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'VALUE');
                innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_dimmer_value');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action === 160 ? '0' : action - 184;
                if (action === 160) {
                    i += 2;
                }
            } else if ([207, 208, 209, 210, 211, 236].contains(action)) {
                // om_delayed_set - Delaying actions
                console.log('Found 207|208|209|210|211|236: om_delayed_set');
                block.setAttribute('type', 'om_delayed_set');
                let delayed = {
                    2: undefined,
                    3: undefined,
                    4: undefined,
                    5: undefined,
                    6: undefined
                };
                let j = i;
                while (true) {
                    if (j >= actions.length) {
                        break;
                    }
                    if ([207, 208, 209, 210, 211].contains(actions[j])) {
                        delayed[actions[j] - 205] = actions[j + 1];
                        actions.splice(j, 2);
                    } else if (actions[j] === 236) {
                        let start = j;
                        let length = 0;
                        let statement = xml.createElement('statement');
                        block.appendChild(statement);
                        statement.setAttribute('name', 'ACTIONS');
                        let releaseActions = [];
                        j += 2;
                        while (actions[j] !== 236 || actions[j + 1] !== 255) {
                            releaseActions.push(actions[j]);
                            releaseActions.push(actions[j + 1]);
                            j += 2;
                            length += 2;
                        }
                        length += 2;
                        console.log('+ Release actions');
                        BlocklyWrapper.generateXMLChunck(xml, statement, releaseActions);
                        actions.splice(start, length);
                    } else {
                        j += 2;
                    }
                }
                console.log('+ Delayed actions: ' + JSON.stringify(delayed));
                for (let delay of [2, 3, 4, 5, 6]) {
                    let value = xml.createElement('value');
                    block.appendChild(value);
                    value.setAttribute('name', 'GROUPACTION_' + delay);
                    if (delayed[delay] !== undefined) {
                        let innerBlock = xml.createElement('block');
                        value.appendChild(innerBlock);
                        innerBlock.setAttribute('type', 'om_groupaction');
                        let field = xml.createElement('field');
                        innerBlock.appendChild(field);
                        field.setAttribute('name', 'VALUE');
                        field.textContent = delayed[delay];
                    }
                }
                console.log('+ End delayed');
            } else if ([237, 238, 239].contains(action)) {
                // om_set_bit - Sets/clears/toggles bit
                console.log('Found 237|238|239: om_set_bit');
                block.setAttribute('type', 'om_set_bit');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'ACTION');
                field.textContent = parseInt(action) - 237;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'BIT');
                field.textContent = number;
            } else if (action === 240 && number === 0) {
                // om_if - If structure
                console.log('Found 240.0: om_if');
                block.setAttribute('type', 'om_if');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'CHECK');
                let checkActions = [];
                i += 2;
                while (actions[i] !== 240 || actions[i + 1] !== 10) {
                    checkActions.push(actions[i]);
                    checkActions.push(actions[i + 1]);
                    i += 2;
                }
                console.log('+ Check');
                BlocklyWrapper.generateXMLChunck(xml, value, checkActions);
                let statement = xml.createElement('statement');
                block.appendChild(statement);
                statement.setAttribute('name', 'THEN');
                let thenActions = [];
                i += 2;
                while (actions[i] !== 240 || (actions[i + 1] !== 20 && actions[i + 1] !== 255)) {
                    thenActions.push(actions[i]);
                    thenActions.push(actions[i + 1]);
                    i += 2;
                }
                console.log('+ Then');
                BlocklyWrapper.generateXMLChunck(xml, statement, thenActions);
                if (actions[i + 1] === 20) {
                    statement = xml.createElement('statement');
                    block.appendChild(statement);
                    statement.setAttribute('name', 'ELSE');
                    let elseActions = [];
                    i += 2;
                    while (actions[i] !== 240 || actions[i + 1] !== 255) {
                        elseActions.push(actions[i]);
                        elseActions.push(actions[i + 1]);
                        i += 2;
                    }
                    console.log('+ Else');
                    BlocklyWrapper.generateXMLChunck(xml, statement, elseActions);
                }
                console.log('+ End if')
            } else if (action === 240 && number >= 1 && number <= 6) {
                // om_where_operator - AND/OR/...
                console.log('Found 240.1-6: om_where_operator');
                block.setAttribute('type', 'om_where_operator');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'NEXT');
                let nextActions = [];
                i += 2;
                while (i < actions.length) {
                    nextActions.push(actions[i]);
                    i++;
                }
                console.log('+ continue');
                BlocklyWrapper.generateXMLChunck(xml, value, nextActions);
            } else if (action >= 241 && action <= 244) {
                // om_check_io_on - Check if input/output is on/off
                console.log('Found 241|242|243|244: om_check_io_on');
                block.setAttribute('type', 'om_check_io_on');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = (action === 241 || action === 243) ? '1' : '0';
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'TARGET');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', (action === 241 || action === 242) ? 'om_input' : 'om_output');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
                value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'NEXT');
                let nextActions = [];
                i += 2;
                while (i < actions.length) {
                    nextActions.push(actions[i]);
                    i++;
                }
                console.log('+ continue');
                BlocklyWrapper.generateXMLChunck(xml, value, nextActions);
            } else if ([245, 246].contains(action)) {
                // om_check_validationbit - Check if bit is set/cleared
                console.log('Found 245|246: om_check_validationbit');
                block.setAttribute('type', 'om_check_validationbit');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'BIT');
                field.textContent = number;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action === 245 ? '1' : '0';
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'NEXT');
                let nextActions = [];
                i += 2;
                while (i < actions.length) {
                    nextActions.push(actions[i]);
                    i++;
                }
                console.log('+ continue');
                BlocklyWrapper.generateXMLChunck(xml, value, nextActions);
            } else {
                // om_raw - Contains 'unknown' actions
                console.log('Unsupported action: om_raw');
                block.setAttribute('type', 'om_raw');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'ACTION');
                field.textContent = action;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'NUMBER');
                field.textContent = number;
            }
            next = xml.createElement('next');
            block.appendChild(next);
            i += 2;
        }
    }

    // Aurelia
    attached() {
        super.attached();
        Promise.all([
            this.generateStartXML(),
            this.registerBlocks(),
            this.registerPlaceholderBlocks(),
            this.registerEnvironmentBlocks()
        ]).then(() => {
            this.loadBlockly();
            if (this.loaded !== undefined) {
                this.loaded();
            }
        });
    };
}
