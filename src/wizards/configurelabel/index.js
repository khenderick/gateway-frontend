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
import {Label} from './label';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(Label))
export class ConfigureLabelWizard extends BaseWizard {
    constructor(controller, labelFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            labelFactory(this.data)
        ];
    }

    async activate(options) {
        this.data.isEdit = options.isEdit;
        this.data.labelInputs = options.labelInputs.sort((a, b) => {
            if (!a.name && b.name) {
                return 1;
            }
            return a.name && b.name ? a.name.localeCompare(b.name) : -1;
        });
        if (options.isEdit) {
            this.data.id = options.label_id;
            this.data.name = options.name;
            this.data.label_type = options.label_type;
            this.data.formula = options.formula.split('+').map(el => el.trim());
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
