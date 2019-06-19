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
import {inject, customElement, bindable, bindingMode} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {API} from '../../components/api';
import {EventAggregator} from 'aurelia-event-aggregator';

@bindable({
    name: 'working',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})
@bindable({
    name: 'options',
    defaultValue: {}
})
@customElement('edit')
@inject(I18N, API, EventAggregator)
export class Edit {
    constructor(i18n, api, ea) {
        this.api = api;
        this.i18n = i18n;
        this.installation = undefined;
        this.ea = ea
        this.subscriber = this.ea.subscribe('installationSelected', installation => {
            this.installation = installation;
        });
    }

    bind() {
        this.text = this.i18n.tr(this.options.text || 'generic.edit');
    }

    async edit() {
        await this.api.updateInstallation(
            this.installation.id,
            this.installation.name
        );
        let payload = this.options.installation;
        this.ea.publish('InstallationUpdated', payload);
    }

}
