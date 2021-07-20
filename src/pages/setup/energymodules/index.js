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
import {RenameEnergyModuleWizard} from 'wizards/renameenergymodule/index';
import {ConfigureEnergyModuleWizard} from 'wizards/configureenergymodules/index';
import {ConfigurePulseCounterWizard} from 'wizards/configurepulsecounters/index';

@inject(DialogService, Factory.of(EnergyModule), Factory.of(PulseCounter), Factory.of(Room))
export class EnergyModules extends Base {
    constructor(dialogService, energyModuleFactory, pulseCounterFactory, roomFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.energyModuleFactory = energyModuleFactory;
        this.pulseCounterFactory = pulseCounterFactory;
        this.roomFactory = roomFactory;
        this.sensors = {
            v8: { 0: this.i18n.tr('generic.notset'), 2: '25A', 3: '50A' },
            v12: { 0: this.i18n.tr('generic.notset'), 2:'12.5A', 3: '25A', 4: '50A', 5: '100A', 6: '200A', 150: '150A', 400: '400A' },
            v1: { 0: this.i18n.tr('generic.notset') },
        };
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
        this.energyModules = [];
        this.energyModulesLoading = true;
        this.pulseCounters = [];
        this.pulseCountersLoading = true;
        this.rooms = [];
        this.roomsLoading = true;
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
    }

    @computedFrom('energyModulesLoading')
    get listEnergyModules() {
        let modules = [];
        this.energyModules.forEach(module => {
            const versionSensors = this.sensors[`v${module.version || 12}`];
            new Array(module.version === 1 ? 8 : module.version).fill(undefined).forEach((el, id) => {
                const sensor = module[`sensor${id}`];
                const data = {
                    id: `${module.address}.${id}`,
                    module_id: id,
                    address: module.address,
                    verison: module.version,
                    name: module[`input${id}`],
                    inverted: module[`inverted${id}`],
                    sensor: sensor,
                    sensorName: versionSensors[sensor],
                    times: module[`times${id}`]
                };
                modules.push(data);
            });
        });
        return modules;
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
            Toolbox.crossfiller(modules, this.energyModules, 'id', (id) => {
                return this.energyModuleFactory(id);
            });
            this.energyModulesLoading = false;
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

    sortEnergyModule(direction) {
        this.energyModules.sort((a, b) => direction === 'up' ? b.id - a.id : a.id - b.id)
    }

    sortPulseCounters(direction) {
        this.pulseCounters.sort((a, b) => direction === 'up' ? b.id - a.id : a.id - b.id)
    }

    renameEnergyModule(energyModule) {
        this.dialogService.open({viewModel: RenameEnergyModuleWizard, model: { energyModule }}).whenClosed((response) => {
            if (response.wasCancelled) {
                Logger.info('The RenameEnergyModuleWizard was cancelled');
            }
        });
    }

    editEnergyModule(module) {
        this.dialogService.open({viewModel: ConfigureEnergyModuleWizard, model: { module, energyModules: this.energyModules }}).whenClosed((response) => {
            if (response.wasCancelled) {
                Logger.info('The ConfigureEnergyModuleWizard was cancelled');
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
