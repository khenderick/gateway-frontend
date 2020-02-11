/*
 * Copyright (C) 2019 OpenMotics BV
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
import {Data} from './data';
import {Configure} from './configure';

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(Configure))
export class ConfigureEventruleWizard extends BaseWizard {
    constructor(controller, configureFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.steps = [
            configureFactory(this.data)
        ];
    }

    async activate(options) {
        this.data.eventRule = options.eventRule;
        this.data.triggers = options.triggers;
        if (options.eventRule) {
            this.data.id = options.eventRule.id;
            this.data.title = options.eventRule.title;
            this.data.message = options.eventRule.message;
            this.data.target = options.eventRule.target;
            this.data.triggerType = options.eventRule.triggerType;
            this.data.triggerStatus = options.eventRule.triggerStatus;
            this.data.trigger = options.trigger;
            this.data.eventRule._freeze = true;
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
