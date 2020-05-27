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
import {inject, bindable, computedFrom} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {DndService} from 'bcx-aurelia-dnd';
import {Base} from 'resources/base';
import {Logger} from 'components/logger';
import {OutputControlWizard} from 'wizards/outputcontrol/index';

@bindable({ name: 'output' })
@bindable({ name: 'edit' })
@bindable({ name: 'removeOutput' })
@inject(DialogService, DndService)
export class OutputBox extends Base {
    constructor(dialogService, dndService, ...rest) {
        super(...rest);
        this.dndService = dndService;
        this.dialogService = dialogService;
    }

    async handleClickOutput() {
        if (this.edit) {
            const { removeOutput, output } = this;
            removeOutput({ output });
            return;
        }
        if (this.type === 'shutter' || this.output.status.value) {
            this.dialogService.open({ viewModel: OutputControlWizard, model: { 
                output: this.output,
                toggle: () => this.toggleOutput(),
                type: this.type === 'shutter' ? this.type : 'dimmable'
            }}).whenClosed((response) => {
                if (response.wasCancelled) {
                    Logger.info('The ConfigureOutputWizard was cancelled');
                }
            });
            return;
        }
        this.toggleOutput();
    }
    
    async toggleOutput() {
        try {
            const { id, status: { on } } = this.output;
            this.output.status.on = !on;
            await this.api.toggleOutput(id);
        } catch (error) {
            this.output.status.on = on;
            Logger.error(`Could not toggle Output: ${error.message}`);
        }
    }

    @computedFrom('output', 'output.location.floor_coordinates.x', 'output.location.floor_coordinates.y')
    get positionCss() {
        const x = (this.output && this.output.location.floor_coordinates.x) || 0;
        const y = (this.output && this.output.location.floor_coordinates.y) || 0;
  
        return {
            left: x * 7.14 + 'px',
            top: y * 6.25 + 'px'
        };
    }

    @computedFrom('dndService.isProcessing', 'dndService.model')
    get draggingMe() {
        return this.edit && this.dndService.isProcessing &&
            this.dndService.model.item === this.output;
    }

    @computedFrom('output')
    get isOutput() {
        return this.output.type === 'LIGHT' || this.output.type === 'OUTLET' || this.output.type === 'APPLIANCE';
    }

    @computedFrom('output')
    get type() {
        if (this.isOutput) {
            return this.output.type.toLowerCase();
        }
        return 'shutter';
    }

    dndModel() {
        return {
            type: 'moveItem',
            item: this.output
        };
    }

    // Aurelia
    attached() {
        this.dndService.addSource(this)
    }
    
    detached() {
        this.dndService.removeSource(this);
    }

    deactivate() {
    }
}
