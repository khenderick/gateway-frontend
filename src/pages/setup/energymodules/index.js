/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {EnergyModule} from 'containers/energymodule';
import {PulseCounter} from 'containers/pulsecounter';
import {Room} from 'containers/room';
import {ConfigurePulseCounterWizard} from 'wizards/configurepulsecounters/index';
import {EnergyModuleControlWizard} from 'wizards/energymodule/index';

@inject(DialogService, Factory.of(EnergyModule), Factory.of(PulseCounter), Factory.of(Room))
export class EnergyModules extends Base {
    constructor(dialogService, powerModuleFactory, pulseCounterFactory, roomFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.powerModuleFactory = powerModuleFactory;
        this.pulseCounterFactory = pulseCounterFactory;
        this.roomFactory = roomFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
            this.loadRooms();
            this.loadPowerModules();
            this.loadPulseCounters();
            this.signaler.signal('reload-energymodules');
        }, 60000);
        this.initVariables();
    }

    initVariables() {
        this.powerModules = [];
        this.powerModulesLoading = true;
        this.pulseCounters = [];
        this.pulseCountersLoading = true;
        this.rooms = [];
        this.roomsLoading = true;
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
    }

    async loadRooms() {
        try {
            const { data } = await this.api.getRoomConfigurations();
            Toolbox.crossfiller(data, this.rooms, 'id', (id) => {
                return this.roomFactory(id);
            });
            this.roomsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    async loadPowerModules() {
        try {
            const { modules } = await this.api.getPowerModules();
            Toolbox.crossfiller(modules, this.powerModules, 'id', (id) => {
                return this.powerModuleFactory(id);
            });
            this.powerModulesLoading = false;
        } catch (error) {
            Logger.error(`Could not load PowerModules: ${error.message}`);
        }
    }

    async loadPulseCounters() {
        try {
            const { config } = await this.api.getPulseCounterConfigurations();
            Toolbox.crossfiller(config, this.pulseCounters, 'id', (id) => {
                return this.pulseCounterFactory(id);
            });
            this.pulseCounters.forEach(counter => {
                if (counter.room !== 255) {
                    const { name: roomName } = this.rooms.find(({ id }) => id === counter.room) || { name: '' };
                    counter.roomName = roomName;
                }
            });
            this.pulseCountersLoading = false;
        } catch (error) {
            Logger.error(`Could not load PulseCounter configurations: ${error.message}`);
        }
    }

    editPowerModule(module) {
        this.dialogService.open({ viewModel: EnergyModuleControlWizard, model: {
            moduleId: module.id,
            modules: this.powerModules,
        }}).whenClosed(async (response) => {
            if (response.wasCancelled) {
                Logger.info('The PowerModuleWizard was cancelled');
                return;
            }
            const prev = [...this.powerModules];
            try {
                const index = this.powerModules.findIndex(({ id }) => id === module.id);
                this.powerModules[index]['name'] = response.output.name;
                await this.api.setPowerModules(this.powerModules, false);
            } catch (e) {
                this.powerModules = prev;
                Logger.error(`Could not change name of the energy module: ${error.message}`);
            }
        });
    }

    editPulseCounter(pulseCounter) {
        this.dialogService.open({viewModel: ConfigurePulseCounterWizard, model: { pulseCounter }}).whenClosed((response) => {
            if (response.wasCancelled) {
                Logger.info('The ConfigurePulseCounterWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
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
