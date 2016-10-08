import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {Shutter} from "../../containers/shutter";
import {ConfigureOutputWizard} from "../../wizards/configureoutput/index";
import {ConfigureShutterWizard} from "../../wizards/configureshutter/index";

export class Inputs extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.dialogService = Shared.get('dialogService');
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
            this.loadShutters().then(() => {
                this.signaler.signal('reload-shutters');
            });
        }, 5000);

        this.Output = Output;
        this.Shutter = Shutter;

        this.outputs = [];
        this.shutters = [];
        this.activeOutput = undefined;
        this.outputsLoading = true;
        this.shuttersLoading = true;
    };

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return new Output(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return new Output(id);
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
                    return new Shutter(id);
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
