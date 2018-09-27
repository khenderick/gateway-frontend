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
import {inject, useView, Factory} from "aurelia-framework";
import {PLATFORM} from 'aurelia-pal';
import {DialogController} from "aurelia-dialog";
import {User} from "../../containers/user";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Credentials} from "./credentials";

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(General), Factory.of(Credentials), Factory.of(User))
export class ConfigureUserWizard extends BaseWizard {
    constructor(controller, generalFactory, credentialsFactory, userFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            generalFactory(this.data),
            credentialsFactory(this.data)
        ];
        this.userFactory = userFactory;
    }

    async activate(options) {
        this.data.new = options.user === undefined;
        if (this.data.new) {
            this.data.user = this.userFactory(undefined);
            this.data.user.role = 'N';
            this.data.tfaEnabled = false;
        } else {
            this.data.user = options.user;
            this.data.user._freeze = true;
            this.data.tfaEnabled = !!this.data.user.tfaEnabled;
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
