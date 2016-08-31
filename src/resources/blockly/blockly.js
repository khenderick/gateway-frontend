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
                            check: ['om_input', 'om_output']
                        },
                        {
                            type: 'field_dropdown',
                            name: 'VALUE',
                            options: [['on', '1'], ['off', '0']]
                        },
                        {
                            type: 'input_value',
                            name: 'NEXT',
                            check: ['om_if_operation']
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
        Blockly.Blocks['om_if_operation'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_if_operation',
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
                            check: ['om_check_io_on']
                        }
                    ],
                    inputsInline: true,
                    output: 'om_if_operation',
                    colour: 290
                });
            }
        };
        Blockly.Lua['om_if_operation'] = function (block) {
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
                            name: 'IF',
                            align: 'RIGHT',
                            check: ['om_check_io_on']
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
            let ifCode = Blockly.Lua.valueToCode(block, 'IF', Blockly.Lua.ORDER_NONE);
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

        // Statements
        Blockly.Blocks['om_exec_groupaction'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_exec_groupaction',
                    message0: i18n.tr('builder.execgroupaction'),
                    args0: [
                        {
                            type: 'input_value',
                            name: 'GROUPACTION',
                            check: ['om_groupaction']
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
                            check: ['om_output']
                        },
                        {
                            type: 'input_value',
                            name: 'VALUE',
                            check: ['om_dimmer_value']
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
                            check: ['om_output']
                        },
                        {
                            type: 'input_value',
                            name: 'VALUE',
                            check: ['om_dimmer_value', 'om_timer_value']
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
        return Promise.all([groupActions, outputs, inputs]);
    };

    registerPlaceholderBlocks() {
        Blockly.Blocks['om_if_operation_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_if_operation',
                    message0: i18n.tr('builder.ifoperatorplaceholder'),
                    output: 'om_if_operation',
                    colour: 290
                })
            }
        };
        Blockly.Lua['om_if_operation_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_dimmer_value_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_dimmer_value',
                    message0: i18n.tr('builder.dimmeratplaceholder'),
                    output: 'om_dimmer_value',
                    colour: 210,
                });
            }
        };
        Blockly.Lua['om_dimmer_value_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_dimmer_timer_value_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_timer_value',
                    message0: i18n.tr('builder.dimmertimeratplaceholder'),
                    output: 'om_timer_value',
                    colour: 210,
                });
            }
        };
        Blockly.Lua['om_dimmer_timer_value_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_input_output_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_output',
                    message0: i18n.tr('builder.inputoutputplaceholder'),
                    output: 'om_output',
                    colour: 65,
                });
            }
        };
        Blockly.Lua['om_input_output_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_groupaction_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_groupaction',
                    message0: i18n.tr('builder.groupactionxplaceholder'),
                    output: 'om_groupaction',
                    colour: 65,
                });
            }
        };
        Blockly.Lua['om_groupaction_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_output_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_output',
                    message0: i18n.tr('builder.outputxplaceholder'),
                    output: 'om_output',
                    colour: 65,
                });
            }
        };
        Blockly.Lua['om_output_placeholder'] = function () {
            return '';
        };
        Blockly.Blocks['om_input_placeholder'] = {
            init: function () {
                this.jsonInit({
                    type: 'om_input',
                    message0: i18n.tr('builder.inputxplaceholder'),
                    output: 'om_input',
                    colour: 65,
                });
            }
        };
        Blockly.Lua['om_input_placeholder'] = function () {
            return '';
        };
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
