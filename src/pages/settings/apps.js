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
import {inject, Factory, computedFrom} from "aurelia-framework";
import {Base} from "../../resources/base";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {App} from "../../containers/app";
import Shared from "../../components/shared";

@inject(Factory.of(App))
export class Apps extends Base {
    constructor(appFactory, ...rest) {
        super(...rest);
        this.appFactory = appFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadApps();
            await this.loadAppStore();
            this.signaler.signal('reload-apps');
        }, 30000);

        this.initVariables();
        this.shared = Shared;
        this.toolbox = Toolbox;
        this.connectionSubscription = undefined;
    };

    initVariables() {
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
        this.apps = [];
        this.storeApps = [];
        this.appsLoading = true;
        this.activeApp = undefined;
        this.requestedRemove = false;
        this.working = false;
        this.processSuccess = true;
        this.processMessage = '';
        this.appFiles = [];
        this.filters = ['installed', 'available'];
        this.filter = ['installed', 'available'];
        this.installationHasUpdated = false;
    }

    @computedFrom('appFiles')
    get appFile() {
        if (this.appFiles && this.appFiles.length > 0) {
            let file = this.appFiles.item(0);
            return `${file.name} (${Toolbox.formatBytes(file.size, this.i18n)})`;
        }
        return '';
    }

    set appFile(value) {
        // Read only, but needed to allow binding
    }

    @computedFrom('filter', 'apps', 'storeApps')
    get filteredApps() {
        let apps = [];
        if (this.filter.contains('installed')) {
            apps = [...apps, ...this.apps];
        }
        if (this.filter.contains('available')) {
            let installed = this.apps.map(app => app.name);
            apps = [...apps, ...this.storeApps.filter(app => !installed.contains(app.name))];
        }
        apps.sort((appA, appB) => appA.name > appB.name ? 1 : -1);
        return apps;
    }

    filterText(filter) {
        return this.i18n.tr(`pages.settings.apps.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-apps');
    }

    async loadApps() {
        try {
            let data = await this.api.getApps();
            Toolbox.crossfiller(data.plugins, this.apps, 'name', name => {
                return this.appFactory(name);
            });
            this.apps.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            if (this.activeApp === undefined && this.apps.length > 0) {
                await this.selectApp(this.apps[0]);
            }
            this.appsLoading = false;
        } catch (error) {
            console.error(`Could not load Apps: ${error.message}`);
        }
    };

    async selectApp(app) {
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
        this.activeApp = app;
        this.processMessage = '';
        if (this.activeApp.installed) {
            $('#app-logs').boxWidget('expand');
            $('#app-configuration').boxWidget('expand');
            this.activeApp.startLogWatcher();
            await this.activeApp.initializeConfig();
            this.activeApp.loadConfig();
        } else {
            $('#app-logs').boxWidget('collapse');
            $('#app-configuration').boxWidget('collapse');
        }
    }

    requestRemove() {
        this.requestedRemove = true;
    }

    async confirmRemove() {
        if (this.requestedRemove === true) {
            this.processMessage = '';
            this.working = true;
            try {
                await this.activeApp.remove();
                this.processSuccess = true;
                this.processMessage = this.i18n.tr('pages.settings.apps.removeok');
                this.refresher.setInterval(3000);
            } catch (error) {
                this.processSuccess = false;
                this.processMessage = this.i18n.tr('pages.settings.apps.removefailed');
            } finally {
                this.working = false;
                this.requestedRemove = false;
            }
        }
    }

    abortRemove() {
        this.requestedRemove = false;
    }

    installApp() {
        this.processMessage = '';
        this.working = true;
        let _this = this;
        $('#install-app-token').val(this.api.token);
        $('#upload-frame').off('load.install-app').on('load.install-app', function () {
            let result = this.contentWindow.document.body.innerHTML;
            if (result.contains('App successfully installed')) {
                _this.processSuccess = true;
                _this.processMessage = _this.i18n.tr('pages.settings.apps.installok');
                _this.refresher.setInterval(3000);
                _this.working = false;
            } else {
                _this.processSuccess = false;
                _this.processMessage = _this.i18n.tr('pages.settings.apps.installfailed');
                _this.working = false;
            }
        });
        let form = $('#upload-app');
        form.attr('action', `${this.api.endpoint}install_plugin`);
        form.submit();
    }

    async installStoreApp() {
        if (this.activeApp === undefined || this.activeApp.installed || this.shared.target !== 'cloud') {
            return;
        }
        this.processMessage = '';
        this.working = true;
        try {
            await this.activeApp.installFromStore();
            this.refresher.setInterval(3000);
            this.processSuccess = true;
            this.processMessage = this.i18n.tr('pages.settings.apps.installok');
        } catch (error) {
            this.processSuccess = false;
            this.processMessage = this.i18n.tr('pages.settings.apps.installfailed');
        } finally {
            this.working = false;
        }
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    async loadAppStore() {
        try {
            let data = await this.api.getStoreApps();
            Toolbox.crossfiller(data.apps, this.storeApps, 'name', (name, itemData) => {
                let app = this.appFactory(name);
                app.installed = false;
                app.storeMetadata = itemData;
                return app;
            });
        } catch (error) {
            this.storeApps = [];
        }
    }

    // Aurelia
    attached() {
        super.attached();
        this.loadAppStore().catch((error) => {});
        this.connectionSubscription = this.ea.subscribe('om:connection', data => {
            if (data.connection) {
                this.refresher.run();
                this.refresher.setInterval(30000);
                this.selectApp(this.activeApp);
            }
        });
    };

    detached() {
        if (this.connectionSubscription !== undefined) {
            this.connectionSubscription.dispose();
        }
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.activeApp !== undefined) {
            this.activeApp.startLogWatcher();
        }
    };

    deactivate() {
        this.refresher.stop();
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
    }
}
