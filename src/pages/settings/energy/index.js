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
import { ConfigurePowerInputsWizard } from 'wizards/configurepowerinputs/index';
import { ConfigureLabelInputsWizard } from 'wizards/configurelabelinputs/index';
import { ConfigurePulseCounterWizard } from 'wizards/configurepulsecounters/index';

@inject(DialogService)
export class Energy extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.labels = [];
        this.labelInputs = [];
        this.modules = [];
        this.powerModules = [];
        this.powerInputs = [];
        this.pulseCountersConfigurationsSource = [];
        this.pulseCountersSource = [];
        this.pulseCounters = [];
        this.editLabel = undefined;
        this.isCloud = this.shared.target === 'cloud';
        this.selectedPowerInput = undefined;
        this.selectedPulseCounter = undefined;
        this.selectedLabelInput = undefined;
        this.activeModuleIndex = undefined;
        this.rooms = [];
        this.refresher = new Refresher(async () => {
 
        }, 5000);
        this.loadData();
        this.loadLabels();
    }

    async loadData() {
        await Promise.all([
            this.loadLabelInputs(),
            this.loadSuppliers(),
            this.loadPulseCounters(),
            this.loadPowerModules(),
            this.loadRooms(),
        ]);
        
        const [firstModule] = this.modules;
        if (firstModule) {
            this.powerModules = this.preparePowerModule(firstModule);
            this.activeModuleIndex = 0;
        }
        this.preparePulseCounters();
        this.prepareLabelInputs();
    }

    async loadPowerModules() {
        try {
            const [{ modules = [{}] }, { data: powerInputs }] = await Promise.all([
                this.api.getPowerModules(),
                this.api.getPowerInputs(),
            ]);
            this.modules = modules;
            this.powerInputs = powerInputs;
        } catch (error) {
            Logger.error(`Could not load Power Modules: ${error.message}`);
        }
    }

    async loadPulseCounters() {
        try {
            const [{ config = [] }, { data }] = await Promise.all([this.api.getPulseCounterConfigurations(), this.api.getPulseCounters()]);
            this.pulseCountersConfigurationsSource = config;
            this.pulseCountersSource = data;
        } catch (error) {
            Logger.error(`Could not load Pulse counters: ${error.message}`);
        }
    }

    async preparePulseCounters() {
        this.pulseCounters = this.pulseCountersConfigurationsSource.reverse().map(({ id, name, input }) => {
            const { label_input, location: { room_id } } = this.pulseCountersSource.find(({ id: pcId }) => id === pcId);
            const labelInput = this.labelInputs.find(({ id }) => id === label_input);
            let pulses = labelInput
                ? labelInput.consumption_type === 'ELECTRICITY' ? 'kWh' : 'm3'
                : this.i18n.tr('generic.na');
            const supplier_name = this.getSupplier(labelInput);
            return {
                id,
                name,
                pulses,
                input,
                supplier_name,
                room_name: (this.rooms.find(({ id }) => id === room_id) || { name: this.i18n.tr('pages.settings.energy.table.noroom') }).name,
            };
        });
    }

    getSupplier(labelInput) {
        const supplierNotSet = this.i18n.tr('generic.notset');
        return labelInput
            ? (this.suppliers.find(({ id }) => id === labelInput.supplier_id) || { name: supplierNotSet }).name
            : supplierNotSet;
    }
    
    preparePowerModule = (data) => new Array(data.version).fill(undefined).map((el, input_number) => {
        const { label_input, location: { room_id } } = this.powerInputs.find(({ id }) => id === input_number);
        let labelInput = null;
        let supplier_name = null;
        if (this.isCloud) {
            labelInput = this.labelInputs.find(({ id }) => id === label_input);
            supplier_name = this.getSupplier(labelInput);
        }
        return {
            input_number,
            supplier_name,
            label_input: labelInput,
            power_module_id: data.id,
            power_module_address: data.address,
            name: data[`input${input_number}`],
            version: data.version,
            inverted: Boolean(data[`inverted${input_number}`]),
            sensor_id: data[`sensor${input_number}`],
            room_name: this.rooms.find(({ id }) => id === room_id) || this.i18n.tr('pages.settings.energy.table.noroom'),
        };
    });

    selectPowerModule(index) {
        if (this.modules[index]) {
            this.activeModuleIndex = index;
            this.powerModules = this.preparePowerModule(this.modules[index]);
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
        if (!this.isCloud) {
            return;
        }
        try {
            const { data } = await this.api.getLabelInputs();
            this.labelInputs = data;
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
        }
    }

    async loadSuppliers() {
        if (!this.isCloud) {
            return;
        }
        try {
            const { data } = await this.api.getSuppliers();
            this.suppliers = data;
        } catch (error) {
            Logger.error(`Could not load Suppliers: ${error.message}`);
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

    async powerModuleUpdate(energyModule) {
        const prevModules = [...this.powerModules];
        try {
            const { name, input_number, inverted, sensor } = energyModule;
            this.modules[this.activeModuleIndex][`inverted${input_number}`] = Number(inverted);
            this.modules[this.activeModuleIndex][`input${input_number}`] = name;
            this.modules[this.activeModuleIndex][`sensor${input_number}`] = sensor;
            await this.api.setPowerModules(this.modules);
            this.selectedPowerInput = energyModule;
        } catch (error) {
            this.selectedPowerInput = prevModules;
            Logger.error(`Could not update power module: ${error.message}`);
        }
    }

    async pulseCounterUpdate(...args) {
        try {
            await this.api.setPulseCounterConfiguration(...args);
            const pc = this.pulseCounters.find(({ id }) => id === args[0]);
            if (pc) {
                pc.name = args[2];
                pc.room_name = args[3] !== 255 ? this.rooms.find(({ id }) => id === args[3]).name : this.i18n.tr('pages.settings.energy.table.noroom');
            }       
        } catch (error) {
            Logger.error(`Could not update pulse counter: ${error.message}`);
        }
    }

    async labelInputUpdate(labelInput) {
        try {
            const { data } = await this.api.updateLabelInputs(labelInput);
            this.selectedPowerInput.label_input = data;
            const supplier_name = this.getSupplier(data);
            this.selectedPowerInput.supplier_name = supplier_name;
            const powerModules = this.powerModules.find(({ input_number }) => input_number === this.selectedPowerInput.input_number);
            powerModules.supplier_name = supplier_name;
        } catch (error) {
            Logger.error(`Could not update label input: ${error.message}`);
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
        const { selectedPowerInput, suppliers, rooms } = this;
        this.dialogService.open({ viewModel: ConfigurePowerInputsWizard, model: {
            module: { ...selectedPowerInput },
            suppliers,
            supplier: selectedPowerInput.supplier_name,
            rooms,
        } }).whenClosed(({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit power inputs wizard was cancelled');
            }
            const { module: { label_input: { id, consumption_type, name, input_type, power_input_id } }, supplier_id } = output;
            this.powerModuleUpdate(output.module);
            if (this.isCloud) {
                this.labelInputUpdate({ id, consumption_type, name, input_type, power_input_id, supplier_id });
            }
        });
    }

    editPulseCounter() {
        const { selectedPulseCounter, suppliers, rooms } = this;
        this.dialogService.open({ viewModel: ConfigurePulseCounterWizard, model: {
            pulseCounter: { ...selectedPulseCounter },
            // suppliers,
            // supplier: selectedPowerInput.supplier_name,
            rooms,
        } }).whenClosed(({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit pulse counter wizard was cancelled');
            }
            const { pulseCounter: { id, name, room, input } } = output;
            this.pulseCounterUpdate(id, input, name, room);
        });
    }

    mapEmptyName = ({ id, name, ...rest }) => ({ ...rest, id, name: name || `${this.i18n.tr('generic.noname')} (${id})`});

    async addLabelInput() {
        const { powerInputs, pulseCounters, suppliers } = this;
        this.dialogService.open({ viewModel: ConfigureLabelInputsWizard, model: {
            powerInputs: powerInputs.map(this.mapEmptyName),
            pulseCounters: pulseCounters.map(this.mapEmptyName),
            suppliers,
        } }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The add label inputs wizard was cancelled');
            }
            try {
                const {  name, consumption_type, input_type, input_id, supplier_id } = output;
                const payload = { 
                    name,
                    consumption_type,
                    input_type,
                    supplier_id,
                    [consumption_type === 'ELECTRICITY' ? 'power_input_id' : 'pulse_counter_id']: input_id,
                };
                const { data } = await this.api.createLabelInput(payload);
                this.labelInputs.push(data);
                this.prepareLabelInputs();
            } catch (error) {
                Logger.error(`Could not create Label input: ${error.message}`);
            }
        });
    }
    
    async editLabelInput() {
        const { powerInputs, pulseCounters, suppliers } = this;
        this.dialogService.open({ viewModel: ConfigureLabelInputsWizard, model: {
            isEdit: true,
            ...this.selectedLabelInput,
            powerInputs: powerInputs.map(this.mapEmptyName),
            pulseCounters: pulseCounters.map(this.mapEmptyName),
            suppliers,
        } }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit label inputs wizard was cancelled');
            }
            try {
                const { id, name, consumption_type, input_type, input_id, supplier_id } = output;
                const payload = { 
                    id,
                    name,
                    consumption_type,
                    input_type,
                    supplier_id,
                    [consumption_type === 'ELECTRICITY' ? 'power_input_id' : 'pulse_counter_id']: input_id,
                };
                const { data } = await this.api.updateLabelInputs(payload);
                const editLabelIndex = this.labelInputs.findIndex(({ id: lbId }) => lbId === id);
                if (editLabelIndex !== -1) {
                    this.labelInputs[editLabelIndex] = data;
                }
                this.prepareLabelInputs();
            } catch (error) {
                Logger.error(`Could not create Label input: ${error.message}`);
            }
        });
    }

    prepareLabelInputs() {
        this.labelInputs = this.labelInputs.map(({ power_input_id, pulse_counter_id, supplier_id, ...rest }) => {
            const input = this[power_input_id !== undefined ? 'powerInputs' : 'pulseCounters'].find(({ id }) => (
                id === (power_input_id !== undefined ? power_input_id : pulse_counter_id)
            ));
            const supplier_name = supplier_id !== null
                ? (this.suppliers.find(({ id }) => id === supplier_id) || { name: this.i18n.tr('generic.notset') }).name
                : this.i18n.tr('generic.notset');
            return {
                ...rest,
                supplier_name,
                input_name: input 
                    ? (input.name || `${this.i18n.tr('generic.noname')} (${input.id})`)
                    : this.i18n.tr('generic.notset'),
            };
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
