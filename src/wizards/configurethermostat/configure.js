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
import {Step} from "../basewizard";
import {Toolbox} from "../../components/toolbox";
import {Logger} from "../../components/logger";
import {Sensor} from "../../containers/sensor";
import {Output} from "../../containers/output";
import {Room} from "../../containers/room";
import {PumpGroup} from "../../containers/pumpgroup";

@inject(Factory.of(Output), Factory.of(Sensor), Factory.of(PumpGroup), Factory.of(Room))
export class Configure extends Step {
    constructor(outputFactory, sensorFactory, pumpGroupFactory, roomFactory, ...rest /*, data */) {
        let data = rest.pop();
        super(...rest);
        this.outputFactory = outputFactory;
        this.sensorFactory = sensorFactory;
        this.pumpGroupFactory = pumpGroupFactory;
        this.roomFactory = roomFactory;
        this.title = this.i18n.tr('wizards.configurethermostat.configure.title');
        this.data = data;
        this.sensors = [];
        this.outputs = [];
        this.otherThermostatValves = [];
        this.outputsMap = {};
        this.pumpGroups = [];
        this.pump0 = undefined;
        this.pump1 = undefined;
        this.previousOutput0Id = undefined; // Used dynamically
        this.previousOutput1Id = undefined; // Used dynamically
        this.pump0Errors = {};
        this.pump1Errors = {};
        this.pumpGroupSupport = false;
        this.rooms = [];

        this.timeSensor = this.sensorFactory(240);
    }

    sensorName(item) {
        if (item === undefined) {
            return this.i18n.tr('wizards.configurethermostat.configure.nosensor');
        }
        if (item.id === 240) {
            return this.i18n.tr('wizards.configurethermostat.configure.timebased');
        }
        return `${item.identifier} (${item.temperature} ${this.i18n.tr('generic.sensors.temperature.unit')})`;
    }

    outputName(output) {
        if (output === undefined) {
            return this.i18n.tr('wizards.configurethermostat.configure.nooutput');
        }
        return output.identifier;
    }

    pumpName(output) {
        if (output === undefined) {
            return this.i18n.tr('wizards.configurethermostat.configure.nopump');
        }
        return output.identifier;
    }

    roomText(room) {
        if (room === undefined) {
            return this.i18n.tr('generic.noroom');
        }
        return room.identifier;
    }

    @computedFrom('data.thermostat', 'data.sensor', 'data.output0')
    get canBeUsed() {
        return this.data.thermostat !== undefined && this.data.sensor !== undefined && this.data.output0 !== undefined;
    }

    @computedFrom(
        'data.thermostat', 'data.thermostat.name', 'data.output0', 'data.output1', 'otherThermostatValves',
        'pump0Errors', 'pump0Errors.missingPump', 'pump0Errors.valvePumpCollision',
        'pump1Errors', 'pump1Errors.missingPump', 'pump1Errors.valvePumpCollision'
    )
    get canProceed() {
        let valid = true, reasons = [], fields = new Set();
        if (this.data.thermostat !== undefined && this.data.thermostat.name.length > 16) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.nametoolong'));
            fields.add('name');
        }
        if (this.data.output0 !== undefined && this.data.output0 === this.data.output1) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.sameoutput'));
        }
        if (this.data.output0 !== undefined && this.otherThermostatValves.contains(this.data.output0.id)) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.usedbyother0'));
        }
        if ((this.data.output1 !== undefined && this.otherThermostatValves.contains(this.data.output1.id))) {
            valid = false;
            reasons.push(this.i18n.tr('wizards.configurethermostat.configure.usedbyother1'));
        }
        if (this.pumpGroupSupport) {
            if (this.pump0Errors.missingPump) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configurethermostat.configure.pump0invalid'));
            }
            if (this.pump0Errors.valvePumpCollision) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configurethermostat.configure.pump0novalve'));
            }
            if (this.pump1Errors.missingPump) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configurethermostat.configure.pump1invalid'));
            }
            if (this.pump1Errors.valvePumpCollision) {
                valid = false;
                reasons.push(this.i18n.tr('wizards.configurethermostat.configure.pump1novalve'));
            }
        }
        return {valid: valid, reasons: reasons, fields: fields};
    }

    async proceed() {
        let thermostat = this.data.thermostat;
        thermostat.room = this.data.room === undefined ? 255 : this.data.room.id;
        thermostat.sensorId = this.data.sensor !== undefined ? this.data.sensor.id : 255;
        thermostat.output0Id = this.data.output0 !== undefined ? this.data.output0.id : 255;
        thermostat.output1Id = this.data.output1 !== undefined ? this.data.output1.id : 255;
        let promises = [thermostat.save()];
        if (this.pumpGroupSupport) {
            for (let pumpGroup of this.pumpGroups) {
                if (pumpGroup.dirty) {
                    promises.push(pumpGroup.save());
                }
            }
        }
        return await Promise.all(promises);
    }

    pumpOrValveUpdated(rang, type, event) {
        if (!this.pumpGroupSupport) {
            return;
        }
        let currentPumpId = this[`pump${rang}`] === undefined ? undefined : this[`pump${rang}`].id;
        if (type === 'pump') {
            currentPumpId = event.detail.value === undefined ? undefined : event.detail.value.id;
        }
        let currentOutputId = this.data[`output${rang}`] === undefined ? undefined : this.data[`output${rang}`].id;
        if (type === 'output') {
            currentOutputId = event.detail.value === undefined ? undefined : event.detail.value.id;
        }
        let currentOtherOutputId = this.data[`output${1 - rang}`] === undefined ? undefined : this.data[`output${1 - rang}`].id;
        if (currentOutputId === currentOtherOutputId || this.otherThermostatValves.contains(currentOutputId)) {
            return;
        }
        let removePreviousOutput = this[`previousOutput${rang}Id`] !== undefined && this[`previousOutput${rang}Id`] !== currentOutputId && this[`previousOutput${rang}Id`] !== currentOtherOutputId;
        let previousOutputId = removePreviousOutput ? this[`previousOutput${rang}Id`] : undefined;

        this[`pump${rang}Errors`] = this.configurePumpGroup(previousOutputId, currentOutputId, currentPumpId);
        this[`previousOutput${rang}Id`] = currentOutputId;
    }

    configurePumpGroup(previousOutputId, outputId, pumpId) {
        let outputAdded = pumpId === undefined || outputId === undefined;
        let pumps = new Set();
        let valves = [];
        for (let pumpGroup of this.pumpGroups) {
            if (pumpGroup.outputs.contains(previousOutputId)) {
                pumpGroup.outputs.remove(previousOutputId);
                if (pumpGroup.outputs.length === 0) {
                    pumpGroup.output = 255; // Disable the PumpGroup
                }
                pumpGroup.dirty = true;
            }
            if (pumpId !== undefined && pumpGroup.output === pumpId) {
                if (!pumpGroup.outputs.contains(outputId)) {
                    if (pumpGroup.outputs.length < 32) {
                        pumpGroup.outputs.push(outputId);
                        pumpGroup.dirty = true;
                        outputAdded = true;
                    }
                } else {
                    outputAdded = true;
                }
            } else {
                if (pumpGroup.outputs.contains(outputId)) {
                    pumpGroup.outputs.remove(outputId);
                    if (pumpGroup.outputs.length === 0) {
                        pumpGroup.output = 255; // Disable the PumpGroup
                    }
                    pumpGroup.dirty = true;
                }
            }
            pumps.add(pumpGroup.output);
            valves.push(...pumpGroup.outputs);
        }
        for (let pumpGroup of this.pumpGroups) {
            if (!outputAdded && pumpGroup.output === 255) {
                pumpGroup.output = pumpId;
                pumpGroup.outputs.push(outputId);
                pumpGroup.dirty = true;
                outputAdded = true;
                pumps.add(pumpId);
                valves.push(outputId);
            }
        }
        let duplicates = valves.filter(v => pumps.has(v));
        return {
            missingPump: !outputAdded,
            valvePumpCollision: duplicates.contains(pumpId) || duplicates.contains(outputId)
        };
    }

    async prepare() {
        let promises = [];
        promises.push((async () => {
            try {
                let roomData = await this.api.getRooms();
                Toolbox.crossfiller(roomData.data, this.rooms, 'id', (id) => {
                    let room = this.roomFactory(id);
                    if (this.data.thermostat.room === id) {
                        this.data.room = room;
                    }
                    return room;
                });
                this.rooms.sort((a, b) => {
                    return a.identifier.toString().localeCompare(b.identifier.toString(), 'en', {sensitivity: 'base', numeric: true});
                });
                this.rooms.unshift(undefined);
            } catch (error) {
                Logger.error(`Could not load Room configurations: ${error.message}`);
            }
        })());
        promises.push((async () => {
            try {
                let [thermostatConfiguration, coolingConfiguration, ] = await Promise.all([
                    this.api.getThermostatConfigurations(), this.api.getCoolingConfigurations()
                ]);
                let otherHeatingThermostats = thermostatConfiguration.config.filter(c => c.id !== this.data.thermostat.id);
                let otherCoolingThermostats = coolingConfiguration.config.filter(c => c.id !== this.data.thermostat.id);
                this.otherThermostatValves = [
                    ...otherHeatingThermostats.map(c => c.output0),
                    ...otherHeatingThermostats.map(c => c.output1),
                    ...otherCoolingThermostats.map(c => c.output0),
                    ...otherCoolingThermostats.map(c => c.output1)
                ].filter(i => i !== 255);
            } catch (error) {
                Logger.error(`Could not load Thermostats: ${error.message}`);
            }
        })());
        promises.push((async () => {
            try {
                let [configuration, temperature] = await Promise.all([this.api.getSensorConfigurations(undefined), this.api.getSensorTemperatureStatus()]);
                Toolbox.crossfiller(configuration.config, this.sensors, 'id', (id, sensorData) => {
                    let sensor = this.sensorFactory(id);
                    sensor.fillData(sensorData);
                    sensor.temperature = temperature.status[id];
                    if (this.data.thermostat.sensorId === id) {
                        this.data.sensor = sensor;
                        return sensor;
                    }
                    if (sensor.inUse && sensor.temperature !== undefined) {
                        return sensor;
                    }
                    return undefined;
                });
                if (this.data.thermostat.sensorId === 240) {
                    this.data.sensor = this.timeSensor;
                }
                this.sensors.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (!this.sensors.contains(this.timeSensor)) {
                    this.sensors.push(this.timeSensor);
                }
                if (!this.sensors.contains(undefined)) {
                    this.sensors.push(undefined);
                }
            } catch (error) {
                Logger.error(`Could not load Sensor configurations and statusses: ${error.message}`);
            }
        })());
        promises.push((async () => {
            try {
                let data = await this.api.getOutputConfigurations();
                Toolbox.crossfiller(data.config, this.outputs, 'id', (id, entry) => {
                    let output = this.outputFactory(id);
                    output.fillData(entry);
                    if (id === this.data.thermostat.output0Id) {
                        this.data.output0 = output;
                        this.previousOutput0Id = output.id;
                        return output;
                    }
                    if (id === this.data.thermostat.output1Id) {
                        this.data.output1 = output;
                        this.previousOutput1Id = output.id;
                        return output;
                    }
                    if (!output.inUse || output.isLight) {
                        return undefined;
                    }
                    this.outputsMap[output.id] = output;
                    return output;
                });
                this.outputs.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (!this.outputs.contains(undefined)) {
                    this.outputs.push(undefined);
                }
            } catch (error) {
                Logger.error(`Could not load Ouptut configurations: ${error.message}`);
            }
        })());
        promises.push((async () => {
            try {
                let data = undefined;
                if (this.data.thermostat.type === 'heating') {
                    data = await this.api.getPumpGroupConfigurations();
                } else {
                    data = await this.api.getCoolingPumpGroupConfigurations();
                }
                Toolbox.crossfiller(data.config, this.pumpGroups, 'id', (id, entry) => {
                    let pumpGroup = this.pumpGroupFactory(id, this.data.thermostat.type);
                    pumpGroup.fillData(entry);
                    if (pumpGroup.inUse) {
                        this.pumpGroupSupport = true;
                    }
                    return pumpGroup;
                });
            } catch (error) {
                Logger.error(`Could not load Pump Group configurations: ${error.message}`);
            }
        })());
        await Promise.all(promises);
        for (let pumpGroup of this.pumpGroups) {
            if (this.data.output0 !== undefined && pumpGroup.outputs.contains(this.data.output0.id)) {
                this.pump0 = this.outputsMap[pumpGroup.output];
            }
            if (this.data.output1 !== undefined && pumpGroup.outputs.contains(this.data.output1.id)) {
                this.pump1 = this.outputsMap[pumpGroup.output];
            }
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
