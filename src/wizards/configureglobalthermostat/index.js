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
import {inject, useView, Factory} from "aurelia-framework";
import {PLATFORM} from 'aurelia-pal';
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Switching} from "./switching";
import {Toolbox} from "../../components/toolbox";

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(General), Factory.of(Switching))
export class ConfigureGlobalThermostatWizard extends BaseWizard {
    constructor(controller, generalFactory, switchingFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            generalFactory(this.data),
            switchingFactory(this.data)
        ];
    }

    async activate(options) {
        this.data.thermostat = options.thermostat;
        this.data.thermostat._freeze = true;
        let components = Toolbox.splitSeconds(this.data.thermostat.pumpDelay);
        this.data.delay.minutes = components.minutes;
        this.data.delay.seconds = components.seconds;
        return this.loadStep(this.steps[0]);
    }

    attached() {
        super.attached();
    }
}
