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
import {Logger} from '../../components/logger';

export class BlocklyXML {
    static log(prefix, message) {
        Logger.debug(prefix + message);
    }

    static generateStartXML(actions) {
        // TODO: Add shadow blocks
        let parsedActions = [];
        if (actions !== undefined) {
            parsedActions = actions.slice();
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
        BlocklyXML.generateXMLChunck('', xml, next, parsedActions);
        let serializer = new XMLSerializer();
        let startXML = serializer.serializeToString(xml);
        BlocklyXML.log('', startXML);
        return startXML;
    }

    static generateXMLChunck(prefix, xml, parent, actions) {
        BlocklyXML.log(prefix, `Processing ${JSON.stringify(actions)}`);
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
                BlocklyXML.log(prefix, `Found ${action},${number} in 2: om_exec_groupaction`);
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
                BlocklyXML.log(prefix, `Found ${action},${number} in 60: om_send_event`);
                block.setAttribute('type', 'om_send_event');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'NUMBER');
                field.textContent = number;
            } else if (action >= 100 && action <= 111) {
                // om_change_shutters - Change shutters
                BlocklyXML.log(prefix, `Found ${action},${number} in 100-111: om_change_shutters`);
                block.setAttribute('type', 'om_change_shutters');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'ACTION');
                if ([100, 101, 102, 103, 108, 109].contains(action)) {
                    field.textContent = action <= 103 ? action - 100 : action - 104;
                } else {
                    field.textContent = action <= 107 ? action - 104 : action - 106;
                }
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'SHUTTER');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                if ([100, 101, 102, 103, 108, 109].contains(action)) {
                    innerBlock.setAttribute('type', 'om_shutter');
                } else {
                    innerBlock.setAttribute('type', 'om_shutter_group');
                }
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action >= 120 && action <= 126) {
                // om_set_variable - Set variable
                BlocklyXML.log(prefix, `Found ${action},${number} in 120-126: om_set_variable`);
                block.setAttribute('type', 'om_set_variable');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'ACTION');
                field.textContent = action - 120;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VARIABLE');
                field.textContent = number;
            } else if (action >= 154 && action <= 159) {
                // om_fade - Fade dimmer up/down
                BlocklyXML.log(prefix, `Found ${action},${number} in 154-159: om_fade`);
                block.setAttribute('type', 'om_fade');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'DIRECTION');
                field.textContent = action < 157 ? 1 : 3;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'STEPS');
                field.textContent = action < 157 ? action - 154 : action - 157;
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'DIMMER');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_dimmer');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action === 161 || (action === 160 && (actions.length <= i + 2 || actions[i + 2] !== 169))) {
                // om_output_onoff - Turn an Output on/off
                BlocklyXML.log(prefix, `Found ${action},${number} in 160|161: om_output_onoff`);
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
                BlocklyXML.log(prefix, `Found ${action},${number} in 162: om_toggle`);
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
            } else if (action === 164) {
                // om_all_outputs_off - Turn all Outputs off
                BlocklyXML.log(prefix, `Found ${action},${number} in 164: om_all_outputs_off`);
                block.setAttribute('type', 'om_all_outputs_off');
            } else if (action === 163 || action === 171 || action === 172) {
                // om_onoff_all_lights or om_onoff_floor - Turn all lights (on a floor) on/off
                BlocklyXML.log(prefix, `Found ${action},${number} in 163|171|172: om_onoff_all_lights or om_onoff_floor`);
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action === 172 ? 1 : 0;
                if (number === 255 || action === 163) {
                    block.setAttribute('type', 'om_onoff_all_lights');
                } else {
                    block.setAttribute('type', 'om_onoff_floor');
                    field = xml.createElement('field');
                    block.appendChild(field);
                    field.setAttribute('name', 'FLOOR');
                    field.textContent = number;
                }
            } else if (action === 173) {
                // om_toggle_all_lights or om_toggle_floor - Toggle all lights (on a given floor)
                BlocklyXML.log(prefix, `Found ${action},${number} in 173: om_toggle_all_lights or om_toggle_floor`);
                if (number === 255) {
                    block.setAttribute('type', 'om_toggle_all_lights');
                } else {
                    block.setAttribute('type', 'om_toggle_floor');
                    let field = xml.createElement('field');
                    block.appendChild(field);
                    field.setAttribute('name', 'FLOOR');
                    field.textContent = number;
                }
            } else if (action === 174) {
                // om_toggle_follow - Let a group of toggles follow the first
                BlocklyXML.log(prefix, `Found ${action},${number} in 174: om_follow_toggle`);
                block.setAttribute('type', 'om_toggle_follow');
                let statement = xml.createElement('statement');
                block.appendChild(statement);
                statement.setAttribute('name', 'TOGGLES');
                let toggles = [];
                i += 2;
                while (actions[i] !== 175 && i < actions.length - 1) {
                    toggles.push(actions[i]);
                    toggles.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ Toggles');
                BlocklyXML.generateXMLChunck(`${prefix}| `, xml, statement, toggles);
                BlocklyXML.log(prefix, '+ End follow toggle');
            } else if ((action >= 176 && action <= 184) || action === 165 || action === 166) {
                // om_output_on_with_dimmer - Output ON with dimmer at X
                BlocklyXML.log(prefix, `Found ${action},${number} in 165|166|176-184: om_output_on_with_dimmer`);
                block.setAttribute('type', 'om_output_on_with_dimmer');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_dimmer');
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
                if (action === 165) {
                    field.textContent = '0';
                } else if (action === 166) {
                    field.textContent = '10';
                } else {
                    field.textContent = action - 176 + 1;
                }
            } else if (action >= 195 && action <= 206) {
                // om_output_on_with_timer - Output ON with timer at X
                BlocklyXML.log(prefix, `Found ${action},${number} in 195-206: om_output_on_with_timer`);
                block.setAttribute('type', 'om_output_on_with_timer');
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
                innerBlock.setAttribute('type', 'om_timer_value');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action >= 201 ? action - 201 : action - 195;
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'RESET');
                field.textContent = action >= 201 ? '0' : '1';
            } else if ((action >= 185 && action <= 194) || action === 160) {
                // om_toggle_with_dimmer - Toggle output with dimmer at X
                BlocklyXML.log(prefix, `Found ${action},${number} in 185-194|160+169: om_toggle_with_dimmer`);
                block.setAttribute('type', 'om_toggle_with_dimmer');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'OUTPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_dimmer');
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
                value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'VALUE');
                innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);n
                innerBlock.setAttribute('type', 'om_dimmer_value');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action === 160 ? '0' : action - 184;
                if (action === 160) {
                    i += 2;  // action 169 will be added, skipping
                }
            } else if ([207, 208, 209, 210, 211, 236].contains(action)) {
                // om_delayed_set - Delaying actions
                BlocklyXML.log(prefix, `Found ${action},${number} in 207|208|209|210|211|236: om_delayed_set`);
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
                        while ((actions[j] !== 236 || actions[j + 1] !== 255) && j < actions.length - 1) {
                            releaseActions.push(actions[j]);
                            releaseActions.push(actions[j + 1]);
                            j += 2;
                            length += 2;
                        }
                        length += 2;
                        BlocklyXML.log(prefix, '+ Release actions');
                        BlocklyXML.generateXMLChunck(`${prefix}| `, xml, statement, releaseActions);
                        actions.splice(start, length);
                    } else {
                        j += 2;
                    }
                }
                BlocklyXML.log(prefix, `+ Delayed actions: ${JSON.stringify(delayed)}`);
                for (let delay of [2, 3, 4, 5, 6]) {
                    let value = xml.createElement('value');
                    block.appendChild(value);
                    value.setAttribute('name', `GROUPACTION_${delay}`);
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
                BlocklyXML.log(prefix, '+ End delayed');
            } else if (action >= 212 && action <= 217) {
                // om_can_led - Controls CAN Input LED feedback
                BlocklyXML.log(prefix, `Found ${action},${number} in 212-217: om_can_led`);
                block.setAttribute('type', 'om_can_led');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = action - 212;
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'CAN_INPUT');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                innerBlock.setAttribute('type', 'om_can_input');
                field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number;
            } else if (action === 235) {
                // om_delay - Delays a set of instruction
                BlocklyXML.log(prefix, `Found ${action},${number} in 235: om_delay`);
                block.setAttribute('type', 'om_delay');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'DELAY');
                field.textContent = number;
                let statement = xml.createElement('statement');
                block.appendChild(statement);
                statement.setAttribute('name', 'ACTIONS');
                let delayedActions = [];
                i += 2;
                while (actions[i] !== 235 && i < actions.length - 1) {
                    delayedActions.push(actions[i]);
                    delayedActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ Delayed');
                BlocklyXML.generateXMLChunck(`${prefix}| `, xml, statement, delayedActions);
                BlocklyXML.log(prefix, '+ End delayed');
            } else if ([237, 238, 239].contains(action)) {
                // om_set_bit - Sets/clears/toggles bit
                BlocklyXML.log(prefix, `Found ${action},${number} in 237|238|239: om_set_bit`);
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
                BlocklyXML.log(prefix, `Found ${action},${number} in 240.0: om_if`);
                block.setAttribute('type', 'om_if');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'CHECK');
                let checkActions = [];
                i += 2;
                while ((actions[i] !== 240 || actions[i + 1] !== 10) && i < actions.length - 1) {
                    checkActions.push(actions[i]);
                    checkActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ If');
                BlocklyXML.generateXMLChunck(`${prefix}| `, xml, value, checkActions);
                let statement = xml.createElement('statement');
                block.appendChild(statement);
                statement.setAttribute('name', 'THEN');
                let thenActions = [];
                i += 2;
                while ((actions[i] !== 240 || (actions[i + 1] !== 20 && actions[i + 1] !== 255)) && i < actions.length - 1) {
                    thenActions.push(actions[i]);
                    thenActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ Then');
                BlocklyXML.generateXMLChunck(`${prefix}| `, xml, statement, thenActions);
                if (actions[i + 1] === 20) {
                    statement = xml.createElement('statement');
                    block.appendChild(statement);
                    statement.setAttribute('name', 'ELSE');
                    let elseActions = [];
                    i += 2;
                    while ((actions[i] !== 240 || actions[i + 1] !== 255) && i < actions.length - 1) {
                        elseActions.push(actions[i]);
                        elseActions.push(actions[i + 1]);
                        i += 2;
                    }
                    BlocklyXML.log(prefix, '+ Else');
                    BlocklyXML.generateXMLChunck(`${prefix}| `, xml, statement, elseActions);
                }
                BlocklyXML.log(prefix, '+ End if')
            } else if (action === 240 && number >= 1 && number <= 6) {
                // om_where_operator - AND/OR/...
                BlocklyXML.log(prefix, `Found ${action},${number} in 240.1-6: om_where_operator`);
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
                while (i < actions.length - 1) {
                    nextActions.push(actions[i]);
                    nextActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ continue');
                BlocklyXML.generateXMLChunck(prefix, xml, value, nextActions);
            } else if (action >= 241 && action <= 244) {
                // om_check_io_on - Check if input/output is on/off
                BlocklyXML.log(prefix, `Found ${action},${number} in 241|242|243|244: om_check_io_on`);
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
                while (i < actions.length - 1) {
                    nextActions.push(actions[i]);
                    nextActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ continue');
                BlocklyXML.generateXMLChunck(prefix, xml, value, nextActions);
            } else if ([245, 246].contains(action)) {
                // om_check_validationbit - Check if bit is set/cleared
                BlocklyXML.log(prefix, `Found ${action},${number} in 245|246: om_check_validationbit`);
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
                while (i < actions.length - 1) {
                    nextActions.push(actions[i]);
                    nextActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ continue');
                BlocklyXML.generateXMLChunck(prefix, xml, value, nextActions);
            } else if (action === 247 && number <= 95) {
                // om_check_sensor - Checks the value of a sensor
                BlocklyXML.log(prefix, `Found ${action},${number} in 247.0-95: om_check_sensor`);
                block.setAttribute('type', 'om_check_sensor');
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'SENSOR');
                let innerBlock = xml.createElement('block');
                value.appendChild(innerBlock);
                let type = 'temperature';
                let sensorValue = actions[i + 3] / 2 - 32;
                let offset = 0;
                if (number >= 32) {
                    type = 'humidity';
                    sensorValue = actions[i + 3] / 2;
                    offset = 32;
                }
                if (number >= 64) {
                    type = 'brightness';
                    sensorValue = actions[i + 3];
                    offset = 64;
                }
                innerBlock.setAttribute('type', `om_sensor_${type}`);
                let field = xml.createElement('field');
                innerBlock.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = number - offset;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'CHECK');
                field.textContent = actions[i + 2] - 248;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = sensorValue;
                value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'NEXT');
                i += 2;
                let nextActions = [];
                i += 2;
                while (i < actions.length - 1) {
                    nextActions.push(actions[i]);
                    nextActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ continue');
                BlocklyXML.generateXMLChunck(prefix, xml, value, nextActions);
            } else if (action === 247 && number >= 228 && number <= 230) {
                // om_check_datetime - Checks the value of day, hour or minutes
                BlocklyXML.log(prefix, `Found ${action},${number} in 247.228-230: om_check_datetime`);
                block.setAttribute('type', 'om_check_datetime');
                let field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'DATETIME_TYPE');
                field.textContent = number - 228;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'CHECK');
                field.textContent = actions[i + 2] - 248;
                field = xml.createElement('field');
                block.appendChild(field);
                field.setAttribute('name', 'VALUE');
                field.textContent = actions[i + 3];
                let value = xml.createElement('value');
                block.appendChild(value);
                value.setAttribute('name', 'NEXT');
                i += 2;
                let nextActions = [];
                i += 2;
                while (i < actions.length - 1) {
                    nextActions.push(actions[i]);
                    nextActions.push(actions[i + 1]);
                    i += 2;
                }
                BlocklyXML.log(prefix, '+ continue');
                BlocklyXML.generateXMLChunck(prefix, xml, value, nextActions);
            } else {
                // om_raw - Contains 'unknown' actions
                BlocklyXML.log(prefix, 'Unsupported action: om_raw');
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
}
