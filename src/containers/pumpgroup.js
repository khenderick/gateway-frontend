/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {computedFrom} from "aurelia-framework";
import {BaseObject} from "./baseobject";

export class PumpGroup extends BaseObject {
    constructor(...rest /*, id, type */) {
        let type = rest.pop();
        let id = rest.pop();  // Inverted order
        super(...rest);
        this.id = id;
        this.type = type;
        this.processing = false;
        this.key = 'id';
        this.output = undefined;
        this.outputs = [];
        this.room = undefined;
        this.dirty = false;

        this.mapping = {
            id: 'id',
            output: [['output'], output => {
                return output === null ? 255 : output;
            }],
            outputs: [['outputs'], outputs => {
                return ['', null, undefined].contains(outputs) ? [] : outputs.split(',').map(i => { return parseInt(i); });
            }],
            room: 'room'
        };
    }

    @computedFrom('output')
    get inUse() {
        return this.output !== undefined && this.output < 240 && this.outputs.length > 0;
    }

    async save() {
        if (this.type === 'heating') {
            await this.api.setPumpGroupconfiguration(this.id, this.output, this.outputs, this.room);
        } else {
            await this.api.setCoolingPumpGroupconfiguration(this.id, this.output, this.outputs, this.room);
        }
        this.dirty = false;
    }
}
