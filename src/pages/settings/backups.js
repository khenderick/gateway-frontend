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
import {DialogService} from 'aurelia-dialog';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Logger} from '../../components/logger';
import {Toolbox} from '../../components/toolbox';
import {Backup} from '../../containers/backup';

@inject(DialogService, Factory.of(Backup))
export class Backups extends Base {
    constructor(dialogService, backupFactory, ...rest) {
        super(...rest);
        this.backupFactory = backupFactory;
        this.dialogService = dialogService;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadBackups();
            this.signaler.signal('reload-backups');
        }, 5000);
        this.initVariables();
    }

    initVariables() {
        this.backups = [];
        this.activeBackup = undefined;
        this.backupsLoading = true;
        this.installationHasUpdated = false;
    }

    async loadBackups() {
        try {
            let data = await this.api.getBackups();
            Toolbox.crossfiller(data.data, this.backups, 'id', (id) => {
                return this.backupFactory(id);
            });
            this.backups.sort((a, b) => {
                return a.created < b.created ? 1 : -1;
            });
            this.backupsLoading = false;

        } catch (error) {
            Logger.error(`Could not load backups: ${error.message}`);
        }
    }

    @computedFrom('backups.length')
    get isBusy() {
        for (let backup of this.backups) {
            if (backup.isBusy) {
                return true;
            }
        }
        return false;
    }

    async restoreBackup(backup) {
        try {
            if (!this.isBusy) {
                await this.api.restoreBackup(backup.id);
            }
        } catch (error) {
            Logger.error(`Could not restore backup: ${error.message}`);
        }
    }

    selectBackup(backupId) {
        let foundBackup = undefined;
        for (let backup of this.backups) {
            if (backup.id === backupId) {
                foundBackup = backup;
            }
        }
        this.activeBackup = foundBackup;
    }

    async createBackup(description) {
        try {
            if (!this.isBusy) {
                await this.api.createBackup(description || '');
            }           
        } catch (error) {
            Logger.error(`Could not create backup: ${error.message}`);
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
