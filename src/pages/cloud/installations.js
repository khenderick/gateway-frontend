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
        this.selectedInstallations = [];
        this.allSelectedMain = false;
        this.allSelectedOther = false;
        this.checkAliveTime = 20000;
        this.refresher = new Refresher(async () => {
            await this.loadInstallations();
            this.signaler.signal('reload-installations');
            if (this.shared.installation !== undefined) {
                this.shared.installation.checkAlive(this.checkAliveTime);
            }
            for (let installation of this.mainInstallations) {
                if (this.shared.installation !== installation) {
                    await installation.checkAlive(this.checkAliveTime);
                    if (installation.alive && this.shared.installation === undefined) {
                        this.shared.setInstallation(installation);
                    }
                }
            }
            if (this.otherInstallations.length) {
                for (let installation of this.otherInstallations) {
                    await installation.checkAlive(this.checkAliveTime);
                    if (installation.alive && this.shared.installation === undefined) {
                        this.shared.setInstallation(installation);
                    }
                }
            }
        }, 10000);
        this.installationsLoading = true;
        this.installationsSearching = false;
        this.filter = '';
        this.guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        this.registrationKey = '';
        this.error = '';
        this.otherInstallations = [];
        this.registrationKeyNotFound = false;
        this.registrationKeySubscription = this.bindingEngine
            .propertyObserver(this, 'registrationKey')
            .subscribe(() => {
                this.registrationKeyNotFound = false;
            })

        this.filterSubscription = this.bindingEngine
            .propertyObserver(this, 'filter')
            .subscribe(async () => {
                //make sure to use https://aurelia.io/docs/binding/binding-behaviors#debounce
                await this.searchInstallations();
                this.signaler.signal('reload-searchInstallations');
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

    async searchInstallations() {
        if (this.filter !== undefined && this.filter.length > 2) {
            this.installationsSearching = true
            try {
                let installations = await this.api.searchInstallations(this.filter);
                Toolbox.crossfiller(installations, this.otherInstallations, 'id', (id) => {
                    return this.installationFactory(id);
                });
            } catch (error) {
                Logger.error(`Could not searh for installations: ${error.message}`);
            } finally {
                this.installationsSearching = false
            }
        }
        else {
            this.otherInstallations = []
        }
    }

    @computedFrom('mainInstallations.length')
    get hasAtLeastOneConfigAccess() {
        for (let installation of this.mainInstallations) {
            if (installation.configurationAccess) {
                return true;
            }
        }
        return false;
    }

    async selectInstallation(installation) {
        await installation.checkAlive(20000);
        if (installation.alive) {
            this.shared.setInstallation(installation);
        }
        return true;
    }

    checkedChange(installation) {
        // installation can be selected for an update only if it's alive, not in edit mode, not busy and has an available update.
        if (installation.alive && installation._edit === false && installation.isBusy === false && installation.hasUpdate && installation.configurationAccess){
            if (this.selectedInstallations.contains(installation)) {
                this.selectedInstallations.pop(installation);
                installation.checked = false;
            }
            else {
                this.selectedInstallations.push(installation);
                installation.checked = true;
            }
        }
    }

    selectAllAvailableInstallations(listOfInstallations) {
        if (this.allSelectedMain || this.allSelectedOther) {
            for (let installation of listOfInstallations) {
                if (installation.alive && installation.hasUpdate && !installation.isBusy && installation.configurationAccess) {
                    installation.checked=true;
                    this.selectedInstallations.push(installation);
                }
            }
        } else {
            for (let installation of listOfInstallations) {
                    installation.checked=false;
                    this.selectedInstallations.pop(installation);
            }
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

    async updateMultiple() {
        if (this.shared.updateAvailable){
            for (let installation of this.selectedInstallations) {
                await this.api.runUpdate(installation.id, installation.flags['UPDATE_AVAILABLE'].id);
            }
        }
    }

    async updateOne(installation) {
        if (this.shared.updateAvailable){
            await this.api.runUpdate(installation.id, installation.flags['UPDATE_AVAILABLE'].id);
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

    @computedFrom('shared.installation')
    get offlineWarning() {
        if (this.shared.installation === undefined) {
            return '';
        }
        return this.i18n.tr('pages.cloud.installations.offlinewarning', {installation: this.shared.installation.name});
    }

    @computedFrom('shared.installations.length')
    get mainInstallations() {
        return this.shared.installations;
    }

    @computedFrom('shared.currentUser')
    get isSuperUser() {
        return Boolean(this.shared.currentUser.superuser)
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.shared.installation !== undefined) {
            this.shared.installation.checkAlive(this.checkAliveTime);
        }
    }

    deactivate() {
        this.refresher.stop();
    }

    detached() {
        this.registrationKeySubscription.dispose();
        this.filterSubscription.dispose();
    }
}
