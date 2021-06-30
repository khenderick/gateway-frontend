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
import {Data} from './data';
import {Configure} from './configure';
import {NOT_IN_USE} from 'resources/constants';
import {Toolbox} from "../../components/toolbox";
import {Logger} from "../../components/logger";

@useView(PLATFORM.moduleName('wizards/basewizard.html'))
@inject(DialogController, Factory.of(Configure))
export class ConfigureSensorWizard extends BaseWizard {
    constructor(controller, configureFactory, ...rest) {
        super(controller, ...rest);
        this.data = new Data();
        this.rooms = [];
        this.steps = [
            configureFactory(this.data)
        ];
    }

    async activate(options) {
        let sensor = options.sensor;
        this.data.sensor = sensor;
        this.data.room = undefined;
        this.data.offset = parseFloat(sensor.offset);
        this.data.currentOffset = parseFloat(sensor.offset);
        if (sensor.name === NOT_IN_USE) {
            sensor.name = '';
        }
        this.data.sensor._freeze = true;
        try {
            const { data } = await this.api.getRoomConfigurations();
            data.forEach(room => {
                if (this.data.sensor.room === room.id) {
                    this.data.room = room;
                }
            });
        } catch (error) {
            Logger.error(`Could not load rooms: ${error.message}`);
        }
        return this.loadStep(this.filteredSteps[0]);
    }

    attached() {
        super.attached();
    }
}
