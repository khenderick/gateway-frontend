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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {User} from '../../containers/user';
import {Role} from '../../containers/role';
import {Room} from '../../containers/room';
import {ConfigureUserWizard} from '../../wizards/configureuser/index';

@inject(DialogService, Factory.of(User), Factory.of(Role), Factory.of(Room))
export class Users extends Base {
    constructor(dialogService, userFactory, roleFactory, roomFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.userFactory = userFactory;
        this.roleFactory = roleFactory;
        this.roomFactory = roomFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadRoles();
            await this.loadUsers();
            this.signaler.signal('reload-users');
            await this.loadRooms();
        }, 15000);
        this.initVariables();
    }

    initVariables() {
        this.users = [];
        this.usersMap = {};
        this.roles = [];
        this.rooms = [];
        this.roomsMap = {};
        this.usersLoading = true;
        this.activeUser = undefined;
        this.working = false;
        this.installationHasUpdated = false;
        this.usersAcl = undefined;
        this.rolesAcl = undefined;
    }

    async loadUsers() {
        try {
            let users = await this.api.getUsers(this.shared.installation.id);
            this.usersAcl = users['_acl'];
            Toolbox.crossfiller(users.data, this.users, 'id', (id) => {
                let user = this.userFactory(id);
                this.usersMap[id] = user;
                return user;
            });
            this.usersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Users: ${error.message}`);
        }
    }

    async loadRoles() {
        try {
            let roles = await this.api.getRoles();
            this.rolesAcl = roles['_acl'];
            Toolbox.crossfiller(roles.data, this.roles, 'id', (id) => {
                return this.roleFactory(id);
            });
        } catch (error) {
            Logger.error(`Could not load Roles: ${error.message}`);
        }
    }

    async loadRooms() {
        try {
            let rooms = await this.api.getRooms();
            Toolbox.crossfiller(rooms.data, this.rooms, 'id', (id) => {
                let room = this.roomFactory(id);
                this.roomsMap[id] = room;
                return room;
            });
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    selectUser(userId) {
        let foundUser = undefined;
        for (let user of this.users) {
            if (user.id === userId) {
                foundUser = user;
            }
        }
        this.requestedRemove = false;
        this.activeUser = foundUser;
    }

    tfaEnabledText(user, _this) {
        return _this.i18n.tr('pages.settings.users.tfa' + (user.tfaEnabled ? 'enabled' : 'disabled'));
    }

    @computedFrom('users', 'usersMap', 'roles')
    get installationUsers() {
        let users = [];
        for (let role of this.roles) {
            let user = this.usersMap[role.userId];
            if (user !== undefined) {
                user.role = role;
                users.push(user);
            }
        }
        users.sort((a, b) => {
            return a.email > b.email ? 1 : -1;
        });
        return users;
    }

    @computedFrom('activeUser', 'activeUser.role', 'activeUser.role.roomIds', 'roomsMap')
    get sortedAURooms() {
        if (this.activeUser === undefined || this.activeUser.role === undefined) {
            return [];
        }
        let roomIds = this.activeUser.role.roomIds;
        if ([null, undefined].contains(roomIds)) {
            return roomIds;
        }
        return Toolbox.sortByMap(roomIds, this.roomsMap, 'name');
    }

    @computedFrom('activeUser', 'activeUser.role', 'activeUser.acl.edit.allowed', 'activeUser.role.acl.edit.allowed')
    get canEdit() {
        if (this.activeUser === undefined || this.activeUser.role === undefined) {
            return false;
        }
        return this.activeUser.acl.edit.allowed || this.activeUser.role.acl.edit.allowed
    }

    @computedFrom('activeUser', 'activeUser.role', 'activeUser.role.acl.remove.allowed')
    get canRemove() {
        if (this.activeUser === undefined || this.activeUser.role === undefined) {
            return false;
        }
        return this.activeUser.role.acl.remove.allowed;
    }

    @computedFrom('usersAcl' , 'usersAcl.add.allowed', 'rolesAcl', 'rolesAcl.add.allowed')
    get canAdd() {
        return this.usersAcl !== undefined && this.usersAcl.add.allowed && this.rolesAcl !== undefined && this.rolesAcl.add.allowed;
    }

    edit() {
        if (!this.canEdit) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureUserWizard, model: {
            user: this.activeUser,
            role: this.activeUser.role
        }}).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeUser.cancel();
                Logger.info('The ConfigureUserWizard was cancelled');
            }
        });
    }

    addUser() {
        if (!this.canAdd) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureUserWizard, model: {
            user: this.userFactory(undefined),
            role: this.roleFactory(undefined)
        }}).whenClosed((response) => {
            if (response.wasCancelled) {
                Logger.info('The AddUserWizard was cancelled');
            } else {
                let [user, role] = response.output;
                user.role = role;
                this.usersMap[user.id] = user;
                this.users.push(user);
                this.users.sort((a, b) => {
                    return a.email > b.email ? 1 : -1;
                });
                this.roles.push(role);
            }
        });
    }

    async removeUser() {
        if (this.activeUser === undefined) {
            return;
        }
        this.working = true;
        try {
            await this.activeUser.role.remove();
            this.activeUser = undefined;
            await this.loadUsers();
            await this.loadRoles();
        } catch (error) {
            Logger.error(`Could not remove Role: ${error.message}`);
        } finally {
            this.working = false;
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
