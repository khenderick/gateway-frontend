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
import {computedFrom, inject, Factory} from 'aurelia-framework';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Room} from '../../containers/room';
import {Step} from '../basewizard';

@inject(Factory.of(Room))
export class General extends Step {
    constructor(roomFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.title = this.i18n.tr('wizards.configureuser.general.title');
        this.data = data;
        this.roomFactory = roomFactory;
        this.roles = ['ADMIN', 'NORMAL'];
        this.hasFocus = true;
        this.rooms = [];
        this.roomsLoading = false;
        this.roomsMap = {};
        this.proceedError = false;
        this.originalEmail = undefined;
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

    emailChanged(event) {
        this.proceedError = false;
    }

    @computedFrom('data.user', 'data.user.firstName', 'data.user.lastName', 'data.user.email', 'data.role.role', 'data.userEdit', 'proceedError')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.proceedError) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureuser.credentials.userfoundmessage'));
        }
        if (this.data.userEdit) {
            for (let field of ['email']) {
                if (this.data.user[field] === undefined || this.data.user[field].trim().length === 0) {
                    valid = false;
                    reasons.push(this.i18n.tr(`wizards.configureuser.general.empty${field.toLowerCase()}`));
                    fields.add(field.toLowerCase());
                }
            }
            if (!fields.has('email') && !Toolbox.validEmail(this.data.user.email)) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configureuser.general.invalidemail'));
                fields.add('email');
            }
        }
        if (this.data.roleEdit) {
            if (!['ADMIN', 'NORMAL'].contains(this.data.role.role)) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configureuser.general.invalidrole'));
                fields.add('role');
            }
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    @computedFrom('rooms')
    get roomIds() {
        return this.rooms.filter(r => r.name !== '').sort((a, b) => a.name > b.name ? 1 : -1).map(r => r.id);
    }

    set roomIds(value) {
        // Read only, but needed to allow binding
    }

    async proceed() {
        let userFound = await this.api.getFilteredUsers(this.data.user.email);
        if (this.data.new) {
            if (userFound.data.length != 0) {
                this.data.user.firstName = userFound.data[0].first_name;
                this.data.user.lastName = userFound.data[0].last_name;
                this.data.user.id = userFound.data[0].id;
                this.data.userFound = true;
                this.data.error = false;
            }
            else {
                this.data.user.firstName = '';
                this.data.user.lastName = '';
                this.data.user.id = '';
                this.data.userFound = false;
                this.data.error = false;
            }  
        } else {
            if (userFound.data.length !== 0) {
                if (this.data.user.email !== this.originalEmail){
                    this.data.error = true;
                } else {
                    this.data.error = false;
                }
            } else {
                this.data.error = false;
            }
        } if (this.data.error) {
            this.proceedError = true;
            return 'abort';
        }
    }

    async prepare() {
        this.originalEmail = this.data.user.email;
        let promises = [];
        promises.push((async () => {
            try {
                this.roomsLoading = true;
                let rooms = await this.api.getRooms();
                Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                    let room = this.roomFactory(id);
                    this.roomsMap[id] = room;
                    return room;
                });
            } catch (error) {
                Logger.error(`Could not load Rooms: ${error.message}`);
            } finally {
                this.roomsLoading = false;
            }
        })());
        await Promise.all(promises);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
