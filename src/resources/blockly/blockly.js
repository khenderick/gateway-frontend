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
import {customElement, bindable, bindingMode} from "aurelia-framework";
import * as Blockly from "node-blockly/lua";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
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
            toolbox: document.getElementById('blockly-toolbox'),
            trashcan: false
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

    // Aurelia
    attached() {
        super.attached();
        Promise.all([
            BlocklyXML.generateStartXML(this.actions)
                .then((startXML) => {
                    this.startXML = startXML;
                }),
            BlocklyBlocks.registerBlocks(i18n),
            this.registerPlaceholderBlocks(),
            BlocklyEnvironment.registerEnvironmentBlocks(this.api, i18n)
        ]).then(() => {
            this.loadBlockly();
            if (this.loaded !== undefined) {
                this.loaded();
            }
        });
    };
}
