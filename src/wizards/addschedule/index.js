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
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Configure} from "./configure";
import {Schedule as ScheduleStep} from "./schedule";
import {Schedule} from "../../containers/schedule";
import {Toolbox} from "../../components/toolbox";

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(General), Factory.of(Configure), Factory.of(ScheduleStep), Factory.of(Schedule))
export class AddScheduleWizard extends BaseWizard {
    constructor(controller, generalFactory, configureFactory, scheduleStepFactory, scheduleFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.scheduleFactory = scheduleFactory;
        this.steps = [
            generalFactory(this.data),
            configureFactory(this.data),
            scheduleStepFactory(this.data)
        ];
    }

    async activate() {
        this.data.schedule = this.scheduleFactory();
        this.data.mode = 'groupaction';
        this.data.start = Toolbox.formatDate(new Date(), 'yyyy-MM-dd hh:mm');
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
