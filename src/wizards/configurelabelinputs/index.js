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
import {BaseWizard} from '../basewizard';
import {Configure} from './configure';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(Configure))
export class ConfigureLabelInputsWizard extends BaseWizard {
    constructor(controller, configureFactory, ...rest) {
        super(controller, ...rest);
        this.data = {};
        this.steps = [
            configureFactory(this.data),
        ];
    }

    async activate(options) {
        this.data.powerType = options.powerType;
        this.data.pulseCounter = options.pulseCounter;
        this.data.labelInput = options.labelInput || {};
        this.data.suppliers = options.suppliers;
        this.data.rooms = options.rooms;

        return this.loadStep(this.filteredSteps[0]);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
