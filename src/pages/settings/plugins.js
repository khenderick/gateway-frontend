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
import $ from "jquery";
import {inject, Factory} from "aurelia-framework";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {Plugin} from "../../containers/plugin";
import Shared from "../../components/shared";

@inject(Factory.of(Plugin))
export class Plugins extends Base {
    constructor(pluginFactory, ...rest) {
        super(...rest);
        this.pluginFactory = pluginFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadPlugins();
            this.signaler.signal('reload-plugins');
        }, 60000);

        this.initVariables();
        this.shared = Shared;
    };

    initVariables() {
        if (this.activePlugin !== undefined) {
            this.activePlugin.stopLogWatcher();
        }
        this.plugins = [];
        this.pluginsLoading = true;
        this.activePlugin = undefined;
        this.requestedRemove = false;
        this.installSuccess = true;
        this.installMessage = '';
        this.pluginFiles = [];
        this.installationHasUpdated = false;
    }

    get allPlugins() {
        let plugins = [];
        for (let plugin of this.plugins) {
            plugins.push(plugin);
        }
        return plugins;
    }

    get pluginFile() {
        if (this.pluginFiles && this.pluginFiles.length > 0) {
            let file = this.pluginFiles.item(0);
            return `${file.name} (${Toolbox.formatBytes(file.size, this.i18n)})`;
        }
        return '';
    }

    set pluginFile(value) {
        // Read only, but needed to allow binding
    }

    async loadPlugins() {
        try {
            let data = await this.api.getPlugins();
            Toolbox.crossfiller(data.plugins, this.plugins, 'name', name => {
                return this.pluginFactory(name);
            });
            this.plugins.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            if (this.activePlugin === undefined && this.plugins.length > 0) {
                this.selectPlugin(this.plugins[0]);
            }
            this.pluginsLoading = false;
        } catch (error) {
            console.error(`Could not load Plugins: ${error.message}`);
        }
    };

    async selectPlugin(plugin) {
        if (this.activePlugin !== undefined) {
            this.activePlugin.stopLogWatcher();
        }
        this.activePlugin = plugin;
        this.activePlugin.startLogWatcher();
        await this.activePlugin.initializeConfig();
        this.activePlugin.loadConfig();
    }

    requestRemove() {
        this.requestedRemove = true;
    }

    async confirmRemove() {
        if (this.requestedRemove === true) {
            await this.activePlugin.remove();
            this.requestedRemove = false;
            this.plugins.remove(this.activePlugin);
            this.activePlugin = this.plugins[0];
        }
    }

    abortRemove() {
        this.requestedRemove = false;
    }

    installPlugin() {
        this.installMessage = '';
        let _this = this;
        $('#install-plugin-token').val(this.api.token);
        $('#upload-frame').off('load.install-plugin').on('load.install-plugin', function () {
            let result = this.contentWindow.document.body.innerHTML;
            if (result.contains('Plugin successfully installed')) {
                _this.installSuccess = true;
                _this.installMessage = _this.i18n.tr('pages.settings.plugins.installok');
            } else {
                _this.installSuccess = false;
                _this.installMessage = _this.i18n.tr('pages.settings.plugins.installfailed');
            }
        });
        let form = $('#upload-plugin');
        form.attr('action', `${this.api.endpoint}install_plugin`);
        form.submit();
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
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
