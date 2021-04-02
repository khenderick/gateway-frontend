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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Logger} from 'components/logger';
import {Toolbox} from 'components/toolbox';
import {Backup} from 'containers/backup';

@inject(Factory.of(Backup))
export class Backups extends Base {
    constructor(backupFactory, ...rest) {
        super(...rest);
        this.backupFactory = backupFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadBackups();
            this.shared.installation.refresh();
            this.backupStarted = false;
            this.restoreStarted = false;
            this.signaler.signal('reload-backups');
        }, 5000);
        this.initVariables();
        this.loadSettings();
    }

    initVariables() {
        this.backups = [];
        this.activeBackup = undefined;
        this.autoTime = false;
        this.backupsLoading = true;
        this.settingsLoading = true;
        this.installationHasUpdated = false;
        this.pickerOptions = {
            format: 'HH:mm',
        };
        this.startValue = '';
        this.endValue = '';
        this.weekDayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        this.weekDay = 'monday';
    }

    @computedFrom('startValue', 'endValue', 'weekDay')
    get isValid() {
        return this.endValue && this.startValue && this.isFirstDateBigger(this.endValue, this.startValue);
    }

    weekText = (day) => {
        return this.i18n.tr(`generic.days.long.${day}`);
    }

    autoTimeChange() {
        if (this.autoTime) {
            this.startValue = '00:00:00';
            this.endValue = '03:00:00';
            this.weekDay = 'monday';
            this.saveSettings();
        }
    }

    saveSettings = () => {
        try {
            const weekday = this.weekDayKeys.findIndex(day => day === this.weekDay);
            const request = {
                enabled: true,
                end_time: this.endValue.concat(':00'),
                start_time: this.startValue.concat(':00'),
                weekday,
            };
            this.api.setBackupSettings(request);
        } catch (error) {
            this.autoTime = true;
            Logger.error(`Could not load backups: ${error.message}`);
        }
    }

    isFirstDateBigger(date1, date2) {
        const [hours1, minutes1] = date1.split(':');
        const [hours2, minutes2] = date2.split(':');
        if (hours1 > hours2) {
            return true;
        } else if (hours1 === hours2) {
            return minutes1 > minutes2;
        }
        return false;
    }

    async loadBackups() {
        try {
            let data = await this.api.getBackups();
            Toolbox.crossfiller(data.data, this.backups, 'id', (id) => {
                return this.backupFactory(id);
            });
            this.backups.sort((a, b) => {
                return a.created.unix() < b.created.unix() ? 1 : -1;
            });
            this.backupsLoading = false;

        } catch (error) {
            Logger.error(`Could not load backups: ${error.message}`);
        }
    }

    async loadSettings() {
        try {
            this.settingsLoading = true;
            const { data: { backup_window } } = await this.api.getInstallationSettings();
            this.backupWindow = backup_window;
            const { end_time, start_time, weekday } = backup_window;
            this.autoTime = weekday === 0 && end_time === '03:00:00' && start_time === '00:00:00';
            this.weekDay = this.weekDayKeys[weekday];
            this.startValue = start_time.substr(0, 5);
            this.endValue = end_time.substr(0, 5);
            this.settingsLoading = false;
        } catch (error) {
            Logger.error(`Could not load settings: ${error.message}`);
        }
    }

    async restoreBackup(backup) {
        try {
            if (!this.shared.installation.isBusy) {
                this.restoreStarted = true;
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
            if (!this.shared.installation.isBusy) {
                this.backupStarted = true;
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
