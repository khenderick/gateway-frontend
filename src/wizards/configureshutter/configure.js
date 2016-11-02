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
import {computedFrom} from "aurelia-framework";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Step} from "../basewizard";

export class Configure extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureshutter.configure.title');
        this.api = Shared.get('api');
        this.data = data;

        this.groups = [undefined];
        for (let i = 0; i < 31; i++) {
            this.groups.push(i);
        }
    }

    groupText(item) {
        if (item === undefined) {
            return this.i18n.tr('generic.nogroup');
        }
        return this.i18n.tr('generic.group') + ' ' + item;
    }

    @computedFrom(
        'data.shutter.name',
        'data.timerUp', 'data.timerUp.seconds', 'data.timerUp.minutes', 'data.timerUp.hours',
        'data.timerDown', 'data.timerDown.seconds', 'data.timerDown.minutes', 'data.timerDown.hours'
    )
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.shutter.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.nametoolong'));
            fields.add('name');
        }
        if (parseInt(this.data.timerUp.hours) * 60 * 60 + parseInt(this.data.timerUp.minutes) * 60 + parseInt(this.data.timerUp.seconds) > 65536) {
            let components = Toolbox.splitSeconds(65536);
            let parts = [];
            if (components.hours > 0) {
                parts.push(components.hours + 'h');
            }
            if (components.minutes > 0) {
                parts.push(components.minutes + 'm');
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(components.seconds + 's');
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.timeruplength', {max: parts.join(' ')}));
            fields.add('timerup');
        }
        if (parseInt(this.data.timerDown.hours) * 60 * 60 + parseInt(this.data.timerDown.minutes) * 60 + parseInt(this.data.timerDown.seconds) > 65536) {
            let components = Toolbox.splitSeconds(65536);
            let parts = [];
            if (components.hours > 0) {
                parts.push(components.hours + 'h');
            }
            if (components.minutes > 0) {
                parts.push(components.minutes + 'm');
            }
            if (components.seconds > 0 || parts.length === 0) {
                parts.push(components.seconds + 's');
            }
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureshutter.configure.timerdownlength', {max: parts.join(' ')}));
            fields.add('timerdown');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            let shutter = this.data.shutter;
            shutter.timerUp = parseInt(this.data.timerUp.hours) * 60 * 60 + parseInt(this.data.timerUp.minutes) * 60 + parseInt(this.data.timerUp.seconds);
            shutter.timerDown = parseInt(this.data.timerDown.hours) * 60 * 60 + parseInt(this.data.timerDown.minutes) * 60 + parseInt(this.data.timerDown.seconds);
            shutter.save();
            resolve();
        });
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
