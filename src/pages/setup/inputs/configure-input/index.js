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
import {bindable, inject, Factory, computedFrom} from 'aurelia-framework';
import {Data} from './data';
import {General} from './general';
import {Configure} from './configure';
import {Feedback} from './feedback';
import {BaseWizard} from 'wizards/basewizard';

@bindable({ name: 'input', changeHandler: 'inputChangeHandler' })
@bindable({ name: 'changeEditMode' })
@inject(Factory.of(General), Factory.of(Configure), Factory.of(Feedback))
export class ConfigureInput extends BaseWizard {
    constructor(generalFactory, configureFactory, feedbackFactory, ...rest) {
        const controller = { ok: () => {}}
        super(controller, ...rest);
        this.data = new Data();
        this.data.save = async () => { return this.save(...arguments) };
        this.steps = [
            generalFactory(this.data),
            configureFactory(this.data),
            feedbackFactory(this.data)
        ];
    }


    async setData() {
        this.data.input = this.input;
        this.data.mode = this.input.type;
        this.data.actions = this.input.basicActions;
        this.data.input._freeze = true;
        return this.loadStep(this.filteredSteps[0]);
    }

    inputChangeHandler() {
        this.setData();
    }

    @computedFrom('data', 'data.mode', 'data.input', 'data.input.isCan')
    get skippedSteps() {
        let skipped = [];
        if (!['linked', 'pulse', 'advanced', 'motionsensor', 'groupaction', 'shutter'].contains(this.data.mode)) {
            skipped.push(1);
        }
        if (!this.data.input.isCan) {
            skipped.push(2);
        }
        return skipped;
    }

    async save() {
        let input = this.data.input;
        input.basicActions = [];
        input.pulseCounter = undefined;
        input.room = this.data.room === undefined ? 255 : this.data.room.id;
        switch (this.data.mode) {
            case 'linked':
                input.action = this.data.linkedOutput.id;
                break;
            case 'lightsoff':
                input.action = 242;
                break;
            case 'outputsoff':
                input.action = 241;
                break;
            case  'pulse':
                input.action = 255;
                input.pulseCounter = this.data.pulseCounter;
                break;
            case 'advanced':
                input.action = 240;
                input.basicActions = this.data.actions.slice();
                break;
            case 'motionsensor':
                input.action = 240;
                input.basicActions = [195 + parseInt(this.data.timeout), this.data.linkedOutput.id];
                break;
            case 'groupaction':
                input.action = 240;
                input.basicActions = [2, this.data.linkedGroupAction.id];
                break;
            case 'shutter':
                let movementsMap = {up: 100, down: 101, stop: 102, upstopdownstop: 103, upstopupstop: 108, downstopdownstop: 109};
                input.action = 240;
                input.basicActions = [movementsMap[this.data.movement], this.data.linkedShutter.id];
                break;
            case 'inactive':
            default:
                input.action = 255;
                break;
        }
        await input.save();
        if (input.pulseCounter !== undefined) {
            this.api.setPulseCounterConfiguration(
                input.pulseCounter.id,
                input.id,
                input.pulseCounter.name,
                input.pulseCounter.room
            ).catch(() => {});
        }
        if (this.data.previousPulseCounter !== undefined && (input.pulseCounter === undefined || input.pulseCounter.id !== this.data.previousPulseCounter.id)) {
            this.api.setPulseCounterConfiguration(
                this.data.previousPulseCounter.id,
                255,
                this.data.previousPulseCounter.name,
                this.data.previousPulseCounter.room
            ).catch(() => {});
        }
        if (this.data.input.isCan) {
            for (let output of this.data.outputs) {
                for (let i of [1, 2, 3, 4]) {
                    let ledId = output[`led${i}`].id;
                    if (ledId === input.id) {
                        if (this.data.feedbackMode !== 'output') {
                            output[`led${i}`].load(255, 'UNKNOWN');
                            output.save();
                        } else if (output.id !== this.data.feedbackOutput.id) {
                            output[`led${i}`].load(255, 'UNKNOWN');
                            output.save();
                        }
                    }
                }
            }
            for (let ledConfig of this.data.ledGlobals) {
                for (let i of [1, 2, 3, 4]) {
                    let ledId = ledConfig[`led${i}`].id;
                    if (ledId === input.id) {
                        if (this.data.feedbackMode !== 'generic') {
                            ledConfig[`led${i}`].load(255, 'UNKNOWN');
                            ledConfig.save();
                        }
                    }
                    if (ledConfig[`led${i}`].dirty) {
                        ledConfig.save();
                    }
                }
            }
            if (this.data.feedbackMode === 'output') {
                this.data.feedbackOutput.save();
            }
        }
        this.changeEditMode();
    }

    attached() {
        super.attached();
        this.setData();
    }
}
