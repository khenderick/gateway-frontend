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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {Logger} from '../../components/logger';
import {Installation} from '../../containers/installation';

@inject(Factory.of(Installation))
export class OfflineInstallation extends Base {
    constructor(installationFactory, ...rest) {
        super(...rest);
        this.installationFactory = installationFactory;
        if (this.shared.installation !== undefined) {
            this.router.navigate('dashboard');
        }
        for (let item of this.shared.installations) {
            if (item.flags.length !== 0 && item.alive) {
                this.shared.updateAvailable = true;
                break;
            }
        }
        this.refresher = new Refresher(async () => {
            await this.loadInstallations();
        }, 60000);
        this.installationsLoading = true;
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
            for (let installation of this.shared.installations) {
                let data = await this.api.updateHistory(installation.id);
                for (let updateExecution of data.data) {
                    if (updateExecution.status === 'IN_PROGRESS') {
                        installation.updateLoading = true;
                        break;
                    } else {
                        installation.updateLoading = false;
                    }
                }
            }
            this.installationsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Installations: ${error.message}`);
        }
    }

    // updating message
    @computedFrom('shared', 'shared.installation')
    get offlineWarning() {
        if (this.shared.installation === undefined) {
            return '';
        }
        return this.i18n.tr('pages.cloud.installations.offlinewarning', {installation: this.shared.installation.name});
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
    }
}
