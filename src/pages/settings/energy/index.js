/*
 * Copyright (C) 2018 OpenMotics BV
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
import {inject} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';

@inject()
export class Energy extends Base {
    constructor(...rest) {
        super(...rest);
        this.labelInputs = [];
        this.refresher = new Refresher(async () => {
            await this.loadLabelInputs();
            // this.signaler.signal('reload-apps');
        }, 5000);
    }

    initVariables() {
       
    }

    async loadLabelInputs() {
        try {
            const { data } = await this.api.getLabelInputs();
            this.labelInputs = data;
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
