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
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {Shutter} from "../../containers/shutter";
import {Input} from "../../containers/input";
import {ConfigureOutputWizard} from "../../wizards/configureoutput/index";
import {ConfigureShutterWizard} from "../../wizards/configureshutter/index";

@inject(DialogService, Factory.of(Input), Factory.of(Output), Factory.of(Shutter))
export class Inputs extends Base {
    constructor(dialogService, inputFactory, outputFactory, shutterFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.inputFactory = inputFactory;
        this.outputFactory = outputFactory;
        this.shutterFactory = shutterFactory;
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
                this.signaler.signal('reload-outputs-shutters');
            });
            this.loadShutters().then(() => {
                this.signaler.signal('reload-shutters');
                this.signaler.signal('reload-outputs-shutters');
            });
            this.loadInputs();
        }, 5000);

        this.Output = Output;
        this.Shutter = Shutter;

        this.outputs = [];
        this.shutters = [];
        this.activeOutput = undefined;
        this.inputs = [];
        this.inputsMap = new Map();
        this.outputsLoading = true;
        this.shuttersLoading = true;
        this.inputsLoading = true;
        this.filters = ['light', 'dimmer', 'relay', 'virtual', 'shutter', 'unconfigured'];
        this.filter = ['light', 'dimmer', 'relay', 'virtual', 'shutter'];
    };

    get filteredOutputs() {
        let outputs = [];
        for (let output of this.outputs) {
            if ((this.filter.contains('light') && output.isLight) ||
                (this.filter.contains('dimmer') && output.isDimmer) ||
                (this.filter.contains('relay') && !output.isLight) ||
                (this.filter.contains('virtual') && output.isVirtual) ||
                (this.filter.contains('unconfigured') && !output.inUse)) {
                outputs.push(output);
            }
        }
        if (this.activeOutput instanceof Output && !outputs.contains(this.activeOutput)) {
            this.activeOutput = undefined;
        }
        return outputs;
    }

    get filteredShutters() {
        let shutters = [];
        for (let shutter of this.shutters) {
            if ((this.filter.contains('shutter') ||
                (this.filter.contains('unconfigured') && !shutter.inUse))) {
                shutters.push(shutter);
            }
        }
        if (this.activeOutput instanceof Shutter && !shutters.contains(this.activeOutput)) {
            this.activeOutput = undefined;
        }
        return shutters;
    }

    filterText(filter) {
        return this.i18n.tr('pages.settings.outputs.filter.' + filter);
    }

    filterUpdated() {
        this.signaler.signal('reload-outputs');
        this.signaler.signal('reload-shutters');
        this.signaler.signal('reload-outputs-shutters');
    }

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return this.outputFactory(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return this.outputFactory(id);
                });
                this.outputs.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.outputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations and statusses');
                }
            });
    };

    loadShutters() {
        return Promise.all([this.api.getShutterConfigurations(), this.api.getShutterStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.shutters, 'id', (id) => {
                    return this.shutterFactory(id);
                });
                for (let shutter of this.shutters) {
                    shutter.status = data[1].status[shutter.id];
                }
                this.shutters.sort((a, b) => {
                    return a.id > b.id ? 1 : -1;
                });
                this.shuttersLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Shutter configurations and statusses');
                }
            });
    }

    loadInputs() {
        return this.api.getInputConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.inputs, 'id', (id) => {
                    let input = this.inputFactory(id);
                    this.inputsMap.set(id, input);
                    return input;
                });
                this.inputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Input configurations');
                }
            });
    }

    selectOutput(type, id) {
        let foundOutput = undefined;
        if (type === 'output') {
            for (let output of this.outputs) {
                if (output.id === id) {
                    foundOutput = output;
                }
            }
        } else if (type === 'shutter') {
            for (let shutter of this.shutters) {
                if (shutter.id === id) {
                    foundOutput = shutter;
                }
            }
        }
        this.activeOutput = foundOutput;
    }

    edit() {
        if (this.activeOutput === undefined) {
            return;
        }
        if (this.activeOutput instanceof Output) {
            this.dialogService.open({viewModel: ConfigureOutputWizard, model: {output: this.activeOutput}}).then((response) => {
                if (response.wasCancelled) {
                    this.activeOutput.cancel();
                    console.info('The ConfigureOutputWizard was cancelled');
                }
            });
        } else {
            this.dialogService.open({viewModel: ConfigureShutterWizard, model: {shutter: this.activeOutput}}).then((response) => {
                if (response.wasCancelled) {
                    this.activeOutput.cancel();
                    console.info('The ConfigureShutterWizard was cancelled');
                }
            });
        }
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
