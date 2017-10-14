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
            this.signaler.signal('reload-apps');
        }, 60000);

        this.initVariables();
        this.shared = Shared;
        this.storeLoading = false;
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
        this.installSuccess = true;
        this.installMessage = '';
        this.appFiles = [];
        this.installationHasUpdated = false;
    }

    get allApps() {
        let apps = [];
        for (let app of this.apps) {
            apps.push(app);
        }
        return apps;
    }

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
                this.selectApp(this.apps[0]);
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
            await this.activeApp.remove();
            this.requestedRemove = false;
            this.apps.remove(this.activeApp);
            this.activeApp = this.apps[0];
        }
    }

    abortRemove() {
        this.requestedRemove = false;
    }

    installApp() {
        this.installMessage = '';
        let _this = this;
        $('#install-app-token').val(this.api.token);
        $('#upload-frame').off('load.install-app').on('load.install-app', function () {
            let result = this.contentWindow.document.body.innerHTML;
            if (result.contains('App successfully installed')) {
                _this.installSuccess = true;
                _this.installMessage = _this.i18n.tr('pages.settings.apps.installok');
            } else {
                _this.installSuccess = false;
                _this.installMessage = _this.i18n.tr('pages.settings.apps.installfailed');
            }
        });
        let form = $('#upload-app');
        form.attr('action', `${this.api.endpoint}install_app`);
        form.submit();
    }

    installStoreApp() {

    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    async loadAppStore() {
        this.appStoreLoading = true;
        try {
            this.selectedStoreApp = undefined;
            let response = await this.api.http.fetch('https://raw.githubusercontent.com/openmotics/plugins/master/releases.json');
            let data = await response.json();
            for (let storeApp of data.apps) {
                let app = this.appFactory(storeApp.name);
                app.installed = false;
                app.version = storeApp.version;
                app.storeMetadata = storeApp;
                if (Array.from(this.apps, a => a.reference).indexOf(app.reference) === -1 &&
                    Array.from(this.storeApps, a => a.reference).indexOf(app.reference) === -1) {
                    this.storeApps.push(app);
                }
            }
            this.signaler.signal('reload-store');
        } catch (error) {
            this.storeApps = [];
        } finally {
            this.appStoreLoading = false;
        }
    }

    // Aurelia
    attached() {
        super.attached();
        this.loadAppStore().catch((error) => {})
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
