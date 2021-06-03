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
import {PLATFORM} from 'aurelia-pal';
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import moment from 'moment';
import {Base} from './resources/base';
import {Storage} from './components/storage';
import {Authentication} from './components/authentication';
import {App} from './containers/app';
import {Installation} from './containers/installation';
import {Toolbox} from './components/toolbox';
import {EventAggregator} from 'aurelia-event-aggregator';

@inject(Router, Authentication, Factory.of(App), Factory.of(Installation), EventAggregator)
export class Index extends Base {
    constructor(router, authenication, appFactory, installationFactory, eventAggregator, ...rest) {
        super(...rest);
        this.appFactory = appFactory;
        this.installationFactory = installationFactory;
        this.router = router;
        this.authentication = authenication;
        this.apps = [];
        this.locale = undefined;
        this.connectionSubscription = undefined;
        this.copyrightYear = moment().year();
        this.openInstallation = false;
        this.openGateways = false;
        this.openmoticGateways = [];
        this.checkAliveTime = 20000;
        this.eventAggregator = eventAggregator;
        this.installationsDropdownExapnder = e => {
            let path = [];
            // if Chrome or Firefox
            if ( typeof e.composedPath === 'function') {
                path = e.composedPath();
            } else { // if Edge, IE11 or Safari
                let target = e.target;
                while (target.parentNode && path.length < 2) {
                    path.push(target);
                    target = target.parentNode;
                }
            }

            if (path[0].className === "expander hand" && path[0].localName === "a") {
                this.openInstallation = !this.openInstallation;
                this.openGateways = false;
            } else if (path[0].localName === "span" && path[1].className === "expander hand") {
                this.openInstallation = !this.openInstallation;
                this.openGateways = false;
            } else if (path[0].localName === "i" && path[1].className === "expander hand") {
                this.openInstallation = !this.openInstallation;
                this.openGateways = false;
            } else if (path[0].className === "expander hand gateways" && path[0].localName === "a") {
                this.openGateways = !this.openGateways;
                this.openInstallation = false;
            } else if (path[0].localName === "span" && path[1].className === "expander hand gateways") {
                this.openGateways = !this.openGateways;
                this.openInstallation = false;
            } else if (path[0].localName === "i" && path[1].className === "expander hand gateways") {
                this.openGateways = !this.openGateways;
                this.openInstallation = false;
            } else {
                this.openGateways = false;
                this.openInstallation = false;
            }
        };

        this.shared.sourceNavigation = [];
        this.shared.setInstallation = async (i) => { await this.setInstallation(i); }
    }

    get gatewayMustUpdate() { return this.shared.installation && this.shared.installation.flags !== null && this.shared.installation.flags.hasOwnProperty('UPDATE_REQUIRED') }

    checkUpdateRequired() {
        this.saveSourceRoutes();
        if (this.gatewayMustUpdate) {
            this.router.navigation = this.router.navigation.filter(route =>
                route.settings.key === 'settings' ||
                route.settings.key === 'settings.updates' ||
                route.settings.key === 'cloud.profile' ||
                route.settings.key === 'cloud.oauth'
            );
        } else {
            if (this.router.navigation.length !== this.shared.sourceNavigation.length) {
                this.router.navigation = this.shared.sourceNavigation;
            }
        }
    }

    saveSourceRoutes() {
        if (!this.shared.sourceNavigation.length) {
            this.shared.sourceNavigation = this.router.navigation;
        }
    }

    async connectToInstallation(installation) {
        await installation.checkAlive(this.checkAliveTime);
        this.shared.setInstallation(installation);
        this.openInstallation = false;
    }

    async connectToGateway(gateway) {
        if (gateway.online) {
            this.shared.openMoticGateway = gateway;
            this.openGateways = false;
        }
    }

    @computedFrom('shared.installations.length')
    get mainInstallations() {
        return this.shared.installations.filter((i) => i.role !== 'SUPER');
    }

    @computedFrom('shared.openMoticGateways.length')
    get openMoticGateways() {
        return this.shared.openMoticGateways;
    }

    async setLocale(locale) {
        let oldLocale = this.i18n.getLocale();
        await this.i18n.setLocale(locale);
        this.ea.publish('i18n:locale:changed', { oldValue: oldLocale, newValue: locale });
        this.locale = locale;
        this.shared.locale = locale;
        moment.locale(locale);
        Storage.setItem('locale', locale);
        this.signaler.signal('aurelia-translation-signal');
    }

    async setInstallation(installation) {
        if (installation !== undefined) {
            this.shared.installation = installation;
            Storage.setItem('installation', installation.id);
            await this.loadFeatures();
            await this.loadGateways();
            await this.loadOMGateways();
            await this.configAccessChecker(this.router.navigation);
            await this.shared.installation.refresh();
            this.checkUpdateRequired();
            this.eventAggregator.publish('installationChanged');
        } else {
            this.shared.installation = undefined;
            Storage.removeItem('installation');
            this.shared.features = [];
        }
        this.ea.publish('om:installation:change', {installation: this.shared.installation});
    }

    async loadOMGateways() {
        try {
            const { data: gateways = [{}] } = await this.api.getOMGateways({});
            this.shared.openMoticGateways = [{...gateways[0]}, {...gateways[0]}];
            if (this.shared.openMoticGateways.length > 0) {
                this.shared.openMoticGateway = this.shared.openMoticGateways[0];
                this.shared.installation.isBrainPlatform = ['CORE', 'CORE_PLUS'].includes(this.shared.openMoticGateway.openmotics.platform);
            }
        } catch(error) {
            Logger.log(`Could not load gateways: ${error}`);
        }
    }

    async loadGateways() {
        try {
            const { data: gateways = [{}] } = await this.api.getGateways({});
            this.shared.gateways = gateways;
        } catch(error) {
            Logger.log(`Could not load gateways: ${error}`);
        }
    }

    async loadFeatures() {
        try {
            let gateway_features = [];
            if (this.shared.target === 'cloud') {
                gateway_features = this.shared.installation.gateway_features;
            } else {
                gateway_features = await this.api.getFeatures();
            }
            this.shared.features = gateway_features;
        } catch (error) {
            this.shared.features = [];
        }
        for (let route of this.router.navigation) {
            if (route.settings.needsFeature !== undefined) {
                route.config.show = this.shared.features.contains(route.settings.needsFeature);
            }
        }
        this.signaler.signal('navigate');
    }

    async configAccessChecker(routes) {
        if (this.shared.target === 'cloud') {
            for (let route of routes) {
                if (route.settings === undefined) {
                    continue;
                }
                if (route.config) {
                    route.config.show = true;
                }
                if (this.shared.installation && !this.shared.installation.alive) {
                    route.config.show = route.settings.needInstallationAccess !== undefined
                        ? this.shared.installation.hasAccess(route.settings.needInstallationAccess) && Boolean(route.config.showUnAlive)
                        : Boolean(route.config.showUnAlive);
                    continue;
                }
                if (route.settings.needInstallationAccess !== undefined && this.shared.installation !== undefined) {
                    const { installation, currentUser: { superuser } } = this.shared;
                    const show = installation.hasAccess(route.settings.needInstallationAccess)
                        || (superuser && !installation.hasAccess('control') && !installation.hasAccess('configure'));
                    if (route.show !== undefined) {
                        // when the routes method parameter is the raw routes array
                        route.show = show;
                    } else {
                        // when the routes method parameter is Aurelia's configured routes.
                        route.config.show = show;
                    }
                } else if (route.settings.group !== 'profile' && this.shared.installation === undefined) {
                    route.show = false;
                }
            }
        this.signaler.signal('navigate');
        }
    }

    async setNavigationGroup(group) {
        if (this.shared.target !== 'cloud') {
            return;
        }
        this.shared.navigationGroup = group;
        if (group === 'installation') {
            if (this.shared.installation !== undefined) {
                this.router.navigate('dashboard');
            } else {
                this.router.navigate('landing');
            }
        } else {
            this.router.navigate('cloud/profile');
        }
    }

    @computedFrom('shared.installation.alive')
    get logoRoute() {
        const { shared } = this;
        return this.router.generate(shared.installation && shared.installation.alive || this.shared.target !== 'cloud' ? 'dashboard' : 'cloud.landing');
    }

    @computedFrom('shared.installation', 'router.history.fragment')
    get showPreviousIcon() {
        const { shared } = this;
        return shared.navigationGroup === 'profile' && shared.installation !== undefined;
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
                await installation.checkAlive(this.checkAliveTime);
                if (!installation.alive) {
                    installation = undefined;
                }
            }
            await this.shared.setInstallation(installation);
        }

        let routes = [
            {
                route: '', redirect: ''
            },
            {
                route: 'dashboard', name: 'dashboard', moduleId: PLATFORM.moduleName('pages/dashboard/index', 'pages'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'dashboard', title: this.i18n.tr('pages.dashboard.title'), group: 'installation'}
            },
            {
                route: 'outputs', name: 'outputs', moduleId: PLATFORM.moduleName('pages/outputs/index', 'pages'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'outputs', title: this.i18n.tr('pages.outputs.title'), group: 'installation'}
            },
            ...Toolbox.iif(this.shared.target !== 'cloud', [
                {
                    route: 'thermostats', name: 'thermostats', moduleId: PLATFORM.moduleName('pages/gateway/thermostats', 'pages'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'thermostats', title: this.i18n.tr('pages.thermostats.title'), group: 'installation'}
                },
            ],[
                {
                    route: 'thermostats', name: 'thermostatscloud', moduleId: PLATFORM.moduleName('pages/cloud/thermostats/index', 'pages'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'thermostats', title: this.i18n.tr('pages.thermostats.title'), group: 'installation'}
                },
            ]),
            ...Toolbox.iif(this.shared.target !== 'cloud', [
                {
                    route: 'consumption/energy', name: 'consumption.energy', moduleId: PLATFORM.moduleName('pages/consumption/energy/index', 'pages.consumption'), show: true, nav: true, auth: true, land: true,
                    settings: {key: 'consumption.energy', title: this.i18n.tr('pages.consumption.energy.title'), group: 'installation', needInstallationAccess: ['control']}
                },
            ], [
                {
                    route: 'consumption', name: 'consumption', nav: true, redirect: 'consumption/energy/index', show: true,
                    settings: {key: 'consumption', group: 'installation', needInstallationAccess: ['control']}
                },
                {
                    route: 'consumption/energy', name: 'consumption.energy', moduleId: PLATFORM.moduleName('pages/consumption/energy/index', 'pages.consumption'), show: true, nav: true, auth: true, land: true,
                    settings: {key: 'consumption.energy', title: this.i18n.tr('pages.consumption.energy.title'), parent: 'consumption', group: 'installation', needInstallationAccess: ['control']}
                },
                {
                    route: 'consumption/history', name: 'consumption.history', moduleId: PLATFORM.moduleName('pages/consumption/history/index', 'pages.consumption'), nav: true, auth: true, land: true, show: this.shared.target !== 'cloud',
                    settings: {key: 'consumption.history', title: this.i18n.tr('pages.consumption.history.title'), parent: 'consumption', group: 'installation', needInstallationAccess: ['control']}
                },
            ]),
            {
                route: 'settings', name: 'settings', nav: true, redirect: '', show: this.shared.target !== 'cloud', showUnAlive: true,
                settings: {key: 'settings', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/installation', name: 'settings.installation', nav: true, redirect: 'settings/installation/suppliers', show: true, showUnAlive: true,
                settings: {key: 'settings.installation', title: this.i18n.tr('pages.settings.installation.title'), parent: 'settings', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway', name: 'settings.gateway', nav: true, redirect: 'settings/gateway/apps', show: true, showUnAlive: true,
                settings: {key: 'settings.gateway', title: this.i18n.tr('pages.settings.gateway.title'), parent: 'settings', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/installation/suppliers', name: 'settings.suppliers', moduleId: PLATFORM.moduleName('pages/settings/suppliers/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'settings.suppliers', title: this.i18n.tr('pages.settings.suppliers.title'), parent: 'settings.installation', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway/apps', name: 'settings.apps', moduleId: PLATFORM.moduleName('pages/settings/apps/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'settings.apps', title: this.i18n.tr('pages.settings.apps.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway/energy', name: 'settings.energy', moduleId: PLATFORM.moduleName('pages/settings/energy/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'settings.energy', title: this.i18n.tr('pages.settings.energy.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway/groupactions', name: 'settings.groupactions', moduleId: PLATFORM.moduleName('pages/settings/groupactions/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'settings.groupactions', title: this.i18n.tr('pages.settings.groupactoins.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'setup', name: 'setup', nav: true, redirect: '', show: true,
                settings: {key: 'setup', group: 'installation', needInstallationAccess: ['control']}
            },
            ...Toolbox.iif(this.shared.target !== 'cloud', [], [
                {
                    route: 'setup/environment', name: 'setup.environment', moduleId: PLATFORM.moduleName('pages/setup/environment/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.environment', title: this.i18n.tr('pages.setup.environment.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']}
                },
                {
                    route: 'setup/initialisation', name: 'setup.initialisation', moduleId: PLATFORM.moduleName('pages/setup/initialisation/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.initialisation', title: this.i18n.tr('pages.setup.initialisation.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']}
                },
                {
                    route: 'setup/floors', name: 'setup.floorsandrooms', moduleId: PLATFORM.moduleName('pages/setup/cloud/floors-rooms/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.floorsandrooms', title: this.i18n.tr('pages.setup.floorsandrooms.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']},
                },
                {
                    route: 'setup/outputs', name: 'setup.outputs', moduleId: PLATFORM.moduleName('pages/setup/outputs/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.outputs', title: this.i18n.tr('pages.setup.outputs.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']}
                },
                {
                    route: 'setup/inputs', name: 'setup.inputs', moduleId: PLATFORM.moduleName('pages/setup/inputs/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.inputs', title: this.i18n.tr('pages.setup.inputs.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']}
                },
                {
                    route: 'setup/sensors', name: 'setup.sensors', moduleId: PLATFORM.moduleName('pages/setup/sensors/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'setup.sensors', title: this.i18n.tr('pages.setup.sensors.title'), parent: 'setup', group: 'installation', needInstallationAccess: ['configure']}
                },
            ]),
            {
                route: 'setup/thermostats', name: 'setup.thermostats', moduleId: PLATFORM.moduleName('pages/setup/thermostats/index', 'pages.setup'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'setup.thermostats', title: this.i18n.tr('pages.setup.thermostats.title'), parent: 'setup', group: 'installation'}
            },
        ...Toolbox.iif(this.shared.target !== 'cloud', [
            {
                route: 'settings/gateway/cloud', name: 'settings.cloud', moduleId: PLATFORM.moduleName('pages/settings/cloud-configuration/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                settings: {key: 'settings.cloud', title: this.i18n.tr('pages.settings.cloud.title'), parent: 'settings.gateway', group: 'installation'}
            }
        ], [
            {
                route: 'landing', name: 'cloud.landing', moduleId: PLATFORM.moduleName('pages/cloud/landing', 'pages.cloud'), nav: false, auth: true, land: true, show: true,
                settings: {key: 'cloud.landing', title: this.i18n.tr('generic.landingpage.title'), group: 'landing'}
            },
            {
                route: 'settings/installation/users', name: 'settings.users', moduleId: PLATFORM.moduleName('pages/settings/cloud/users/index', 'pages.settings'), nav: true, auth: true, land: true, show: true, showUnAlive: true,
                settings: {key: 'settings.users', title: this.i18n.tr('pages.settings.users.title'), parent: 'settings.installation', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway/backups', name: 'settings.backups', moduleId: PLATFORM.moduleName('pages/settings/cloud/backups/index', 'pages.settings'), nav: true, auth: true, land: true, show: true, showUnAlive: true,
                settings: {key: 'settings.backups', title: this.i18n.tr('pages.settings.backups.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'cloud/nopermission', name: 'cloud.nopermission', moduleId: PLATFORM.moduleName('pages/cloud/nopermission', 'pages.cloud'), nav: false, auth: true, land: true, show: true,
                settings: {key: 'settings.backups', title: this.i18n.tr('pages.settings.backups.title'), group: 'installation'}
            },
            {
                route: 'settings/gateway/updates', name: 'settings.updates', moduleId: PLATFORM.moduleName('pages/settings/cloud/updates/index', 'pages.updates'), nav: true, auth: true, land: true, show: true, showUnAlive: true,
                settings: {key: 'settings.updates', title: this.i18n.tr('pages.settings.updates.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            },
            {
                route: 'settings/gateway/notifications', name: 'settings.eventrules', moduleId: PLATFORM.moduleName('pages/settings/cloud/eventrules/index', 'pages.settings'), nav: true, auth: true, land: true, show: true, showUnAlive: true,
                settings: {key: 'settings.eventrules', title: this.i18n.tr('pages.eventrules.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
            }
        ]),
            {
                route: 'settings/gateway/schedules', name: 'settings.schedules', moduleId: PLATFORM.moduleName('pages/settings/schedules/index', 'pages.settings'), nav: true, auth: true, land: true, show: false,
                settings: {key: 'settings.schedules', title: this.i18n.tr('pages.settings.schedules.title'), parent: 'settings.gateway', group: 'installation', needsFeature: 'scheduling', needInstallationAccess: ['configure']}
            },
            ...Toolbox.iif(this.shared.target !== 'cloud', [
                {
                    route: 'settings/gateway/maintenance', name: 'settings.maintenance', moduleId: PLATFORM.moduleName('pages/settings/maintenance/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'settings.maintenance', title: this.i18n.tr('pages.settings.maintenance.title'), parent: 'settings.gateway', group: 'installation', needsFeature: 'websocket_maintenance', needInstallationAccess: ['configure']}
                },
                {
                    route: 'apps/:reference', name: 'apps.index', moduleId: PLATFORM.moduleName('pages/apps/index', 'pages.apps'), nav: false, auth: true, land: true, show: true,
                    settings: {key: 'apps.index', title: '', group: 'installation'}
                }
            ], [
                {
                    route: 'settings/gateway/maintenance', name: 'settings.maintenance', moduleId: PLATFORM.moduleName('pages/settings/maintenance/index', 'pages.settings'), nav: true, auth: true, land: true, show: true,
                    settings: {key: 'settings.maintenance', title: this.i18n.tr('pages.settings.maintenance.title'), parent: 'settings.gateway', group: 'installation', needInstallationAccess: ['configure']}
                },
                {
                    route: 'cloud/installations', name: 'cloud.installations', moduleId: PLATFORM.moduleName('pages/cloud/installations', 'pages.cloud'), nav: true, auth: true, land: true, show: false,
                    settings: {key: 'cloud.installations', title: this.i18n.tr('pages.cloud.installations.title'), group: 'installation'}
                },
                {
                    route: 'cloud/profile', name: 'cloud.profile', moduleId: PLATFORM.moduleName('pages/cloud/profile', 'pages.cloud'), nav: true, auth: true, land: false, show: true, showUnAlive: true,
                    settings: {key: 'cloud.profile', title: this.i18n.tr('pages.cloud.profile.title'), group: 'profile'}
                },
                {
                    route: 'cloud/oauth', name: 'cloud.oauth', moduleId: PLATFORM.moduleName('pages/cloud/oauth', 'pages.cloud'), nav: true, auth: true, land: false, show: true, showUnAlive: true,
                    settings: {key: 'cloud.oauth', title: this.i18n.tr('pages.cloud.oauth.title'), group: 'profile'}
                }
            ]),
            {
                route: 'logout', name: 'logout', moduleId: PLATFORM.moduleName('pages/logout', 'main'), nav: true, auth: false, land: false, show: true, showUnAlive: true,
                settings: {key: 'logout', group: 'profile'}
            }
        ];
        await this.configAccessChecker(routes);
        let routesMap = routes.reduce((map, route) => {
            map[route.route] = route;
            return map;
        }, {});
        let defaultLanding = this.shared.target === 'cloud' && this.shared.installation === undefined ? 'landing' : Storage.getItem('last');
        if (defaultLanding === 'cloud/nopermission') {
            defaultLanding = 'dashboard';
        }
        if (routes.filter((route) => route.show === true && route.route === defaultLanding).length !== 1) {
            defaultLanding = 'dashboard';
        }
        let settingsLanding = Storage.getItem('last_settings');
        if (routes.filter((route) => route.show === true && route.route === settingsLanding).length !== 1) {
            settingsLanding = 'settings/installation/suppliers';
        }
        routesMap[''].redirect = defaultLanding;
        routesMap['setup'].redirect = this.shared.target === 'cloud' ? 'setup/environment' : 'setup/thermostats';
        routesMap['settings'].redirect = settingsLanding;
        let unknownRoutes = {redirect: defaultLanding};
        const ingoreUpdateRoutes = ['cloud.installations', 'cloud.profile', 'cloud.oauth'];

        await this.setLocale(Storage.getItem('locale', 'en'));
        await this.router.configure(async (config) => {
            config.title = 'OpenMotics';
            config.addAuthorizeStep({
                run: (navigationInstruction, next) => {
                    if (navigationInstruction.config.auth) {
                        if (!this.authentication.isLoggedIn) {
                            return next.cancel(this.authentication.logout());
                        }
                    }
                    if (navigationInstruction.config.settings.needInstallationAccess !== undefined) {
                        let hasAccess  = true;
                        if (this.shared.target === 'cloud') {
                            const { installation } = this.shared;
                            // redirect to cloud/nopermission when user with 'normal' role tries to view a config page.
                            hasAccess = installation === undefined ? false : installation.hasAccess(navigationInstruction.config.settings.needInstallationAccess);
                        }
                        if (!hasAccess) {
                            // enable setup/thermostats for normal user
                            if (this.shared.installation && this.shared.installation.hasAccess('control')) {
                                return next.cancel(this.router.navigate('setup/thermostats'));
                            }
                            return next.cancel(this.router.navigate('cloud/nopermission'));
                        }
                    }
                    return next();
                }
            });
            config.addPostRenderStep({
                run: (navigationInstruction, next) => {
                    if (this.gatewayMustUpdate && !ingoreUpdateRoutes.includes(this.router.currentInstruction.config.name)) {
                        this.router.navigate('settings/updates');
                    }
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
                    this.shared.navigationGroup = navigationInstruction.config.settings.group;
                    this.signaler.signal('navigate');
                    return next();
                }
            });
            config.map(routes);
            config.mapUnknownRoutes(unknownRoutes);

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
        await this.loadFeatures();
        this.checkUpdateRequired();
    }

    attached() {
        window.addEventListener('click', this.installationsDropdownExapnder);
        window.addEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.addEventListener('resize', () => { $('body').layout('fix'); });
        $('.dropdown-toggle').dropdown();
        this.locale = this.i18n.getLocale();
        this.shared.locale = this.locale;
        this.connectionSubscription = this.ea.subscribe('om:connection', data => {
            let connection = data.connection;
            if (!connection) {
                this.router.navigate('landing');
            }
        });
        this.api.connection = undefined;
        window.ROUTER = this.router.navigation
    }

    detached() {
        window.removeEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.removeEventListener('resize', () => { $('body').layout('fix'); });
        if (this.connectionSubscription !== undefined) {
            this.connectionSubscription.dispose();
        }
    }
}
