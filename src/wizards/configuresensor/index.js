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
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureSensorWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new Configure(this.data)
        ];
        this.loadStep(this.steps[0]);
    }

    activate(options) {
        let sensor = options.sensor;
        this.data.sensor = sensor;
        this.data.offset = parseFloat(sensor.offset);
        this.data.currentOffset = parseFloat(sensor.offset);
        if (sensor.name === 'NOT_IN_USE') {
            sensor.name = '';
        }
        this.data.sensor._freeze = true;
    }

    attached() {
        super.attached();
    }
}
