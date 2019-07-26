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
import {inject, Container} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import moment from 'moment';
import {BaseObject} from './baseobject';

@inject(EventAggregator)
export class Update extends BaseObject {
    constructor(ea, ...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.i18n = Container.instance.get(I18N);
        this.id = id;
        this.key = 'id';
        this.description= undefined;
        this.created = undefined;
        this.fromVersion = undefined;
        this.toVersion = undefined;
        this.public = undefined;
        this.components = this.i18n.tr('pages.settings.updates.globalcomponent');
        this.ea = ea;

        this.mapping = {
            id: 'id',
            description: 'description',
            created: [['creation_time'], (created) => {
                return moment.unix(created);
            }],
            fromVersion: 'from_version',
            toVersion: 'to_version',
            public: 'public'
        };

        this.subscription = this.ea.subscribe('i18n:locale:changed', (locales) => {
            if (this.created !== undefined) {
                this.created.locale(locales.newValue);
            }   
        });
    }

    destroy() {
        this.subscription.dispose();
    }
}
