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
        this.editLabel = undefined;
        this.refresher = new Refresher(async () => {
            await this.loadLabelInputs();
            await this.loadLabels();
        }, 5000);
    }

    async loadLabelInputs() {
        try {
            const { data } = await this.api.getLabelInputs();
            this.labelInputs = data;
        } catch (error) {
            Logger.error(`Could not load Label inputs: ${error.message}`);
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

    addLabelInput() {
        this.dialogService.open({ viewModel: ConfigureLabelinputsWizard, model: {} }).whenClosed((response) => {
            
            if (response.wasCancelled) {
                Logger.info('The AddLabelinputsWizard was cancelled');
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
