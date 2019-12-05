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
import {inject, Factory} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Logger} from 'components/logger';
import {Toolbox} from 'components/toolbox';
import {Update} from 'containers/update';
import {UpdateHistory} from 'containers/update-history';

@inject(Factory.of(Update), Factory.of(UpdateHistory))
export class Updates extends Base {
    constructor(updateFactory, updateHistoryFactory, ...rest) {
        super(...rest);
        this.updateFactory = updateFactory;
        this.updateHistoryFactory = updateHistoryFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.shared.installation.refresh();
            await Promise.all([
                this.loadUpdates(),
                this.loadHistory()
            ]);
            this.signaler.signal('reload-updates');
        }, 5000);
        this.initVariables();
    }

    initVariables() {
        this.updates = [];
        this.activeUpdate = undefined;
        this.updatesLoading = true;
        this.historyLoading = true;
        this.updateStarted = false;
        this.installationHasUpdated = false;
        this.history = [];
    }

    async loadUpdates() {
        try {
            let data = await this.api.getUpdates();
            Toolbox.crossfiller(data.data, this.updates, 'id', (id) => {
                return this.updateFactory(id);
            });
            this.updates.sort((a, b) => {
                return Toolbox.compareVersions(b.toVersion.version, a.toVersion.version);
            });
            if (this.activeUpdate === undefined && this.updates.length > 0) {
                if (this.shared.installation.hasUpdate) {
                    for (let update of this.updates) {
                        if (this.shared.installation.updateVersion === update.toVersion.version) {
                            this.activeUpdate = update;
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            Logger.error(`Could not load updates: ${error.message}`);
        } finally {
            this.updatesLoading = false;
        }
    }

    async runUpdate() {
        try {
            if (!this.shared.installation.isBusy && this.activeUpdate !== undefined) {
                this.updateStarted = true;
                await this.api.runUpdate(this.shared.installation.id, this.activeUpdate.id);
                return this.router.navigate('landing');
            }
        } catch (error) {
            Logger.error(`Could not start update: ${error.message}`);
        } finally {
            this.updateStarted = false;
        }
    }

    selectUpdate(updateId) {
        let foundUpdate = undefined;
        for (let update of this.updates) {
            if (update.id === updateId) {
                foundUpdate = update;
            }
        }
        this.activeUpdate = foundUpdate;
    }

    async loadHistory() {
        try {
            let data = await this.api.updateHistory(this.shared.installation.id);
            Toolbox.crossfiller(data.data, this.history, 'id', (id) => {
                return this.updateHistoryFactory(id);
            });
            this.history.sort((a, b) => {
                return a.started.unix() < b.started.unix() ? 1 : -1;
            });
        } catch (error) {
            Logger.error(`Could not load history: ${error.message}`);
        } finally {
            this.historyLoading = false;    
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
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
