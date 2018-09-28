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
import {computedFrom, inject, Factory} from "aurelia-framework";
import {Toolbox} from "../../components/toolbox";
import {Room} from "../../containers/room";
import {Step} from "../basewizard";

@inject(Factory.of(Room))
export class General extends Step {
    constructor(roomFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = this.i18n.tr('wizards.configureuser.general.title');
        this.data = data;
        this.roomFactory = roomFactory;
        this.roles = ['A', 'N'];
        this.rooms = [];
        this.roomsMap = {};
    }

    roleText(role) {
        return this.i18n.tr('pages.settings.users.roles.' + role);
    }

    roomText(roomId, _this) {
        if ([null, undefined].contains(roomId) || _this.roomsMap === undefined) {
            return '';
        }
        return _this.roomsMap[roomId].name;
    }

    roomSorter(roomIds, _this) {
        if (_this.roomsMap === undefined) {
            return roomIds;
        }
        return Toolbox.sortByMap(roomIds, _this.roomsMap, 'name');
    }

    @computedFrom('data', 'data.user', 'data.user.firstName', 'data.user.lastName', 'data.user.email', 'data.user.role')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        for (let field of ['firstName', 'lastName', 'email']) {
            if (this.data.user[field] === undefined || this.data.user[field].trim().length === 0) {
                valid = false;
                reasons.push(this.i18n.tr(`wizards.configureuser.general.empty${field.toLowerCase()}`));
                fields.add(field.toLowerCase());
            }
        }
        if (!['A', 'N'].contains(this.data.user.role)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureuser.general.invalidrole'));
            fields.add('role');
        }
        if (!fields.has('email') && !Toolbox.validEmail(this.data.user.email)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureuser.general.invalidemail'));
            fields.add('email');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    @computedFrom('rooms', 'rooms.length')
    get roomIds() {
        return this.rooms.filter(r => r.name !== '').sort((a, b) => a.name > b.name ? 1 : -1).map(r => r.id);
    }

    set roomIds(value) {
        // Read only, but needed to allow binding
    }

    async proceed() {
    }

    async prepare() {
        let promises = [];
        promises.push((async () => {
            try {
                let rooms = await this.api.getRooms();
                Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                    let room = this.roomFactory(id);
                    this.roomsMap[id] = room;
                    return room;
                });
            } catch (error) {
                console.error(`Could not load Rooms: ${error.message}`);
            }
        })());
        await Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
