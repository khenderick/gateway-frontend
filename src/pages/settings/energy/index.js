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
            const { data } = await this.api.getPowerInputs();
            this.powerInputs = data.filter(input => input.name);
            this.powerInputs.forEach(powerInput => {
                const room = this.rooms.find(({ id }) => id === powerInput.location?.room_id);
                const labelInput = this.labelInputs.find(({ id }) => id === powerInput.label_input);
                powerInput.supplierName = this.getSupplier(labelInput);
                powerInput.roomName = (room || { name: this.i18n.tr('pages.settings.energy.table.noroom') }).name;
            });
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

    editPowerInput(powerInput) {
        const { suppliers, rooms } = this;
        const labelInput = this.labelInputs.find(({ id }) => id === powerInput.label_input);
        this.dialogService.open({
            viewModel: ConfigureLabelInputsWizard, model: {
                powerType: 'POWER_INPUT',
                powerInput,
                labelInput,
                suppliers,
                rooms,
            }
        }).whenClosed(async ({ wasCancelled, output }) => {
            if (wasCancelled) {
                Logger.info('The edit power ConfigureLabelInputsWizard was cancelled');
                return;
            }
            const { powerInput, labelInput } = output;
            powerInput.supplierName = labelInput.supplierName;
            await this.api.setPowerInputsLocation({
                id: powerInput.id,
                room_id: powerInput.room_id
            });
            if (labelInput.id) {
                await this.api.updateLabelInputs({
                    id: labelInput.id,
                    name: powerInput.name,
                    input_type: labelInput.input_type,
                    consumption_type: labelInput.consumption_type,
                    power_input_id: powerInput.id,
                    supplier_id: labelInput.supplier_id,
                });
            } else {
                await this.api.createLabelInput({
                    name: powerInput.name,
                    input_type: 'POWER_INPUT',
                    consumption_type: labelInput.consumption_type,
                    power_input_id: powerInput.id,
                    supplier_id: labelInput.supplier_id,
                });
            }
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
            pulseCounter.supplierName = labelInput.supplierName;
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

    mapEmptyName = ({ id, name, ...rest }) => ({ ...rest, id, name: name || `${this.i18n.tr('generic.noname')} (${id})` });
    filterUnconfigured = ({ power_input_id, pulse_counter_id }) => !power_input_id || !pulse_counter_id;

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
