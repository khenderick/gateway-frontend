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
import {LabelInput} from './label-input';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(LabelInput))
export class ConfigureLabelInputsWizard extends BaseWizard {
    constructor(controller, labelInputFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            labelInputFactory(this.data)
        ];
    }

    async activate(options) {
        this.data.isEdit = options.isEdit;
        if (options.isEdit) {
            this.data.id = options.id;
            this.data.name = options.name;
            this.data.consumption_type = options.consumption_type;
            this.data.input_type = options.input_type;
            this.data.supplier = options.supplier_name;
            this.data.input = options.input_name;
        }
        this.data.pulseCounters = options.pulseCounters;
        this.data.powerInputs = options.powerInputs;
        this.data.suppliers = options.suppliers;
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
