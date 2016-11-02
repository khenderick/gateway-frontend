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
import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureInputWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new General(this.data),
            new Configure(this.data)
        ];
        this.loadStep(this.steps[0]);
    }

    activate(options) {
        this.data.input = options.input;
        this.data.mode = options.input.type;
        this.data.actions = options.input.basicActions;
        this.data.input._freeze = true;
    }

    attached() {
        super.attached();
    }
}
