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
import {computedFrom, inject, Factory} from 'aurelia-framework';
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from '../../components/toolbox';
import {Schedule} from '../../containers/schedule';
import {AddScheduleWizard} from "../../wizards/addschedule/index";

@inject(DialogService, Factory.of(Schedule))
export class Schedules extends Base {
    constructor(dialogService, scheduleFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.scheduleFactory = scheduleFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadSchedules();
            this.signaler.signal('reload-schedules');
        }, 5000);

        this.initVariables();
    };

    initVariables() {
        this.schedules = [];
        this.activeSchedule = undefined;
        this.schedulesLoading = true;
        this.removeRequest = false;
        this.removing = false;
        this.filters = ['active', 'completed'];
        this.filter = ['active'];
        this.installationHasUpdated = false;
    }

    @computedFrom('schedules', 'filter', 'activeSchedule')
    get filteredSchedules() {
        let schedules = [];
        for (let schedule of this.schedules) {
            if ((this.filter.contains('completed') && schedule.status === 'COMPLETED') ||
                (this.filter.contains('active') && schedule.status === 'ACTIVE')) {
                schedules.push(schedule);
            }
        }
        if (!schedules.contains(this.activeSchedule)) {
            this.activeSchedule = undefined;
        }
        return schedules;
    }

    filterText(filter) {
        return this.i18n.tr(`pages.settings.schedules.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-schedules');
    }

    selectSchedule(scheduleId) {
        let foundSchedule = undefined;
        for (let schedule of this.schedules) {
            if (schedule.id === scheduleId) {
                foundSchedule = schedule;
            }
        }
        this.activeSchedule = foundSchedule;
    }

    async loadSchedules() {
        let data = await this.api.listSchedules();
        Toolbox.crossfiller(data.schedules, this.schedules, 'id', (id) => {
            return this.scheduleFactory(id);
        });
        this.schedules.sort((a, b) => {
            return a.name > b.name ? 1 : -1;
        });
        this.schedulesLoading = false;
    }

    startRemoval() {
        this.removeRequest = true;
    }

    stopRemoval() {
        this.removeRequest = false;
    }

    async remove() {
        if (this.removeRequest && this.activeSchedule !== undefined) {
            try {
                this.removing = true;
                await this.activeSchedule.delete();
            } finally {
                this.removing = false;
                this.stopRemoval();
                this.schedules.remove(this.activeSchedule);
                this.activeSchedule = undefined;
            }
        }
    }

    add() {
        this.dialogService.open({viewModel: AddScheduleWizard}).whenClosed(async (response) => {
            if (!response.wasCancelled) {
                this.loadSchedules().catch(() => {});
            } else {
                console.info('The AddScheduleWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}