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
import {ConfigurePowerInputsWizard} from 'wizards/configurepowerinputs/index';
import {ConfigureLabelWizard} from 'wizards/configurelabel/index';
import {ConfigurePulseCounterWizard} from 'wizards/configurepulsecounters/index';

@inject(DialogService)
export class Energy extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.labelInputs = [];
        this.modules = [];
        this.powerModules = [];
        this.powerInputs = [];
        this.pulseCountersConfigurationsSource = [];
        this.pulseCountersSource = [];
        this.pulseCounters = [];
        this.isCloud = this.shared.target === 'cloud';
        this.activeModuleIndex = undefined;
        this.rooms = [];
        this.refresher = new Refresher(async () => {
        }, 5000);
        this.loadData();
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
        this.loadLabels();
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

    async loadLabels() {
        try {
            const filter = {};
            const { data } = await this.api.getLabels(JSON.stringify(filter));
            this.labels = data;
            this.labels = this.labels.map(({ label_input_ids, ...rest }) => ({
                ...rest,
                label_inputs: this.mapToFormulaString(label_input_ids),
            }));
            this.labels.sort((a, b) => a.label_id > b.label_id);
        } catch (error) {
            Logger.error(`Could not load Labels: ${error.message}`);
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
        this.pulseCounters = this.pulseCountersConfigurationsSource.map(({ id: sourceId, name, input }) => {
            const { counter_id, id, label_input, ppu, location: { room_id } } = this.pulseCountersSource.find(({ counter_id }) => sourceId === counter_id);
            const labelInput = this.labelInputs.find(({ id }) => id === label_input);
            let pulses = labelInput
                ? labelInput.consumption_type === 'ELECTRICITY' ? 'kWh' : 'm3'
                : this.i18n.tr('generic.na');
            const supplier_name = this.getSupplier(labelInput);
            return {
                id,
                counter_id,
                sourceId,
                ppu,
                name,
                pulses,
                input,
                supplier_name,
                label_input: labelInput,
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
        const { label_input, location: { room_id }, id } = this.powerInputs.find(({ input_id }) => input_id === input_number);
        let labelInput = null;
        let supplier_name = null;
        if (this.isCloud) {
            labelInput = this.labelInputs.find(({ id }) => id === label_input);
            supplier_name = this.getSupplier(labelInput);
        }
        const sensors = {
            8: { 0: this.i18n.tr('generic.notset'), 2: '25A', 3: '50A' },
            12: { 0: this.i18n.tr('generic.notset'), 2: '12.5A', 3: '25A', 4: '50A', 5: '100A', 6: '200A' },
        };

        return {
            input_number,
            supplier_name,
            power_input_id: id,
            label_input: labelInput,
            power_module_id: data.id,
            power_module_address: data.address,
            name: data[`input${input_number}`],
            version: data.version,
            inverted: Boolean(data[`inverted${input_number}`]),
            sensor_id: data[`sensor${input_number}`],
            sensor_name: sensors[data.version][data[`sensor${input_number}`]],
            room_name: (this.rooms.find(({ id }) => id === room_id) || { name: this.i18n.tr('pages.settings.energy.table.noroom') }).name,
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

    async powerModuleUpdate(energyModule) {
        const prevModules = [...this.powerModules];
        const { name, input_number, power_input_id, inverted, sensor_id, room } = energyModule;
        try {
            await this.api.setPowerInputsLocation({ id: power_input_id, room_id: room ? room.id : null });
        } catch (error) {
            Logger.error(`Could not set location of power module: ${error.message}`);
        }
        try {
            energyModule.room_name = room ? room.name : this.i18n.tr('pages.settings.energy.table.noroom');
            const editInputIndex = this.powerModules.findIndex(({ input_number: id }) => id === input_number);
            if (editInputIndex !== -1) {
                this.powerModules.splice(editInputIndex, 1, energyModule);
            }
            this.modules[this.activeModuleIndex][`inverted${input_number}`] = Number(inverted);
            this.modules[this.activeModuleIndex][`input${input_number}`] = name;
            this.modules[this.activeModuleIndex][`sensor${input_number}`] = sensor_id;
            await this.api.setPowerModules(this.modules);
        } catch (error) {
            this.powerModules = prevModules;
            Logger.error(`Could not update power module: ${error.message}`);
        }
    }

    async pulseCounterUpdate(...args) {
        const ppu = Number(args.pop());
        const id = args.shift();
        try {
            await this.api.setPulseCounterConfiguration(...args);
            await this.api.updatePulseCounter({ ppu, id, name: args[2] });
            const pc = this.pulseCounters.find(({ id: idPC }) => idPC === id);
            if (pc) {
                pc.name = args[2];
                pc.ppu = ppu;
                pc.room_name = args[3] !== 255 ? this.rooms.find(({ id }) => id === args[3]).name : this.i18n.tr('pages.settings.energy.table.noroom');
            }
        } catch (error) {
            Logger.error(`Could not update pulse counter: ${error.message}`);
        }
    }

    async labelInputUpdate(labelInput, input, isPowerInput = true) {
        try {
            const { data } = await this.api.updateLabelInputs(labelInput);
            const labelInputIndex = this.labelInputs.findIndex(({ id }) => id === data.id);
            if (labelInputIndex !== -1) {
                this.labelInputs[labelInputIndex] = data;
            }
            const supplier_name = this.getSupplier(data);
            if (isPowerInput) {
                const powerModules = this.powerModules.find(({ input_number }) => input_number === input.input_number);
                powerModules.supplier_name = supplier_name;
                powerModules.label_input = data;
            } else {
                const pulseCounter = this.pulseCounters.find(({ id }) => id === input.id);
                pulseCounter.supplier_name = supplier_name;
                pulseCounter.label_input = data;
            }
        } catch (error) {
            Logger.error(`Could not update label input: ${error.message}`);
        }
    }

    async createLabelInput(labelInput, input, isPowerInput = true) {
        try {
            const { data } = await this.api.createLabelInput(labelInput);
            const supplier_name = this.getSupplier(data);
            if (isPowerInput) {
                const powerModules = this.powerModules.find(({ input_number }) => input_number === input.input_number);
                powerModules.supplier_name = supplier_name;
                powerModules.label_input = data;
            } else {
                const pulseCounter = this.pulseCounters.find(({ id }) => id === input.id);
                pulseCounter.supplier_name = supplier_name;
                pulseCounter.label_input = data;
            }
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

    editPowerInput(powerInput) {
        const { suppliers, rooms } = this;
        this.dialogService.open({
            viewModel: ConfigurePowerInputsWizard, model: {
                module: { ...powerInput },
                label_input: powerInput.label_input,
                power_type: 'POWER_INPUT',
                suppliers,
                supplier: powerInput.supplier_name,
                rooms,
            }
        }).whenClosed(({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit power inputs wizard was cancelled');
                return;
            }
            const { label_input, supplier_id } = output;
            this.powerModuleUpdate(output.module);
            if (this.isCloud) {
                const { id, consumption_type, name, input_type, power_input_id } = label_input;
                if (id) {
                    this.labelInputUpdate({ id, consumption_type, name, input_type, power_input_id, supplier_id }, output.module);
                } else {
                    this.createLabelInput({
                        consumption_type,
                        supplier_id,
                        name: output.module.name,
                        input_type: 'POWER_INPUT',
                        power_input_id: output.module.input_number,
                    }, output.module);
                }
            }
            return;
        });
    }

    editPulseCounter(pulseCounter) {
        const { suppliers, rooms } = this;
        this.dialogService.open({
            viewModel: ConfigurePulseCounterWizard, model: {
                pulseCounter: { ...pulseCounter },
                suppliers,
                power_type: 'PULSE_COUNTER',
                label_input: pulseCounter.label_input,
                supplier: pulseCounter.supplier_name,
                rooms,
            }
        }).whenClosed(({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit pulse counter wizard was cancelled');
                return;
            }
            const { pulseCounter: { id, sourceId, name, room, ppu, input }, label_input, supplier_id } = output;
            this.pulseCounterUpdate(id, sourceId, input, name, room, ppu);
            if (this.isCloud) {
                const { id, consumption_type, input_type } = label_input;
                if (id) {
                    this.labelInputUpdate({
                        id,
                        name,
                        consumption_type,
                        input_type,
                        pulse_counter_id: output.pulseCounter.id,
                        supplier_id,
                    }, output.pulseCounter, false);
                } else {
                    this.createLabelInput({
                        name,
                        consumption_type,
                        supplier_id,
                        input_type: 'PULSE_COUNTER',
                        pulse_counter_id: output.pulseCounter.id,
                    },
                    output.pulseCounter,
                    false,
                    );
                }
            }
        });
    }

    mapEmptyName = ({ id, name, ...rest }) => ({ ...rest, id, name: name || `${this.i18n.tr('generic.noname')} (${id})` });

    async addLabel() {
        this.dialogService.open({
            viewModel: ConfigureLabelWizard, model: {
                labelInputs: this.labelInputs.map(this.mapEmptyName),
            }
        }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The add label wizard was cancelled');
                return;
            }
            try {
                const { name, label_type, formula } = output;
                const payload = {
                    name,
                    formula,
                    type: label_type,
                };
                const { data } = await this.api.createLabel(payload);
                data.label_type = data.type;
                data.label_id = data.id;
                data.label_inputs = this.mapToFormulaString(data.label_input_ids);
                this.labels.push(data);
            } catch (error) {
                Logger.error(`Could not create Label: ${error.message}`);
            }
        });
    }

    async editLabel(label) {
        this.dialogService.open({
            viewModel: ConfigureLabelWizard, model: {
                isEdit: true,
                ...label,
                labelInputs: this.labelInputs.map(this.mapEmptyName),
            }
        }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit label inputs wizard was cancelled');
            }
            try {
                const { id, formula, name, label_type } = output;
                const payload = {
                    id,
                    name,
                    type: label_type,
                    formula,
                };
                const { data } = await this.api.updateLabel(payload);
                const editLabelIndex = this.labels.findIndex(({ label_id }) => label_id === id);
                if (editLabelIndex !== -1) {
                    data.label_type = data.type;
                    data.label_id = data.id;
                    data.label_inputs = this.mapToFormulaString(data.label_input_ids);
                    this.labels.splice(editLabelIndex, 1, data);
                    // this.signaler.signal('reload-labels');
                }
            } catch (error) {
                Logger.error(`Could not edit Label input: ${error.message}`);
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

    sortEnergyModule(direction) {
        this.powerModules.sort((a, b) => direction === 'up' ? b.input_number - a.input_number : a.input_number - b.input_number)
    }

    sortPulseCounters(direction) {
        this.pulseCounters.sort((a, b) => direction === 'up' ? b.id - a.id : a.id - b.id)
    }

    sortLabels(direction) {
        this.labelInputs.sort((a, b) => direction === 'up' ? b.id - a.id : a.id - b.id)
    }

    mapToFormulaString = label_input_ids => label_input_ids.map(input_id => (
        this.labelInputs.find(({ id }) => input_id === id) || { name: '' }).name)
        .filter(name => !!name)
        .join(' + ')

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
