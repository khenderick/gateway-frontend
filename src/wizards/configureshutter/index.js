/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {Toolbox} from "../../components/toolbox";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Configure} from "./configure";

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(Configure))
export class ConfigureShutterWizard extends BaseWizard {
    constructor(controller, configureFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            configureFactory(this.data)
        ];
    }

    async activate(options) {
        let shutter = options.shutter;
        this.data.shutter = shutter;
        if (shutter.timerUp === 65536) {
            shutter.timerUp = 0;
        }
        let components = Toolbox.splitSeconds(shutter.timerUp);
        this.data.timerUp.hours = components.hours;
        this.data.timerUp.minutes = components.minutes;
        this.data.timerUp.seconds = components.seconds;
        if (shutter.timerDown === 65536) {
            shutter.timerDown = 0;
        }
        components = Toolbox.splitSeconds(shutter.timerDown);
        this.data.timerDown.hours = components.hours;
        this.data.timerDown.minutes = components.minutes;
        this.data.timerDown.seconds = components.seconds;
        if (shutter.name === 'NOT_IN_USE') {
            shutter.name = '';
        }
        this.data.shutter._freeze = true;
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
