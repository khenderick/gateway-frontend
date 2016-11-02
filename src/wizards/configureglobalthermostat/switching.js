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
import {Step} from "../basewizard";
import Shared from "../../components/shared";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";

export class Switching extends Step {
    constructor(data) {
        super();
        this.title = this.i18n.tr('wizards.configureglobalthermostat.switching.title');
        this.api = Shared.get('api');
        this.data = data;
        this.outputs = [];
        this.outputMap = new Map();
        this.onoff = [255, 0];
    }

    get heatingOutput0() {
        return this.outputMap.get(this.data.thermostat.switchToHeatingOutput0);
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
        return this.outputMap.get(this.data.thermostat.switchToHeatingOutput1);
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
        return this.outputMap.get(this.data.thermostat.switchToHeatingOutput2);
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
        return this.outputMap.get(this.data.thermostat.switchToHeatingOutput3);
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
        return this.outputMap.get(this.data.thermostat.switchToCoolingOutput0);
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
        return this.outputMap.get(this.data.thermostat.switchToCoolingOutput1);
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
        return this.outputMap.get(this.data.thermostat.switchToCoolingOutput2);
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
        return this.outputMap.get(this.data.thermostat.switchToCoolingOutput3);
    }

    set coolingOutput3(output) {
        if (output === undefined) {
            this.data.thermostat.switchToCoolingOutput3 = 255;
            this.data.thermostat.controlledSwitchToCoolingValue3 = 100;
        } else {
            this.data.thermostat.switchToCoolingOutput3 = output.id;
        }
    }

    onOffText(item) {
        if (item === 0) {
            return this.i18n.tr('generic.off');
        }
        return this.i18n.tr('generic.on');
    }

    outputText(item) {
        if (item === undefined) {
            return this.i18n.tr('generic.disabled');
        }
        return item.identifier;
    }

    proceed() {
        return new Promise((resolve) => {
            let thermostat = this.data.thermostat;
            thermostat.outsideSensor = this.data.sensor.id;
            thermostat.pumpDelay = parseInt(this.data.delay.minutes) * 60 + parseInt(this.data.delay.seconds);
            thermostat.save();
            resolve();
        });
    }

    prepare() {
        return this.api.getOutputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id, outputData) => {
                    let output = new Output(id);
                    output.fillData(outputData);
                    this.outputMap.set(id, output);
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
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations');
                }
            });
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
