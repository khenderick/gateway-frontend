import {AdminLTE} from "admin-lte";
import {Base} from "./resources/base";
import Shared from "./components/shared";
import {Storage} from "./components/storage";

export class Index extends Base {
    constructor() {
        super();
        this.router = Shared.get('router');
        this.api = Shared.get('api');
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
                         Storage.setItem('last', navigationInstruction.config.name);
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
                    route: 'plugins', name: 'plugins', moduleId: 'pages/plugins', nav: true, auth: true, land: true,
                    settings: {key: 'plugins', title: this.i18n.tr('pages.plugins.title')}
                },
                {
                    route: 'settings', name: 'settings', moduleId: 'pages/settings', nav: true, auth: true, land: true,
                    settings: {key: 'settings'}
                },
                {
                    route: 'groupactions', name: 'groupactions', moduleId: 'pages/groupactions', nav: true, auth: true, land: true,
                    settings: {key: 'groupactions', title: this.i18n.tr('pages.groupactoins.title'), parent: 'settings'}
                },
                {
                    route: 'inputs', name: 'inputs', moduleId: 'pages/inputs', nav: true, auth: true, land: true,
                    settings: {key: 'inputs', title: this.i18n.tr('pages.inputs.title'), parent: 'settings'}
                },
                {
                    route: 'environment', name: 'environment', moduleId: 'pages/environment', nav: true, auth: true, land: true,
                    settings: {key: 'environment', title: this.i18n.tr('pages.environment.title'), parent: 'settings'}
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
