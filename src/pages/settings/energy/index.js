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
import {Logger} from 'components/logger';
import {DialogService} from 'aurelia-dialog';
import {ConfigureLabelInputsWizard} from 'wizards/configurelabelinputs/index';
import {ConfigureLabelWizard} from 'wizards/configurelabel/index';

@inject(DialogService)
export class Energy extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.rooms = [];
        this.suppliers = [];
        this.labelInputs = [];
        this.powerInputs = [];
        this.pulseCounters = [];
        this.labelRemoving = null;
        this.refresher = new Refresher(async () => {
            this.loadData();
        }, 60000);
        this.loadData();
    }

    async loadData() {
        await Promise.all([
            this.loadRooms(),
            this.loadLabelInputs(),
        ]);
        await Promise.all([
            this.loadPowerInputs(),
            this.loadPulseCounters(),
            this.loadLabels(),
        ]);
    }

    async loadRooms() {
        try {
            const { data } = await this.api.getRooms();
            this.rooms = data;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
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

    async loadLabelInputs() {
        try {
            const [{ data }, _] = await Promise.all([this.api.getLabelInputs(), this.loadSuppliers()]);
            this.labelInputs = data;
            this.labelInputs.forEach(labelInput => {
                labelInput.supplierName = this.getSupplier(labelInput);
            });
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
        }
    }

    async loadPowerInputs() {
        try {
            // TODO
            // const { data } = this.api.getPowerInputs();
        } catch (error) {
            Logger.error(`Could not load PowerInputs: ${error.message}`);
        }
    }

    async loadPulseCounters() {
        try {
            const { data } = await this.api.getPulseCounters();
            this.pulseCounters = data.filter(counter => counter.name);
            this.pulseCounters.forEach(pulseCounter => {
                const room = this.rooms.find(({ id }) => id === pulseCounter.location?.room_id);
                const labelInput = this.labelInputs.find(({ id }) => id === pulseCounter.label_input);
                pulseCounter.supplierName = this.getSupplier(labelInput);
                pulseCounter.roomName = (room || { name: this.i18n.tr('pages.settings.energy.table.noroom') }).name;
                pulseCounter.pulses = labelInput
                    ? labelInput.consumption_type === 'ELECTRICITY' ? 'kWh' : 'm3'
                    : this.i18n.tr('generic.na');
            });
        } catch (error) {
            Logger.error(`Could not load PulseCounters: ${error.message}`);
        }
    }

    async loadLabels() {
        try {
            const filter = {};
            const { data } = await this.api.getLabels(JSON.stringify(filter));
            this.labels = data.map(({ label_input_ids, ...rest }) => ({
                ...rest,
                label_inputs: this.mapToFormulaString(label_input_ids),
            })).sort((a, b) => a.label_id - b.label_id);
        } catch (error) {
            Logger.error(`Could not load Labels: ${error.message}`);
        }
    }

    getSupplier(labelInput) {
        const supplierNotSet = this.i18n.tr('generic.notset');
        return labelInput
            ? (this.suppliers.find(({ id }) => id === labelInput.supplier_id) || { name: supplierNotSet }).name
            : supplierNotSet;
    }

    // version 1 means an another type of module (but count of the inputs is 8)
    preparePowerModule = (data) => new Array(data.version === 1 ? 8 : data.version).fill(undefined).map((el, input_number) => {
        const { label_input, location: { room_id }, id } = this.powerInputs.find(({ module: { module_id }, input_id }) =>
            module_id === data.id && input_id === input_number) || { label_input: null, location: { room_id: null }, id: null };
        let labelInput = this.labelInputs.find(({ id }) => id === label_input);
        let supplier_name = this.getSupplier(labelInput);
        const sensors = {
            8: { 0: this.i18n.tr('generic.notset'), 2: '25A', 3: '50A' },
            12: { 0: this.i18n.tr('generic.notset'), 2: '12.5A', 3: '25A', 4: '50A', 5: '100A', 6: '200A', 150: '150A', 400: '400A' },
        };
        const powerModule = {
            input_number,
            supplier_name,
            power_input_id: id,
            hasNotInputInfo: id === null,
            label_input: labelInput,
            power_module_id: data.id,
            power_module_address: data.address,
            name: data[`input${input_number}`],
            version: data.version,
            sensor_id: data[`sensor${input_number}`],
            room: this.rooms.find(({ id }) => id === room_id),
        }

        if (data.version !== 1) {
            powerModule.inverted = Boolean(data[`inverted${input_number}`]);
            powerModule.sensor = undefined;
            if (sensors[data.version] && data[`sensor${input_number}`] && sensors[data.version][data[`sensor${input_number}`]]) {
                powerModule.sensor = sensors[data.version][data[`sensor${input_number}`]];
            }
        }

        return powerModule;
    });

    async powerModuleUpdate(energyModule) {
        const prevModules = [...this.powerModules];
        const { name, input_number, power_input_id, inverted, sensor_id = 0, room } = energyModule;
        try {
            if (!power_input_id) {
                throw Error('id is null');
            }
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
            await this.api.setPowerModules(this.modules, false);
        } catch (error) {
            this.powerModules = prevModules;
            Logger.error(`Could not update power module: ${error.message}`);
        }
    }

    editPowerInput(powerInput) {
        const { suppliers, rooms } = this;
        this.dialogService.open({
            viewModel: ConfigureLabelInputsWizard, model: {
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
            const { label_input, supplier_id, module } = output;
            this.powerModuleUpdate(output.module);
            if (output.module.power_input_id) {
                const { power_input_id } = output.module;
                const { id, consumption_type, name: labelInputName, input_type } = label_input;
                const name = labelInputName !== module.name ? module.name : labelInputName;
                if (id) {
                    this.labelInputUpdate({ id, consumption_type, name, input_type, power_input_id, supplier_id }, output.module);
                } else {
                    this.createLabelInput({
                        consumption_type,
                        supplier_id,
                        name: output.module.name,
                        input_type: 'POWER_INPUT',
                        power_input_id,
                    }, output.module);
                }
            }
            return;
        });
    }

    editPulseCounter(pulseCounter) {
        const { suppliers, rooms } = this;
        const labelInput = this.labelInputs.find(({ id }) => id === pulseCounter.label_input);
        this.dialogService.open({
            viewModel: ConfigureLabelInputsWizard, model: {
                powerType: 'PULSE_COUNTER',
                pulseCounter,
                labelInput,
                suppliers,
                rooms,
            }
        }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit pulse counter wizard was cancelled');
                return;
            }
            const { pulseCounter, labelInput } = output;
            await this.api.updatePulseCounter({
                id: pulseCounter.id,
                name: pulseCounter.name,
                ppu: Number(pulseCounter.ppu),
            });
            if (labelInput.id) {
                await this.api.updateLabelInputs({
                    id: labelInput.id,
                    name: pulseCounter.name,
                    input_type: labelInput.input_type,
                    consumption_type: labelInput.consumption_type,
                    pulse_counter_id: pulseCounter.id,
                    supplier_id: labelInput.supplier_id,
                });
            } else {
                await this.api.createLabelInput({
                    name: pulseCounter.name,
                    input_type: 'PULSE_COUNTER',
                    consumption_type: labelInput.consumption_type,
                    pulse_counter_id: pulseCounter.id,
                    supplier_id: labelInput.supplier_id,
                });
            }
        });
    }

    mapEmptyName = ({ id, name, ...rest }) => ({ ...rest, id, name: name || `${this.i18n.tr('generic.noname')} (${id})` });
    filterUnconfigured = ({ power_input_id, pulse_counter_id }) => !power_input_id || !pulse_counter_id;

    async addLabel() {
        this.dialogService.open({
            viewModel: ConfigureLabelWizard, model: {
                labelInputs: this.labelInputs.filter(this.filterUnconfigured).map(this.mapEmptyName),
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
                labelInputs: this.labelInputs.filter(this.filterUnconfigured).map(this.mapEmptyName),
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

    async pulseCounterUpdate(...args) {
        const ppu = Number(args.pop());
        const id = args.shift();
        try {
            await this.api.setPulseCounterConfiguration(...args);
            await this.api.updatePulseCounter({ ppu, id, name: args[2], persistent: args[4] });
            const pc = this.pulseCounters.find(({ id: idPC }) => idPC === id);
            if (pc) {
                pc.name = args[2];
                pc.ppu = ppu;
                pc.room_name = args[3] !== 255 ? this.rooms.find(({ id }) => id === args[3]).name : this.i18n.tr('pages.settings.energy.table.noroom');
                pc.persistent = args[4];
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
            this.labelInputs.push(data);
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

    async removeLabel(index) {
        this.labelRemoving = index;
        const [label] = [...this.labels].splice(index, 1);
        try {
            await this.api.deleteLabel(label.label_id);
            this.labelRemoving = null;
            this.labels.splice(index, 1);
        } catch (error) {
            this.labels.splice(index, 0, label);
            this.labelRemoving = null;
            Logger.error(`Could not remove Label input: ${error.message}`);
        }
    }

    getRoomName(room) {
        return room && room.name || this.i18n.tr('pages.settings.energy.table.noroom');
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

    installationUpdated() {
        this.loadData();
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
