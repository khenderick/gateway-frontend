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
import {EventAggregator} from 'aurelia-event-aggregator';
import {BaseObject} from './baseobject';
import {inject} from 'aurelia-framework';
import moment from 'moment';

@inject(EventAggregator)
export class Backup extends BaseObject {
    constructor(ea, ...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.key = 'id';
        this.description= undefined;
        this.role = undefined;
        this.created = undefined;
        this.status = undefined;
        this.restores = [];
        this.user = undefined;
        this.ea = ea;

        this.mapping = {
            id: 'id',
            automated: 'automated',
            description: 'description',
            created: [['creation_time'], (created) => {
                return moment.unix(created);
            }],
            status: 'status',
            restores: [['restores'], restores => {
                for (let restore of restores) {
                    restore.creationTime = moment.unix(restore.restoration_time);
                }
                return restores;
            }],
            user: 'user',
            role: 'role'
        };

        this.subscription = this.ea.subscribe('i18n:locale:changed', (locales) => {
            if (this.created !== undefined) {
                this.created.locale(locales.newValue);
            }
            for (let restore of this.restores) {
                restore.creationTime.locale(locales.newValue);
            }         
        });
    }

    destroy() {
        this.subscription.dispose();
    }
}
