/*
 * Copyright (C) 2016 OpenMotics BV
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
import $ from 'jquery';
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {App} from 'containers/app';

@inject(Factory.of(App))
export class Apps extends Base {
    constructor(appFactory, ...rest) {
        super(...rest);
        if (this.shared.installation && !this.shared.installation.alive) {
            this.router.navigate('settings/users');
        }
        this.appFactory = appFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
            await this.loadAppStore();
            await this.loadApps();
            this.signaler.signal('reload-apps');
        }, 60000);

        this.initVariables();
        this.toolbox = Toolbox;
        this.connectionSubscription = undefined;
    }

    initVariables() {
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
        this.apps = [];
        this.storeApps = [];
        this.appsLoading = true;
        this.activeApp = undefined;
        this.working = false;
        this.processSuccess = true;
        this.processMessage = '';
        this.processMessageDetail = '';
        this.appFiles = [];
        this.filters = ['installed', 'available'];
        this.filter = ['installed', 'available'];
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
        this.checksum = '';
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

    @computedFrom('shared.features')
    get canStartStop() {
        return (this.shared.installation?.gateway_features || []).contains('isolated_plugins');
    }

    filterText(filter) {
        return this.i18n.tr(`pages.settings.apps.filter.${filter}`);
    }

    filterUpdated() {
        this.signaler.signal('reload-apps');
    }

    compareVersions(a, b) {
        const segmentsA = a.split('.');
        const segmentsB = b.split('.');
        if (!segmentsA.length) {
            return Number(a) > (segmentsB.length ? Number(segmentsB[0]) : Number(b));
        }
        if (!segmentsB.length) {
            return Number(b) < (segmentsA.length ? Number(segmentsA[0]) : Number(a));
        }
        return segmentsA.reduce((prev, value, i) => {
            return Number(value) > Number(segmentsB[i])
        }, false);
    }

    async loadApps() {
        try {
            this.apps = [];
            let data = await this.api.getApps();
            let numberOfPlugins = this.apps.length;
            data.plugins = data.plugins.filter(({ name }) => !!name);
            Toolbox.crossfiller(data.plugins, this.apps, 'name', name => {
                return this.appFactory(name);
            });
            this.apps.forEach(app => {
                const storeApp = this.storeApps.find(sApp => sApp.name === app.name);
                app.canUpdate = Boolean(storeApp && this.compareVersions(storeApp.version, app.version));
            });
            if (this.apps.length !== numberOfPlugins) {
                this.clearMessages();
            }
            this.apps.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            if (this.activeApp === undefined && this.apps.length > 0) {
                await this.selectApp(this.apps[0]);
            }
            this.appsLoading = false;
        } catch (error) {
            this.appsLoading = false;
            Logger.error(`Could not load Apps: ${error.message}`);
        }
    }

    async selectApp(app) {
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
        this.activeApp = app;
        this.clearMessages();
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

    async removeApp() {
        this.clearMessages();
        this.working = true;
        try {
            await this.activeApp.remove();
            this.processSuccess = true;
            this.processMessage = this.i18n.tr('pages.settings.apps.removeok');
            this.activeApp = undefined;
        } catch (error) {
            this.processSuccess = false;
            this.processMessage = this.i18n.tr('pages.settings.apps.removefailed');
        } finally {
            this.working = false;
        }
    }

    installApp() {
        this.clearMessages();
        this.working = true;
        let _this = this;
        $('#install-app-token').val(this.api.token);
        $('#upload-frame').off('load.install-app').on('load.install-app', function () {
            let result = this.contentWindow.document.body.innerText;
            if (result.contains('successfully installed')) {
                _this.processSuccess = true;
                _this.processMessage = _this.i18n.tr('pages.settings.apps.installok');
            } else {
                try {
                    let parsedMessage = JSON.parse(result);
                    _this.processMessageDetail = Toolbox.titleCase(parsedMessage.msg);
                } catch (error) {
                    Logger.error(`An error has occurred: ${error}`)
                }
                _this.processSuccess = false;
                _this.processMessage = _this.i18n.tr('pages.settings.apps.installfailed');
            }
            _this.working = false;
            _this.checksum = ''
        });
        let form = $('#upload-app');
        form.attr('action', `${this.api.endpoint}install_plugin`);
        form.submit();
    }

    async installStoreApp() {
        if (this.shared.target !== 'cloud' || this.activeApp === undefined || this.activeApp.installed && !this.activeApp.canUpdate) {
            return;
        }
        this.clearMessages();
        this.working = true;
        try {
            await this.activeApp.installFromStore();
            this.processSuccess = true;
            this.processMessage = this.i18n.tr('pages.settings.apps.installok');
            this.selectApp(this.activeApp);
        } catch (error) {
            this.processSuccess = false;
            this.processMessage = this.i18n.tr('pages.settings.apps.installfailed');
        } finally {
            this.working = false;
        }
    }

    clearMessages() {
        this.processMessage = '';
        this.processMessageDetail = '';
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
    }

    async loadAppStore() {
        if (this.shared.target !== 'cloud') {
            return [];
        }
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
        this.loadAppStore().catch(() => {});
        this.connectionSubscription = this.ea.subscribe('om:connection', data => {
            if (data.connection) {
                this.refresher.run();
                this.selectApp(this.activeApp);
            }
        });
    }

    detached() {
        if (this.connectionSubscription !== undefined) {
            this.connectionSubscription.dispose();
        }
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.activeApp !== undefined) {
            this.activeApp.startLogWatcher();
        }
    }

    deactivate() {
        this.refresher.stop();
        if (this.activeApp !== undefined) {
            this.activeApp.stopLogWatcher();
        }
    }
}
