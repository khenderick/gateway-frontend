import "fetch";
import $ from "jquery";
import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {PluginFactory} from "../containers/plugin";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, PluginFactory)
export class Plugins extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, pluginFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadPlugins().then(() => {
                signaler.signal('reload-plugins');
            }).catch(() => {
            });
        }, 60000);
        this.pluginFactory = pluginFactory;

        this.plugins = [];
        this.pluginsLoading = true;
        this.activePlugin = undefined;
        this.requestedRemove = false;
    };

    loadPlugins() {
        return this.api.getPlugins()
            .then((data) => {
                Toolbox.crossfiller(data.plugins, this.plugins, 'name', (name) => {
                    let plugin = this.pluginFactory.makePlugin(name);
                    plugin.initializeConfig();
                    return plugin;
                });
                this.plugins.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                if (this.activePlugin === undefined && this.plugins.length > 0) {
                    this.selectPlugin(this.plugins[0]);
                }
                this.pluginsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Plugins');
            });
    };

    selectPlugin(plugin) {
        if (this.activePlugin !== undefined) {
            this.activePlugin.stopLogWatcher();
        }
        this.activePlugin = plugin;
        this.activePlugin.startLogWatcher();
    }

    requestRemove() {
        this.requestedRemove = true;
    }

    confirmRemove() {
        if (this.requestedRemove === true) {
            this.activePlugin.remove()
                .then(() => {
                    this.requestedRemove = false;
                    this.plugins.remove(this.activePlugin);
                    this.activePlugin = this.plugins[0];
                });
        }
    }

    abortRemove() {
        this.requestedRemove = false;
    }

    installPlugin() {
        $('#install-plugin-token').val(this.api.token);
        $('#upload-frame').off('load.install-plugin').on('load.install-plugin', function () {
            let result = this.contentWindow.document.body.innerHTML;
        });
        let form = $('#upload-plugin');
        form.attr('action', this.api.endpoint + 'install_plugin');
        form.submit();
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.activePlugin !== undefined) {
            this.activePlugin.startLogWatcher();
        }
    };

    deactivate() {
        this.refresher.stop();
        if (this.activePlugin !== undefined) {
            this.activePlugin.stopLogWatcher();
        }
    }
}
