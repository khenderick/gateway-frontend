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
import {inject, Factory, computedFrom} from "aurelia-framework";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {PulseCounter} from "../../containers/pulsecounter";
import {Step} from "../basewizard";

@inject(Factory.of(Output), Factory.of(PulseCounter))
export class General extends Step {
    constructor(outputFactory, pulseCounterFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.outputFactory = outputFactory;
        this.pulseCounterFactory = pulseCounterFactory;
        this.title = this.i18n.tr('wizards.configureinput.general.title');
        this.data = data;

        this.modes = [
            'inactive',
            'linked',
            'lightsoff',
            'outputsoff',
            'pulse',
            'motionsensor',
            'groupaction',
            'advanced'
        ];
    }

    @computedFrom('data', 'data.input', 'data.input.name')
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.input.name.length > 8) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configureinput.general.nametoolong'));
            fields.add('name');
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed(finish) {
        if (finish) {
            return this.data.save();
        }
    }

    async prepare() {
        let promises = [];
        switch (this.data.mode) {
            case 'pulse':
                promises.push((async () => {
                    try {
                        let data = await this.api.getPulseCounterConfigurations();
                        Toolbox.crossfiller(data.config, this.data.pulseCounters, 'id', (id, entry) => {
                            let pulseCounter = this.pulseCounterFactory(id);
                            if (entry.input === this.data.input.id) {
                                this.data.pulseCounter = pulseCounter;
                                this.data.previousPulseCounter = this.pulseCounterFactory(id);
                                this.data.previousPulseCounter.fillData(entry);
                            }
                            return pulseCounter;
                        });
                    } catch (error) {
                        console.error(`Could not load Pulse Counter configurations: ${error.message}`);
                    }
                })());
                break;
        }
        return Promise.all(promises);
    }

    modeText(item) {
        return this.i18n.tr(`wizards.configureinput.general.${item}`);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
