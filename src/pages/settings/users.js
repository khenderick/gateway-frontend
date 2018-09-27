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
import {inject, Factory, computedFrom} from "aurelia-framework";
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {User} from "../../containers/user";
import {ConfigureUserWizard} from "../../wizards/configureuser/index";

@inject(DialogService, Factory.of(User))
export class Users extends Base {
    constructor(dialogService, userFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.userFactory = userFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadUsers();
            this.signaler.signal('reload-users');
        }, 15000);
        this.initVariables();
    };

    initVariables() {
        this.users = [];
        this.usersLoading = true;
        this.activeUser = undefined;
        this.requestedRemove = false;
        this.working = false;
        this.installationHasUpdated = false;
        this.acl = undefined;
    }

    async loadUsers() {
        try {
            let users = await this.api.getUsers();
            this.acl = users['_acl'];
            Toolbox.crossfiller(users.data, this.users, 'id', (id) => {
                return this.userFactory(id);
            });
            this.users.sort((a, b) => {
                return a.email > b.email ? 1 : -1;
            });
            this.usersLoading = false;
        } catch (error) {
            console.error(`Could not load Users: ${error.message}`);
        }
    };

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

    @computedFrom('activeUser', 'activeUser.acl', 'activeUser.acl.edit', 'aciveUser.acl.edit.allowed')
    get canEdit() {
        if (this.activeUser === undefined) {
            return false;
        }
        return this.activeUser.acl.edit.allowed;
    }

    @computedFrom('activeUser', 'activeUser.acl', 'activeUser.acl.remove', 'aciveUser.acl.remove.allowed')
    get canRemove() {
        if (this.activeUser === undefined) {
            return false;
        }
        return this.activeUser.acl.remove.allowed;
    }

    @computedFrom('acl' , 'acl.add.allowed')
    get canAdd() {
        return this.acl !== undefined && this.acl.add.allowed;
    }

    edit() {
        if (!this.canEdit) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureUserWizard, model: {user: this.activeUser}}).whenClosed((response) => {
            if (response.wasCancelled) {
                this.activeUser.cancel();
                console.info('The ConfigureUserWizard was cancelled');
            }
        });
    }

    addUser() {
        if (!this.canAdd) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureUserWizard, model: {user: undefined}}).whenClosed((response) => {
            if (response.wasCancelled) {
                console.info('The AddUserWizard was cancelled');
            } else {
                this.users.push(response.output);
                this.users.sort((a, b) => {
                    return a.email > b.email ? 1 : -1;
                });
            }
        });
    }

    requestRemove() {
        if (!this.canRemove) {
            return;
        }
        if (this.activeUser !== undefined) {
            this.requestedRemove = true;
        }
    }

    async confirmRemove() {
        if (this.requestedRemove === true) {
            this.working = true;
            try {
                await this.api.removeUser(this.activeUser);
                this.activeUser = undefined;
                await this.loadUsers();
            } catch (error) {
                console.error(`Could not remove user: ${error.message}`);
            } finally {
                this.working = false;
                this.requestedRemove = false;
            }
        }
    }

    abortRemove() {
        this.requestedRemove = false;
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
