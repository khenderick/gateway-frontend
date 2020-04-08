/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Data} from './data';
import {BaseWizard} from '../basewizard';
import {PowerInput} from './power-input';
import {LabelInput} from './label-input';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(PowerInput), Factory.of(LabelInput))
export class ConfigurePowerInputsWizard extends BaseWizard {
    constructor(controller, powerInputFactory, labelInputFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            powerInputFactory(this.data),
        ];
        if (this.shared.target === 'cloud') {
            this.steps.push(labelInputFactory(this.data));
        }
    }

    async activate(options) {
        this.data.module = options.module;
        this.data.power_type = options.power_type;
        this.data.label_input = options.label_input;
        this.data.suppliers = options.suppliers;
        this.data.supplier = options.supplier;
        this.data.rooms = options.rooms;
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
