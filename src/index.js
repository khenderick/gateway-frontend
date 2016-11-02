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
import {Base} from "./resources/base";
import Shared from "./components/shared";
import {Storage} from "./components/storage";

export class Index extends Base {
    constructor() {
        super();
        this.router = Shared.get('router');
        this.api = Shared.get('api');
        this.version = __VERSION__;
    };

    // Aurelia
    activate() {
        this.router.configure((config) => {
            config.title = 'OpenMotics';
            config.addAuthorizeStep({
                run: (navigationInstruction, next) => {
                    if (navigationInstruction.config.auth) {
                        let authentication = Shared.get('authentication');
                        if (!authentication.isLoggedIn) {
                            return next.cancel(authentication.logout());
                        }
                    }
                    return next();
                }
            });
            config.addPostRenderStep({
                run: (navigationInstruction, next) => {
                    if (navigationInstruction.config.land) {
                        Storage.setItem('last', navigationInstruction.config.route);
                        let parent = navigationInstruction.config.settings.parent;
                        if (parent !== undefined) {
                            Storage.setItem('last_' + parent, navigationInstruction.config.route);
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
                    route: 'dashboard', name: 'dashboard', moduleId: 'pages/dashboard', nav: true, auth: true, land: true,
                    settings: {key: 'dashboard', title: this.i18n.tr('pages.dashboard.title')}
                },
                {
                    route: 'outputs', name: 'outputs', moduleId: 'pages/outputs', nav: true, auth: true, land: true,
                    settings: {key: 'outputs', title: this.i18n.tr('pages.outputs.title')}
                },
                {
                    route: 'thermostats', name: 'thermostats', moduleId: 'pages/thermostats', nav: true, auth: true, land: true,
                    settings: {key: 'thermostats', title: this.i18n.tr('pages.thermostats.title')}
                },
                {
                    route: 'energy', name: 'energy', moduleId: 'pages/energy', nav: true, auth: true, land: true,
                    settings: {key: 'energy', title: this.i18n.tr('pages.energy.title')}
                },
                {
                    route: 'settings', name: 'settings', nav: true, redirect: Storage.getItem('last_settings') || 'settings/environment',
                    settings: {key: 'settings'}
                },
                {
                    route: 'settings/environment', name: 'settings.environment', moduleId: 'pages/settings/environment', nav: true, auth: true, land: true,
                    settings: {key: 'settings.environment', title: this.i18n.tr('pages.settings.environment.title'), parent: 'settings'}
                },
                {
                    route: 'settings/plugins', name: 'settings.plugins', moduleId: 'pages/settings/plugins', nav: true, auth: true, land: true,
                    settings: {key: 'settings.plugins', title: this.i18n.tr('pages.settings.plugins.title'), parent: 'settings'}
                },
                {
                    route: 'settings/groupactions', name: 'settings.groupactions', moduleId: 'pages/settings/groupactions', nav: true, auth: true, land: true,
                    settings: {key: 'settings.groupactions', title: this.i18n.tr('pages.settings.groupactoins.title'), parent: 'settings'}
                },
                {
                    route: 'settings/inputs', name: 'settings.inputs', moduleId: 'pages/settings/inputs', nav: true, auth: true, land: true,
                    settings: {key: 'settings.inputs', title: this.i18n.tr('pages.settings.inputs.title'), parent: 'settings'}
                },
                {
                    route: 'settings/outputs', name: 'settings.outputs', moduleId: 'pages/settings/outputs', nav: true, auth: true, land: true,
                    settings: {key: 'settings.outputs', title: this.i18n.tr('pages.settings.outputs.title'), parent: 'settings'}
                },
                {
                    route: 'settings/sensors', name: 'settings.sensors', moduleId: 'pages/settings/sensors', nav: true, auth: true, land: true,
                    settings: {key: 'settings.sensors', title: this.i18n.tr('pages.settings.sensors.title'), parent: 'settings'}
                },
                {
                    route: 'settings/thermostats', name: 'settings.thermostats', moduleId: 'pages/settings/thermostats', nav: true, auth: true, land: true,
                    settings: {key: 'settings.thermostats', title: this.i18n.tr('pages.settings.thermostats.title'), parent: 'settings'}
                },
                {
                    route: 'logout', name: 'logout', moduleId: 'pages/logout', nav: false, auth: false, land: false,
                    settings: {}
                }
            ]);
            config.mapUnknownRoutes({redirect: ''});
        });
    }

    attached() {
        if ($.AdminLTE !== undefined && $.AdminLTE.layout !== undefined) {
            window.addEventListener('aurelia-composed', $.AdminLTE.layout.fix);
            window.addEventListener('resize', $.AdminLTE.layout.fix);
        }
    };

    detached() {
        if ($.AdminLTE !== undefined && $.AdminLTE.layout !== undefined) {
            window.removeEventListener('aurelia-composed', $.AdminLTE.layout.fix);
            window.removeEventListener('resize', $.AdminLTE.layout.fix);
        }
    };
}
