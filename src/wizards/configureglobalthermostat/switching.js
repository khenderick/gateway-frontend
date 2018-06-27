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
import {inject, Factory} from "aurelia-framework";
import {Step} from "../basewizard";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";

@inject(Factory.of(Output))
export class Switching extends Step {
    constructor(outputFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.outputFactory = outputFactory;
        this.title = this.i18n.tr('wizards.configureglobalthermostat.switching.title');
        this.data = data;
        this.outputs = [];
        this.outputMap = {};
        this.onoff = [100, 0];
    }

    get heatingOutput0() {
        return this.outputMap[this.data.thermostat.switchToHeatingOutput0];
    }

    set heatingOutput0(output) {
        if (output === undefined) {
            this.data.thermostat.switchToHeatingOutput0 = 255;
            this.data.thermostat.controlledSwitchToHeatingValue0 = 100;
        } else {
            this.data.thermostat.switchToHeatingOutput0 = output.id;
        }
    }

    get heatingOutput1() {
        return this.outputMap[this.data.thermostat.switchToHeatingOutput1];
    }

    set heatingOutput1(output) {
        if (output === undefined) {
            this.data.thermostat.switchToHeatingOutput1 = 255;
            this.data.thermostat.controlledSwitchToHeatingValue1 = 100;
        } else {
            this.data.thermostat.switchToHeatingOutput1 = output.id;
        }
    }

    get heatingOutput2() {
        return this.outputMap[this.data.thermostat.switchToHeatingOutput2];
    }

    set heatingOutput2(output) {
        if (output === undefined) {
            this.data.thermostat.switchToHeatingOutput2 = 255;
            this.data.thermostat.controlledSwitchToHeatingValue2 = 100;
        } else {
            this.data.thermostat.switchToHeatingOutput2 = output.id;
        }
    }

    get heatingOutput3() {
        return this.outputMap[this.data.thermostat.switchToHeatingOutput3];
    }

    set heatingOutput3(output) {
        if (output === undefined) {
            this.data.thermostat.switchToHeatingOutput3 = 255;
            this.data.thermostat.controlledSwitchToHeatingValue3 = 100;
        } else {
            this.data.thermostat.switchToHeatingOutput3 = output.id;
        }
    }

    get coolingOutput0() {
        return this.outputMap[this.data.thermostat.switchToCoolingOutput0];
    }

    set coolingOutput0(output) {
        if (output === undefined) {
            this.data.thermostat.switchToCoolingOutput0 = 255;
            this.data.thermostat.controlledSwitchToCoolingValue0 = 100;
        } else {
            this.data.thermostat.switchToCoolingOutput0 = output.id;
        }
    }

    get coolingOutput1() {
        return this.outputMap[this.data.thermostat.switchToCoolingOutput1];
    }

    set coolingOutput1(output) {
        if (output === undefined) {
            this.data.thermostat.switchToCoolingOutput1 = 255;
            this.data.thermostat.controlledSwitchToCoolingValue1 = 100;
        } else {
            this.data.thermostat.switchToCoolingOutput1 = output.id;
        }
    }

    get coolingOutput2() {
        return this.outputMap[this.data.thermostat.switchToCoolingOutput2];
    }

    set coolingOutput2(output) {
        if (output === undefined) {
            this.data.thermostat.switchToCoolingOutput2 = 255;
            this.data.thermostat.controlledSwitchToCoolingValue2 = 100;
        } else {
            this.data.thermostat.switchToCoolingOutput2 = output.id;
        }
    }

    get coolingOutput3() {
        return this.outputMap[this.data.thermostat.switchToCoolingOutput3];
    }

    set coolingOutput3(output) {
        if (output === undefined) {
            this.data.thermostat.switchToCoolingOutput3 = 255;
            this.data.thermostat.controlledSwitchToCoolingValue3 = 100;
        } else {
            this.data.thermostat.switchToCoolingOutput3 = output.id;
        }
    }

    onOffText(item, _this) {
        if (item === 0) {
            return _this.i18n.tr('generic.off');
        }
        return _this.i18n.tr('generic.on');
    }

    outputText(item, _this) {
        if (item === undefined) {
            return _this.i18n.tr('generic.disabled');
        }
        return item.identifier;
    }

    async proceed() {
        let thermostat = this.data.thermostat;
        if (this.data.sensor !== undefined) {
            thermostat.outsideSensor = this.data.sensor.id;
        } else {
            thermostat.outsideSensor = 255;
        }
        thermostat.pumpDelay = parseInt(this.data.delay.minutes) * 60 + parseInt(this.data.delay.seconds);
        return thermostat.save();
    }

    async prepare() {
        try {
            let data = await this.api.getOutputConfigurations();
            Toolbox.crossfiller(data.config, this.outputs, 'id', (id, outputData) => {
                let output = this.outputFactory(id);
                output.fillData(outputData);
                this.outputMap[id] = output;
                if (output.inUse) {
                    return output;
                }
                return undefined;
            });
            this.outputs.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            if (!this.outputs.contains(undefined)) {
                this.outputs.push(undefined);
            }
        } catch (error) {
            console.error(`Could not load Ouptut configurations: ${error.message}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
