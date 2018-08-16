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
import {AdminLTE} from "admin-lte";
import {PLATFORM} from 'aurelia-pal';
import {inject, Factory} from "aurelia-framework";
import {Router} from "aurelia-router";
import {Base} from "./resources/base";
import {Storage} from "./components/storage";
import {Authentication} from "./components/authentication";
import {App} from "./containers/app";
import {Installation} from "./containers/installation";
import {Toolbox} from "./components/toolbox";

@inject(Router, Authentication, Factory.of(App), Factory.of(Installation))
export class Index extends Base {
    constructor(router, authenication, appFactory, installationFactory, ...rest) {
        super(...rest);
        this.appFactory = appFactory;
        this.installationFactory = installationFactory;
        this.router = router;
        this.authentication = authenication;
        this.apps = [];
        this.locale = undefined;
        this.connectionSubscription = undefined;

        this.shared.setInstallation = async (i) => { await this.setInstallation(i); }
    };

    async setLocale(locale) {
        let oldLocale = this.i18n.getLocale();
        await this.i18n.setLocale(locale);
        this.ea.publish('i18n:locale:changed', { oldValue: oldLocale, newValue: locale });
        this.signaler.signal('aurelia-translation-signal');
        this.locale = locale;
        this.shared.locale = locale;
        Storage.setItem('locale', locale);
    }

    async setInstallation(installation) {
        if (installation !== undefined) {
            this.shared.installation = installation;
            Storage.setItem('installation', installation.id);
            await this.loadFeatures();
        } else {
            this.shared.installation = undefined;
            Storage.removeItem('installation');
            this.shared.features = [];
        }
        this.ea.publish('om:installation:change', {installation: this.shared.installation});
    }

    async loadFeatures() {
        try {
            this.shared.features = await this.api.getFeatures();
        } catch (error) {
            this.shared.features = [];
        }
    }

    // Aurelia
    async activate() {
        if (this.shared.target === 'cloud') {
            let installations = await this.api.getInstallations();
            Toolbox.crossfiller(installations, this.shared.installations, 'id', (id) => {
                return this.installationFactory(id);
            });
            let installationId = Storage.getItem('installation');
            if (installationId === undefined && this.shared.installations.length > 0) {
                installationId = this.shared.installations[0].id;
            }
            let installation = this.shared.installations.filter((i) => i.id === installationId)[0];
            if (installation !== undefined) {
                await installation.checkAlive(2000);
                if (!installation.alive) {
                    installation = undefined;
                }
            }
            await this.shared.setInstallation(installation);
        } else {
            await this.loadFeatures();
        }
        let landing = Storage.getItem('last') || 'dashboard';
        if (this.shared.target === 'cloud' && this.shared.installation === undefined) {
            landing = 'cloud/installations';
        }
        return this.router.configure(async (config) => {
            config.title = 'OpenMotics';
            config.addAuthorizeStep({
                run: (navigationInstruction, next) => {
                    if (navigationInstruction.config.auth) {
                        if (!this.authentication.isLoggedIn) {
                            return next.cancel(this.authentication.logout());
                        }
                    }
                    return next();
                }
            });
            config.addPostRenderStep({
                run: (navigationInstruction, next) => {
                    if (navigationInstruction.config.land) {
                        let path = navigationInstruction.fragment;
                        if (path.startsWith('/')) {
                            path = path.slice(1);
                        }
                        Storage.setItem('last', path);
                        let parent = navigationInstruction.config.settings.parent;
                        if (parent !== undefined) {
                            Storage.setItem(`last_${parent}`, path);
                        }
                    }
                    this.signaler.signal('navigate');
                    return next();
                }
            });
            config.map([
                {
                    route: '', redirect: landing
                },
                {
                    route: 'dashboard', name: 'dashboard', moduleId: PLATFORM.moduleName('pages/dashboard', 'pages'), nav: true, auth: true, land: true,
                    settings: {key: 'dashboard', title: this.i18n.tr('pages.dashboard.title')}
                },
                {
                    route: 'outputs', name: 'outputs', moduleId: PLATFORM.moduleName('pages/outputs', 'pages'), nav: true, auth: true, land: true,
                    settings: {key: 'outputs', title: this.i18n.tr('pages.outputs.title')}
                },
                {
                    route: 'thermostats', name: 'thermostats', moduleId: PLATFORM.moduleName('pages/thermostats', 'pages'), nav: true, auth: true, land: true,
                    settings: {key: 'thermostats', title: this.i18n.tr('pages.thermostats.title')}
                },
                {
                    route: 'energy', name: 'energy', moduleId: PLATFORM.moduleName('pages/energy', 'pages'), nav: true, auth: true, land: true,
                    settings: {key: 'energy', title: this.i18n.tr('pages.energy.title')}
                },
                ...Toolbox.iif(this.shared.target === 'cloud', [
                    {
                        route: 'cloud/installations', name: 'cloud.installations', moduleId: PLATFORM.moduleName('pages/cloud/installations', 'pages.cloud'), nav: false, auth: true, land: true,
                        settings: {key: 'cloud.installations', title: this.i18n.tr('pages.cloud.installations.title')}
                    }
                ]),
                {
                    route: 'settings', name: 'settings', nav: true, redirect: Storage.getItem('last_settings') || 'settings/initialisation',
                    settings: {key: 'settings'}
                },
                {
                    route: 'settings/initialisation', name: 'settings.initialisation', moduleId: PLATFORM.moduleName('pages/settings/initialisation', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.initialisation', title: this.i18n.tr('pages.settings.initialisation.title'), parent: 'settings'}
                },
                {
                    route: 'settings/outputs', name: 'settings.outputs', moduleId: PLATFORM.moduleName('pages/settings/outputs', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.outputs', title: this.i18n.tr('pages.settings.outputs.title'), parent: 'settings'}
                },
                {
                    route: 'settings/inputs', name: 'settings.inputs', moduleId: PLATFORM.moduleName('pages/settings/inputs', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.inputs', title: this.i18n.tr('pages.settings.inputs.title'), parent: 'settings'}
                },
                {
                    route: 'settings/sensors', name: 'settings.sensors', moduleId: PLATFORM.moduleName('pages/settings/sensors', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.sensors', title: this.i18n.tr('pages.settings.sensors.title'), parent: 'settings'}
                },
                {
                    route: 'settings/thermostats', name: 'settings.thermostats', moduleId: PLATFORM.moduleName('pages/settings/thermostats', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.thermostats', title: this.i18n.tr('pages.settings.thermostats.title'), parent: 'settings'}
                },
                {
                    route: 'settings/groupactions', name: 'settings.groupactions', moduleId: PLATFORM.moduleName('pages/settings/groupactions', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.groupactions', title: this.i18n.tr('pages.settings.groupactoins.title'), parent: 'settings'}
                },
                {
                    route: 'settings/environment', name: 'settings.environment', moduleId: PLATFORM.moduleName('pages/settings/environment', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.environment', title: this.i18n.tr('pages.settings.environment.title'), parent: 'settings'}
                },
                ...Toolbox.iif(this.shared.target !== 'cloud', [
                    {
                        route: 'settings/cloud', name: 'settings.cloud', moduleId: PLATFORM.moduleName('pages/settings/cloud', 'pages.settings'), nav: true, auth: true, land: true,
                        settings: {key: 'settings.cloud', title: this.i18n.tr('pages.settings.cloud.title'), parent: 'settings'}
                    }
                ]),
                ...Toolbox.iif(Shared.features.contains('scheduling'), [
                    {
                        route: 'settings/schedules', name: 'settings.schedules', moduleId: PLATFORM.moduleName('pages/settings/schedules', 'pages.settings'), nav: true, auth: true, land: true,
                        settings: {key: 'settings.schedules', title: this.i18n.tr('pages.settings.schedules.title'), parent: 'settings'}
                    }
                ]),
                {
                    route: 'settings/apps', name: 'settings.apps', moduleId: PLATFORM.moduleName('pages/settings/apps', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.apps', title: this.i18n.tr('pages.settings.apps.title'), parent: 'settings'}
                },
                ...Toolbox.iif(this.shared.target !== 'cloud', [
                    {
                        route: 'apps/:reference', name: 'apps.index', moduleId: PLATFORM.moduleName('pages/apps/index', 'pages.apps'), nav: false, auth: true, land: true,
                        settings: {key: 'apps.index', title: ''}
                    }
                ]),
                {
                    route: 'logout', name: 'logout', moduleId: PLATFORM.moduleName('pages/logout', 'main'), nav: false, auth: false, land: false,
                    settings: {}
                }
            ]);
            config.mapUnknownRoutes({redirect: ''});

            if (this.shared.target !== 'cloud') {
                let data = await this.api.getApps();
                for (let appData of data.plugins) {
                    let app = this.appFactory(appData.name);
                    app.fillData(appData);
                    if (app.hasWebUI && this.apps.find((entry) => entry.reference === app.reference) === undefined) {
                        this.apps.push({
                            name: app.name,
                            reference: app.reference
                        });
                    }
                }
            }
        });
    }

    attached() {
        window.addEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.addEventListener('resize', () => { $('body').layout('fix'); });
        $('.dropdown-toggle').dropdown();
        this.locale = this.i18n.getLocale();
        this.shared.locale = this.locale;
        this.connectionSubscription = this.ea.subscribe('om:connection', data => {
            let connection = data.connection;
            if (!connection) {
                this.router.navigate('cloud/installations');
            }
        });
        this.api.connection = undefined;
    };

    detached() {
        window.removeEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.removeEventListener('resize', () => { $('body').layout('fix'); });
        if (this.connectionSubscription !== undefined) {
            this.connectionSubscription.dispose();
        }
    };
}
