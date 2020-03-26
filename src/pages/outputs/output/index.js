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
import {Base} from 'resources/base';
import {Logger} from 'components/logger';
import {DndService} from 'bcx-aurelia-dnd';

@bindable({ name: 'output' })
@bindable({ name: 'edit' })
@inject(DndService)
export class OutputBox extends Base {
    constructor(dndService, ...rest) {
        super(...rest);
        this.dndService = dndService;
    }

    removeActiveOutput(id, activeOutputs) {
        const activeIndex = activeOutputs.findIndex(({ id: outputId }) => id === outputId);
        activeOutputs.splice(activeIndex, 1);
    }

    async toggleOutput() {
        if (this.edit) {
            return;
        }
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

    dndModel() {
        return {
            type: 'moveItem',
            item: this.output
        };
    }

    // Aurelia
    attached() {
        this.dndService.addSource(this)
        console.log(this.output.id, this.output);
        
    }
    
    detached() {
        this.edit && this.dndService.removeSource(this);
    }

    deactivate() {
    }
}
