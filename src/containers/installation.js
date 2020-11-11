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
import {computedFrom, inject} from 'aurelia-framework';
import {BaseObject} from './baseobject';
import {I18N} from 'aurelia-i18n';
import {Toolbox} from '../components/toolbox';
import {Logger} from '../components/logger';
import {Acl} from './cloud/acl';

@inject(I18N)
export class Installation extends BaseObject {
    constructor(i18n, ...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.i18n = i18n;
        this.key = 'id';
        this.name = undefined;
        this.role = undefined;
        this.version = undefined;
        this.uuid = undefined;
        this.alive = undefined;
        this.registrationKey = undefined;
        this.aliveLoading = false;
        this.flags = {};
        this._acl = undefined;
        this.features = {};
        this.gateway_features = [];
        this.checked = false;

        this.mapping = {
            id: 'id',
            name: 'name',
            name_internal: 'name_internal',
            registrationKey: 'registration_key',
            role: [['user_role'], userRole => {
                return userRole.role;
            }],
            ipAddress: [['network'], network => network.local_ip_address],
            version: 'version',
            uuid: 'uuid',
            flags: 'flags',
            _acl: [['_acl'], (acl) => {
                return new Acl(acl);
            }],
            features: 'features',
            gateway_features: 'gateway_features',
            gateway_model: 'gateway_model'
        };
    }

    async checkAlive(timeout) {
        try {
            this.aliveLoading = true;
            let data = await this.api.checkAlive({
                ignoreConnection: true,
                installationId: this.id,
                timeout: timeout
            });
            this.alive = data['alive'];
        } catch (error) {
            this.alive = false;
        } finally {
            this.aliveLoading = false;
        }
    }

    async refresh() {
        let data = await this.api.getInstallation(this.id);
        this.fillData(data);
    }

    async save() {
        try {
            this._edit = false;
            await this.api.updateInstallation(
                this.id,
                this.name
            );
        } catch (error) {
            Logger.error(`Could not set Installation name ${this.name}: ${error.message}`);
        }
    }


    @computedFrom('flags')
    get updateLoading() {
        return this.flags.hasOwnProperty('UPDATING');
    }

    @computedFrom('flags')
    get isUpdating() {
        return this.flags.hasOwnProperty('UPDATING');
    }

    @computedFrom('flags')
    get isBackingUp() {
        return this.flags.hasOwnProperty('BACKING_UP');
    }

    @computedFrom('flags')
    get isRestoring() {
        return this.flags.hasOwnProperty('RESTORING');
    }

    @computedFrom('flags')
    get hasUpdate() {
        return this.flags.hasOwnProperty('UPDATE_AVAILABLE');
    }

    @computedFrom('flags')
    get updateVersion() {
        if (!this.hasUpdate) {
            return undefined;
        }
        return this.flags['UPDATE_AVAILABLE'].to_version.version;
    }

    @computedFrom('flags')
    get status() {
        if (this.isUpdating) {
            return this.i18n.tr('generic.updating');
        }
        if (this.isBackingUp) {
            return this.i18n.tr('generic.backingup');
        }
        if (this.isRestoring) {
            return this.i18n.tr('generic.restoring');
        }
        return '';
    }

    @computedFrom('flags')
    get isBusy() {
        return this.isUpdating || this.isBackingUp || this.isRestoring;
    }

    @computedFrom('registrationKey')
    get shortRegistrationKey() {
        return [null, undefined].contains(this.registrationKey) ? null : Toolbox.shorten(this.registrationKey, 12, false);
    }

    @computedFrom('_acl')
    get configurationAccess() {
        return this._acl.hasAccessTo('configure');
    }

    hasAccess(accessAttributes) {
        return this._acl.hasAccessTo(accessAttributes);
    }
}
