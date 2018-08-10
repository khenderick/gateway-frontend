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
export class ConfigureScheduleWizard extends BaseWizard {
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

    async activate(options) {
        let schedule = options.schedule;
        this.data.schedule = this.scheduleFactory();
        if (schedule === undefined) {
            this.data.edit = false;
            this.data.mode = 'groupaction';
            this.data.start = Toolbox.formatDate(new Date(), 'yyyy-MM-dd hh:mm');
        } else {
            this.data.edit = true;
            this.data.scheduleId = schedule.id;
            this.data.schedule.name = schedule.name;
            switch (schedule.scheduleType) {
                case 'BASIC_ACTION':
                    this.data.mode = 'basicaction';
                    this.data.actionType = schedule.arguments.action_type;
                    this.data.actionNumber = schedule.arguments.action_number;
                    break;
                case 'GROUP_ACTION':
                    this.data.mode = 'groupaction';
                    this.data.groupActionId = schedule.arguments;
                    break;
            }
            let startDate = schedule.start === undefined || schedule.start === null ? new Date() : new Date(schedule.start * 1000);
            this.data.start = Toolbox.formatDate(startDate, 'yyyy-MM-dd hh:mm');
            if (schedule.end !== undefined && schedule.end !== null) {
                this.data.end = Toolbox.formatDate(new Date(schedule.end * 1000), 'yyyy-MM-dd hh:mm');
            }
            this.data.dorepeat = schedule.repeat !== undefined;
            this.data.repeat = schedule.repeat;
            let parsed = Toolbox.parseCrontab(schedule.repeat); // [days, at, every]
            if (parsed === undefined) {
                this.data.advancedrepeat = true;
            } else {
                this.data.advancedrepeat = false;
                this.data.simplerepeat.at = parsed[1];
                this.data.simplerepeat.every = parsed[2] || 60;
                for (let i of [0, 1, 2, 3, 4, 5, 6]) {
                    this.data.simplerepeat.day[`day${i}`] = parsed[0][i];
                }
                this.data.simplerepeat.doat = this.data.simplerepeat.at !== undefined ? 1 : 0;
            }
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
