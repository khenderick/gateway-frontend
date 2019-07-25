/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {EventAggregator} from 'aurelia-event-aggregator';
import {BaseObject} from './baseobject';
import {computedFrom, inject} from 'aurelia-framework';
import moment from 'moment';

@inject(EventAggregator)
export class UpdateHistory extends BaseObject {
    constructor(ea, ...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.started= undefined;
        this.stopped = undefined;
        this.status = undefined;
        this.update = undefined;
        this.user = undefined;
        this.role = undefined;
        this.ea = ea;

        this.mapping = {
            id: 'id',
            started: [['started'], (started) => {
                return moment.unix(started);
            }],
            stopped: [['stopped'], (stopped) => {
                return moment.unix(stopped);
            }],
            status: 'status',
            update: 'update',
            user: 'user',
            role: 'role'
        };

        this.subscription = this.ea.subscribe('i18n:locale:changed', (locales) => {
            if (this.started !== undefined) {
                this.started.locale(locales.newValue);
            }
            if (this.stopped !== undefined) {
                this.stopped.locale(locales.newValue);
            }     
        });
    }

    destroy() {
        this.subscription.dispose();
    }
}
