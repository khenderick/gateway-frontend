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
import {EnergyModuleControl} from './control';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(EnergyModuleControl))
export class EnergyModuleControlWizard extends BaseWizard {
    constructor(controller, energyModuleControlFactory, ...rest) {
        super(controller, ...rest);
        this.data = {};
        this.steps = [
            energyModuleControlFactory(this.data)
        ];
    }

    async activate({ moduleId, modules }) {
        this.data.moduleId = moduleId;
        this.data.modules = modules;
        this.data.activeModule = modules.find(({ id }) => id === moduleId);
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
