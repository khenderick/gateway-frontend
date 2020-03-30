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
import {inject} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {DialogService} from 'aurelia-dialog';
import { ConfigureLabelinputsWizard } from 'wizards/configurelabelinputs/index';

@inject(DialogService)
export class Energy extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.labels = [];
        this.labelInputs = [];
        this.modules = {};
        this.powerModules = [];
        this.pulseCounterConfigurations = [];
        this.editLabel = undefined;
        this.selectedPowerInput = undefined;
        this.rooms = [];
        this.refresher = new Refresher(async () => {
            // await this.loadPowerModules();
            // await this.loadPulseCounterConfigurations();
            // await this.loadLabels();
        }, 5000);
        this.loadData();
        this.loadPowerModules();
        this.loadPulseCounterConfigurations();
        this.loadLabels();
    }

    async loadData() {
        await Promise.all[this.loadLabelInputs(), this.loadSuppliers(), this.loadRooms()];
        this.loadPowerModules();
        this.loadPulseCounterConfigurations();
        this.loadPulseCounters();
    }

    async loadPowerModules() {
        try {
            const [ { modules = [{}] }, { data: powerInputs }, ] = await Promise.all([
                this.api.getPowerModules(),
                this.api.getPowerInputs(),
            ]);
            const [data] = modules;
            this.modules = data;
            this.powerModules = new Array(data.version).fill(undefined).map((el, input_number) => {
                const { label_input, location: { room_id } } = powerInputs.find(({ id }) => id === input_number);
                const labelInput = this.labelInputs.find(({ id }) => id === label_input);
                // TODO: Change name to id
                const supplier_name = labelInput 
                    ? (this.suppliers.find(({ name }) => name === 'Default' && labelInput.supplier_id === null) || { name: '' }).name
                    : '';
                return {
                    input_number,
                    supplier_name,
                    power_module_id: data.id,
                    power_module_address: data.address,
                    name: data[`input${input_number}`],
                    inverted: Boolean(data[`inverted${input_number}`]),
                    sensor_id: data[`sensor${input_number}`],
                    room_name: this.rooms.find(({ id }) => id === room_id) || this.i18n.tr('pages.settings.energy.table.noroom'),
                    // label_input:  this.labelInputs.find(({ id }) => id === label_input),
                }
            });
        } catch (error) {
            Logger.error(`Could not load Power Modules: ${error.message}`);
        }
    }

    async loadRooms() {
        try {
            const { data } = await this.api.getRooms();
            this.rooms = data;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }
    
    async loadLabelInputs() {
        try {
            const { data } = await this.api.getLabelInputs();
            this.labelInputs = data;
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
        }
    }

    async loadSuppliers() {
        try {
            const { data } = await this.api.getSuppliers();
            this.suppliers = data;
        } catch (error) {
            Logger.error(`Could not load Suppliers: ${error.message}`);
        }
    }

    async loadPulseCounterConfigurations() {
        try {
            const { config } = await this.api.getPulseCounterConfigurations();
            this.pulseCounterConfigurations = config;
        } catch (error) {
            Logger.error(`Could not load Pulse counter configurations: ${error.message}`);
        }
    }
    
    async loadPulseCounters() {
        try {
            const { data } = await this.api.getPulseCounters();
            this.pulseCounters = data;
        } catch (error) {
            Logger.error(`Could not load Pulse counters: ${error.message}`);
        }
    }

    async loadLabels() {
        try {
            const filter = { label_type: ['GRID'] };
            const { data } = await this.api.getLabels(JSON.stringify(filter)) || { data: [] };
            this.labels = data;
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
        }
    }

    startEditLabel(label) {
        this.editLabel = { ...label };
    }

    async powerModuleInvertChanged({ input_number, inverted }) {
        try {
            this.modules[`inverted${input_number}`] = Number(inverted);
            const data = await this.api.setPowerModules(this.modules);
        } catch (error) {
            Logger.error(`Could not update power module: ${error.message}`);
        }
    }

    async saveLabel() {
        const label = { ...this.editLabel, label_input_type: this.editLabel.type };
        try {
            await this.api.updateLabel(label);
            const index = this.labelInputs.findIndex(({ id }) => label.id === id);
            if (index !== -1) {
                this.labelInputs[index].name = label.name;
            }
        } catch (error) {
            Logger.error(`Could not update Label input: ${error.message}`);
        }
        this.editLabel = undefined;
    }

    editPowerInput() {
        this.dialogService.open({ viewModel: ConfigureLabelinputsWizard, model: {} }).whenClosed((response) => {
            
            if (response.wasCancelled) {
                Logger.info('The edit label inputs wizard was cancelled');
            } else { }
        });
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
