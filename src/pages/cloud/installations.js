/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {inject, Factory, computedFrom, BindingEngine} from 'aurelia-framework';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Installation} from '../../containers/installation';

@inject(BindingEngine, Factory.of(Installation))
export class Installations extends Base {
    constructor(bindingEngine, installationFactory, ...rest) {
        super(...rest);
        this.bindingEngine = bindingEngine;
        this.installationFactory = installationFactory;
        this.hasRegistrationKey = false;
        this.refresher = new Refresher(async () => {
            await this.loadInstallations();
            this.signaler.signal('reload-installations');
            if (this.shared.installation !== undefined) {
                this.shared.installation.checkAlive(2000);
            }
            for (let installation of this.mainInstallations) {
                if (this.shared.installation !== installation) {
                    await installation.checkAlive(2000);
                    if (installation.alive && this.shared.installation === undefined) {
                        this.shared.setInstallation(installation);
                    }
                }
            }
            if (this.shared.installation === undefined) {
                for (let installation of this.otherInstallations) {
                    await installation.checkAlive(2000);
                    if (installation.alive && this.shared.installation === undefined) {
                        this.shared.setInstallation(installation);
                    }
                }
            }
        }, 60000);
        this.installationsLoading = true;
        this.filter = '';
        this.guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        this.registrationKey = '';
        this.error = '';
        this.registrationKeyNotFound = false;
        this.registrationKeySubscription = this.bindingEngine
            .propertyObserver(this, 'registrationKey')
            .subscribe(() => {
                this.registrationKeyNotFound = false;
            });
    }

    async loadInstallations() {
        try {
            let installations = await this.api.getInstallations();
            Toolbox.crossfiller(installations, this.shared.installations, 'id', (id) => {
                return this.installationFactory(id);
            });
            this.shared.installations.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            let hasRegistrationKey = false;
            for (let installation of this.shared.installations) {
                if (![null, undefined].contains(installation.registrationKey)) {
                    hasRegistrationKey = true;
                    break;
                }
            }
            this.hasRegistrationKey = hasRegistrationKey;
            this.installationsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Installations: ${error.message}`);
        }
    }

    async selectInstallation(installation) {
        await installation.checkAlive(10000);
        if (installation.alive) {
            this.shared.setInstallation(installation);
        }
    }

    async addInstallation() {
        if (!this.canAdd.valid) {
            return;
        }
        this.error = '';
        try {
            let data = await this.api.addInstallation(this.registrationKey);
            let newInstallation = this.installationFactory(data.id);
            newInstallation.fillData(data);
            let installation = this.shared.installations.filter((i) => i.id === newInstallation.id)[0];
            if (installation === undefined) {
                installation = newInstallation;
                this.shared.installations.push(installation);
                this.shared.installations.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
            }
            await this.selectInstallation(installation);
            this.registrationKey = '';
        } catch (error) {
            if (error.cause === 'bad_request' && error.message === 'invalid_registration_key') {
                this.registrationKeyNotFound = true;
            } else {
                this.error = this.i18n.tr('generic.unknownerror');
                Logger.log(`Could not add Installation: ${error}`);
            }
        }
    }

    @computedFrom('registrationKey', 'registrationKeyNotFound')
    get canAdd() {
        if (this.registrationKey === '') {
            return {valid: false, empty: true};
        }
        if (!this.guidRegex.test(this.registrationKey)) {
            return {valid: false, invalidRegistrationKey: true};
        }
        if (this.registrationKeyNotFound) {
            return {valid: false, registrationKeyNotFound: true};
        }
        return {valid: true};
    }

    @computedFrom('shared', 'shared.installation')
    get offlineWarning() {
        if (this.shared.installation === undefined) {
            return '';
        }
        return this.i18n.tr('pages.cloud.installations.offlinewarning', {installation: this.shared.installation.name});
    }

    @computedFrom('shared.installations.length')
    get mainInstallations() {
        return this.shared.installations.filter((i) => i.role !== 'SUPER');
    }

    @computedFrom('shared', 'shared.installations', 'filter')
    get otherInstallations() {
        let regex = undefined;
        let filter = undefined;
        if (this.filter !== undefined && this.filter.length > 2) {
            if (this.filter.startsWith('/') && this.filter.endsWith('/')) {
                regex = new RegExp(this.filter.substring(1, this.filter.length - 1));
            } else {
                filter = this.filter;
            }
        }
        return this.shared.installations.filter((i) => {
            return i.role === 'SUPER' && (
                this.shared.installation === i ||
                (regex !== undefined && (regex.test(i.name) || regex.test(i.version) || regex.test(i.registrationKey))) ||
                (filter !== undefined && (i.name.toLowerCase().contains(filter.toLowerCase()) || i.version.contains(filter) || i.registrationKey.contains(filter)))
            );
        });
    }

    @computedFrom('shared', 'shared.installations')
    get hasOtherInstallations() {
        return this.shared.installations.filter((i) => i.role === 'SUPER').length > 0;
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.shared.installation !== undefined) {
            this.shared.installation.checkAlive(2000);
        }
    }

    deactivate() {
        this.refresher.stop();
    }

    detached() {
        this.registrationKeySubscription.dispose();
    }
}
