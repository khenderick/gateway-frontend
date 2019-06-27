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
import {inject, useView, Factory} from 'aurelia-framework';
import {PLATFORM} from 'aurelia-pal';
import {DialogController} from 'aurelia-dialog';
import {BaseWizard} from '../basewizard';
import {Data} from './data';
import {General} from './general';
import {Credentials} from './credentials';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(General), Factory.of(Credentials))
export class ConfigureUserWizard extends BaseWizard {
    constructor(controller, generalFactory, credentialsFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            generalFactory(this.data),
            credentialsFactory(this.data)
        ];
    }

    async activate(options) {
        this.data.new = options.user.id === undefined;
        this.data.role = options.role;
        this.data.user = options.user;
        this.data.userEdit = this.data.new || (this.data.user !== undefined && this.data.user.acl !== undefined && this.data.user.acl.edit.allowed === true);
        if (this.data.userEdit) {
            this.data.user._freeze = true;
            if (this.data.new) {
                this.data.tfaEnabled = false;
            } else {
                this.data.tfaEnabled = !!this.data.user.tfaEnabled;
            }
        }
        this.data.roleEdit = this.data.new || (this.data.role !== undefined && this.data.role.acl !== undefined && this.data.role.acl.edit.allowed === true);
        if (this.data.roleEdit) {
            this.data.role._freeze = true;
            if (this.data.new) {
                this.data.role.role = 'NORMAL';
                this.data.allRooms = true;
                this.data.roomIds = [];
            } else {
                this.data.allRooms = [null, undefined].contains(this.data.role.roomIds);
                this.data.roomIds =  this.data.allRooms ? [] : [...this.data.role.roomIds];
            }
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
