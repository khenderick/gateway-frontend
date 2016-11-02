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
import {Confirm} from "./confirm";

@useView('../basewizard.html')
@inject(DialogController)
export class DiscoverWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.steps = [
            new Confirm()
        ];
        this.loadStep(this.steps[0]);
    }

    attached() {
        super.attached();
    }
}
