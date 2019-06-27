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
import {inject, Factory} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {User} from '../../containers/user';
import {ConfigureUserWizard} from '../../wizards/configureuser/index';
import {Logger} from '../../components/logger';

@inject(DialogService, Factory.of(User))
export class Profile extends Base {
    constructor(dialogService, userFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.userFactory = userFactory;
        this.refresher = new Refresher(async () => {
            await this.loadUser();
        }, 15000);
        this.initVariables();
    }

    initVariables() {
        this.user = undefined;
        this.userLoading = true;
    }

    async loadUser() {
        try {
            let users = await this.api.getUsers();
            this.user = this.userFactory(users.data[0].id);
            this.user.fillData(users.data[0]);
            this.userLoading = false;
        } catch (error) {
            Logger.error(`Could not load User: ${error.message}`);
        }
    }

    edit() {
        if (this.user === undefined) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureUserWizard, model: {user: this.user}}).whenClosed((response) => {
            if (response.wasCancelled) {
                Logger.info('The ConfigureUserWizard was cancelled');
            }
        });
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
