/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {customElement, bindable, bindingMode} from "aurelia-framework";
import * as Blockly from "node-blockly/lua";
import {Base} from "../../resources/base";
import {Toolbox} from "../../components/toolbox";
import {Storage} from "../../components/storage";
import {BlocklyEnvironment} from "./blockly-env";
import {BlocklyXML} from "./blockly-xml";
import {BlocklyBlocks} from "./blockly-blocks";

@bindable({
    name: 'actions',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'maxlength',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'errors',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('blockly')
export class BlocklyWrapper extends Base {
    constructor(...rest) {
        super(...rest);
        this.debugMode = Storage.getItem('debug');
        this.loading = true;
        this.space = undefined;
        this.startXML = undefined;
        this.hasChange = false;
        this.debug = false;
        this.selectedBlock = null;

        window.Blockly = Blockly;
        window.i18n = this.i18n;
    }

    validate() {
        this.errors = [];
        let actions = this.actions;
        if (actions.length > this.maxlength * 2) {
            this.errors.push('toolong');
        } else if (this.actions === undefined || this.actions === '' || actions.length === 0) {
            this.errors.push('noactions');
        }
        let openIf = false;
        for (let i = 0; i < actions.length - 1; i += 2) {
            let action = actions[i];
            let number = actions[i + 1];
            if (action === 240) {
                if (number === 0) {
                    if (openIf && !this.errors.contains('nestedif')) {
                        this.errors.push('nestedif');
                    }
                    openIf = true;
                } else if (number === 255) {
                    openIf = false;
                }
            }
        }
    }

    toggleDebug() {
        this.debug = !this.debug;
    }

    loadBlockly() {
        this.space = Blockly.inject('blockly-container', {
            toolbox: document.getElementById('blockly-toolbox'),
            trashcan: false
        });
        this.space.addChangeListener((event) => {
            // XML preview
            let xml = Blockly.Xml.workspaceToDom(this.space);
            document.getElementById('blockly-xml').innerText = Toolbox.prettifyXml(xml);
            // Fetch code
            let code = Blockly.Lua.workspaceToCode(this.space);
            while (code.contains(',99')) {
                code = code.replace(',99', '');
            }
            code = code.trim();
            // Code to actions-string
            let newActions = code === '' ? [] : code.split(/[ \n]/).map(i => { return parseInt(i); });
            if (this.actions.join(',') !== newActions.join(',')) {
                this.hasChange = true;
            }
            this.actions = newActions;
            this.validate();
            if (event.type === Blockly.Events.UI && event.element === 'selected') {
                if (event.newValue != null) {
                    let block = this.space.getBlockById(event.newValue);
                    this.selectedBlock = block.type;
                } else {
                    this.selectedBlock = null;
                }
            }
        });
        this.space.addChangeListener(Blockly.Events.disableOrphans);
        Blockly.BlockSvg.START_HAT = true;
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(this.startXML), this.space);
        this.loading = false;
    }

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
                ['can_input', 'caninput', 65, 1],
                ['sensor', 'sensor', 65, 1],
                ['dimmer', 'dimmer', 65, 1],
                ['shutter', 'shutter', 65, 1]
            ];
            for (let placeholder of placeholders) {
                let name = `om_placeholder_${placeholder[0]}`;
                Blockly.Blocks[name] = {
                    init: function () {
                        let json = {
                            type: name,
                            message0: i18n.tr(`builder.placeholders.${placeholder[1]}`),
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

    // Aurelia
    async attached() {
        super.attached();
        try {
            await Promise.all([
                (async () => {
                    this.startXML = await BlocklyXML.generateStartXML(this.actions);
                })(),
                BlocklyBlocks.registerBlocks(i18n),
                this.registerPlaceholderBlocks(),
                BlocklyEnvironment.registerEnvironmentBlocks(this.api, i18n)
            ]);
            this.loadBlockly();
        } catch (error) {
            console.error(error);
        }
    };
}
