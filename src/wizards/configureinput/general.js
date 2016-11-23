/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {PulseCounter} from "../../containers/pulsecounter";
import {Step} from "../basewizard";

export class General extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureinput.general.title');
        this.api = Shared.get('api');
        this.data = data;

        this.modes = [
            'inactive',
            'linked',
            'lightsoff',
            'outputsoff',
            'pulse',
            'advanced'
        ];
    }

    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.input.name.length > 8) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureinput.general.nametoolong'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    proceed() {
        return new Promise((resolve) => {
            resolve();
        });
    }

    prepare() {
        let promises = [];
        promises.push(this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.data.outputs, 'id', (id, entry) => {
                    let output = new Output(id);
                    output.fillData(entry);
                    for (let i of [1, 2, 3, 4]) {
                        let ledId = output['led' + i].id;
                        if (ledId !== 255) {
                            this.data.ledMap.set(ledId, [output, 'led' + i]);
                        }
                    }
                    if (id === this.data.input.action) {
                        this.data.linkedOutput = output;
                        this.data.previousOutput = new Output(id);
                        this.data.previousOutput.fillData(entry);
                        return output;
                    }
                    if (!output.inUse) {
                        return undefined;
                    }
                    return output;
                });
                this.data.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations');
                }
            })
        );
        switch (this.data.mode) {
            case 'pulse':
                promises.push(this.api.getPulseCounterConfigurations()
                    .then((data) => {
                        Toolbox.crossfiller(data.config, this.data.pulseCounters, 'id', (id, entry) => {
                            let pulseCounter = new PulseCounter(id);
                            if (entry.input === this.data.input.id) {
                                this.data.pulseCounter = pulseCounter;
                                this.data.previousPulseCounter = new PulseCounter(id);
                                this.data.previousPulseCounter.fillData(entry);
                            }
                            return pulseCounter;
                        });
                    })
                    .catch((error) => {
                        if (!this.api.isDeduplicated(error)) {
                            console.error('Could not load Pulse Counter configurations');
                        }
                    }));
                break;
        }
        return Promise.all(promises);
    }

    modeText(item) {
        return this.i18n.tr('wizards.configureinput.general.' + item);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
