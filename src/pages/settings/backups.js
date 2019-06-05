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
import {inject} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';
import {Logger} from '../../components/logger';
import {Toolbox} from '../../components/toolbox';

@inject(DialogService)
export class Backup extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.refresher = new Refresher(() => {
            this.loadBackups().catch(() => {});
        }, 5000);

        this.backups = [];
        this.activeBackup = undefined;
    }

    async loadBackups() {
            try {
                let data = await this.api.getBackups();
                this.backups = data.data
                if (this.backups !== []) {
                    this.backups.forEach(function(backup) {
                        backup.at = Toolbox.convertUnixTimeToStringDate(backup.at * 1000);
                        if (backup.status === "FAILED") {
                            backup.style = "danger"
                        } 
                        if (backup.status === "DONE"){
                            backup.style = "success"
                        }
                        if (backup.status === "IN PROGRESS"){
                            backup.style = "warning"
                        }
                        if (backup.restores !== []) {
                            backup.restores.forEach(function(restore) {
                                restore.at = Toolbox.convertUnixTimeToStringDate(restore.at * 1000);
                            }); 
                        }
                    }); 
                }
            } catch (error) {
                Logger.error(`Could not load backups: ${error.message}`);
            }
    }

    async doBackup(backup) {
        try {
            await this.api.doBackup(backup.id);
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
            await this.api.createBackup(description || "");
        } catch (error) {
            Logger.error(`Could not create backup: ${error.message}`);
        }
    }

    installationUpdated() {
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
