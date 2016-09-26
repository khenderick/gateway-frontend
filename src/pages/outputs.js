import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {Output} from "../containers/output";

export class Outputs extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                this.signaler.signal('reload-outputs');
            });
        }, 5000);

        this.outputs = [];
        this.outputsLoading = true;
    };

    @computedFrom('outputs')
    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light' && output.moduleType === 'O' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get dimmableLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light' && output.moduleType === 'D' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                lights.push(output);
            }
        }
        return lights;
    };

    @computedFrom('outputs')
    get relays() {
        let relays = [];
        for (let output of this.outputs) {
            if (output.type === 'output' && output.moduleType === 'O' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                relays.push(output);
            }
        }
        return relays;
    }

    @computedFrom('outputs')
    get dimmableRelays() {
        let relays = [];
        for (let output of this.outputs) {
            if (output.type === 'output' && output.moduleType === 'D' &&
                output.name !== '' && output.name !== 'NOT_IN_USE') {
                relays.push(output);
            }
        }
        return relays;
    }

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
                    return a.name > b.name ? 1 : -1;
                });
                this.outputsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Ouptut configurations and statusses');
                }
            });
    };

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
