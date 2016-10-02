import {computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Output} from "../../containers/output";
import {ConfigureOutputWizard} from "../../wizards/configureoutput/index";

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
        }, 5000);

        this.outputs = [];
        this.activeOutput = undefined;
        this.outputsLoading = true;
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

    selectOutput(outputId) {
        let foundOutput = undefined;
        for (let output of this.outputs) {
            if (output.id === outputId) {
                foundOutput = output;
            }
        }
        this.activeOutput = foundOutput;
    }

    edit() {
        if (this.activeOutput === undefined) {
            return;
        }
        this.dialogService.open({viewModel: ConfigureOutputWizard, model: {output: this.activeOutput}}).then((response) => {
            if (response.wasCancelled) {
                this.activeOutput.cancel();
                console.info('The ConfigureOutputWizard was cancelled');
            }
        });
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
