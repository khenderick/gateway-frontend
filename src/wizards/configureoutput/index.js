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
import {DialogController} from "aurelia-dialog";
import {Toolbox} from "../../components/toolbox";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController, Factory.of(Configure))
export class ConfigureOutputWizard extends BaseWizard {
    constructor(controller, configureFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            configureFactory(this.data)
        ];
    }

    activate(options) {
        let output = options.output;
        this.data.output = output;
        this.data.type = output.isLight ? 'light' : 'relay';
        if (output.timer === 65536) {
            output.timer = 0;
        }
        let components = Toolbox.splitSeconds(output.timer);
        this.data.hours = components.hours;
        this.data.minutes = components.minutes;
        this.data.seconds = components.seconds;
        if (output.name === 'NOT_IN_USE') {
            output.name = '';
        }
        this.data.output._freeze = true;
        this.loadStep(this.steps[0]);
    }

    attached() {
        super.attached();
    }
}
