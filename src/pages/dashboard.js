import "fetch";
import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {OutputFactory} from "../containers/output";
import {PluginFactory} from "../containers/plugin";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, OutputFactory, PluginFactory)
export class Dashboard extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, outputFactory, pluginFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadOutputs().then(() => {
                signaler.signal('reload-outputs');
            }).catch(() => {
            });
            this.loadPlugins().then(() => {
                signaler.signal('reload-plugins');
            }).catch(() => {
            });
        }, 5000);
        this.outputFactory = outputFactory;
        this.pluginFactory = pluginFactory;

        this.outputs = [];
        this.outputsLoading = true;
        this.plugins = [];
        this.pluginsLoading = true;
    };

    get lights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light') {
                lights.push(output);
            }
        }
        return lights;
    };

    get activeLights() {
        let lights = [];
        for (let output of this.outputs) {
            if (output.type === 'light' && output.status === true) {
                lights.push(output);
            }
        }
        return lights;
    }

    loadOutputs() {
        return Promise.all([this.api.getOutputConfigurations(), this.api.getOutputStatus()])
            .then((data) => {
                Toolbox.crossfiller(data[0].config, this.outputs, 'id', (id) => {
                    return this.outputFactory.makeOutput(id);
                });
                Toolbox.crossfiller(data[1].status, this.outputs, 'id', (id) => {
                    return this.outputFactory.makeOutput(id);
                });
                this.outputsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Ouput configurations and states');
            });
    };

    loadPlugins() {
        return this.api.getPlugins()
            .then((data) => {
                Toolbox.crossfiller(data.plugins, this.plugins, 'name', (name) => {
                    return this.pluginFactory.makePlugin(name)
                });
                this.pluginsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Plugins');
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
