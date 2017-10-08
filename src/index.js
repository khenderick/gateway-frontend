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
import {Plugin} from "./containers/plugin";
import Shared from "./components/shared";
import {Toolbox} from "./components/toolbox";

@inject(Router, Authentication, Factory.of(Plugin))
export class Index extends Base {
    constructor(router, authenication, pluginFactory, ...rest) {
        super(...rest);
        this.pluginFactory = pluginFactory;
        this.router = router;
        this.authentication = authenication;
        this.plugins = [];
        this.shared = Shared;
        this.locale = undefined;
        this.installations = [];
        this.currentInstallation = undefined;
    };

    async setLocale(locale) {
        let oldLocale = this.i18n.getLocale();
        await this.i18n.setLocale(locale);
        this.ea.publish('i18n:locale:changed', { oldValue: oldLocale, newValue: locale });
        this.signaler.signal('aurelia-translation-signal');
        this.locale = locale;
        Storage.setItem('locale', locale);
    }

    setInstallation(installation) {
        this.currentInstallation = installation;
        this.api.installationId = this.currentInstallation.id;
        Storage.setItem('installation', this.currentInstallation.id);
        this.signaler.signal('installation-change');
    }

    // Aurelia
    async activate() {
        if (this.shared.target === 'cloud') {
            this.installations = await this.api.getInstallations();
            let lastInstallationId = Storage.getItem('installation', this.installations[0].id);
            this.setInstallation(this.installations.filter((i) => i.id === lastInstallationId)[0]);
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
                    return next();
                }
            });
            config.map([
                {
                    route: '', redirect: Storage.getItem('last') || 'dashboard'
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
                ...Toolbox.iif(Shared.target !== 'cloud', [
                    {
                        route: 'settings/cloud', name: 'settings.cloud', moduleId: PLATFORM.moduleName('pages/settings/cloud', 'pages.settings'), nav: true, auth: true, land: true,
                        settings: {key: 'settings.cloud', title: this.i18n.tr('pages.settings.cloud.title'), parent: 'settings'}
                    }
                ]),
                {
                    route: 'settings/plugins', name: 'settings.plugins', moduleId: PLATFORM.moduleName('pages/settings/plugins', 'pages.settings'), nav: true, auth: true, land: true,
                    settings: {key: 'settings.plugins', title: this.i18n.tr('pages.settings.plugins.title'), parent: 'settings'}
                },
                ...Toolbox.iif(Shared.target !== 'cloud', [
                    {
                        route: 'plugins/:reference', name: 'plugins.index', moduleId: PLATFORM.moduleName('pages/plugins/index', 'pages.plugins'), nav: false, auth: true, land: true,
                        settings: {key: 'plugins.index', title: ''}
                    }
                ]),
                {
                    route: 'logout', name: 'logout', moduleId: PLATFORM.moduleName('pages/logout', 'main'), nav: false, auth: false, land: false,
                    settings: {}
                }
            ]);
            config.mapUnknownRoutes({redirect: ''});

            if (Shared.target !== 'cloud') {
                let data = await this.api.getPlugins();
                for (let pluginData of data.plugins) {
                    let plugin = this.pluginFactory(pluginData.name);
                    plugin.fillData(pluginData);
                    if (plugin.hasWebUI && this.plugins.find((entry) => entry.reference === plugin.reference) === undefined) {
                        this.plugins.push({
                            name: plugin.name,
                            reference: plugin.reference
                        });
                    }
                }
            }
        });
    }

    attached() {
        if ($.AdminLTE !== undefined && $.AdminLTE.layout !== undefined) {
            window.addEventListener('aurelia-composed', $.AdminLTE.layout.fix);
            window.addEventListener('resize', $.AdminLTE.layout.fix);
        }
        $('.dropdown-toggle').dropdown();
        this.locale = this.i18n.getLocale();
    };

    detached() {
        if ($.AdminLTE !== undefined && $.AdminLTE.layout !== undefined) {
            window.removeEventListener('aurelia-composed', $.AdminLTE.layout.fix);
            window.removeEventListener('resize', $.AdminLTE.layout.fix);
        }
    };
}
