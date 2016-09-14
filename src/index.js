import {AdminLTE} from "admin-lte";
import {Base} from "./resources/base";
import Shared from "./components/shared";

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
            config.map([
                {
                    route: '', redirect: 'dashboard'
                },
                {
                    route: 'dashboard', name: 'dashboard', moduleId: 'pages/dashboard', nav: true,
                    settings: {key: 'dashboard', title: this.i18n.tr('pages.dashboard.title')}
                },
                {
                    route: 'outputs', name: 'outputs', moduleId: 'pages/outputs', nav: true,
                    settings: {key: 'outputs', title: this.i18n.tr('pages.outputs.title')}
                },
                {
                    route: 'thermostats', name: 'thermostats', moduleId: 'pages/thermostats', nav: true,
                    settings: {key: 'thermostats', title: this.i18n.tr('pages.thermostats.title')}
                },
                {
                    route: 'energy', name: 'energy', moduleId: 'pages/energy', nav: true,
                    settings: {key: 'energy', title: this.i18n.tr('pages.energy.title')}
                },
                {
                    route: 'plugins', name: 'plugins', moduleId: 'pages/plugins', nav: true,
                    settings: {key: 'plugins', title: this.i18n.tr('pages.plugins.title')}
                },
                {
                    route: 'settings', name: 'settings', moduleId: 'pages/settings', nav: true,
                    settings: {key: 'settings'}
                },
                {
                    route: 'groupactions', name: 'groupactions', moduleId: 'pages/groupactions', nav: true,
                    settings: {key: 'groupactions', title: this.i18n.tr('pages.groupactoins.title'), parent: 'settings'}
                },
                {
                    route: 'inputs', name: 'inputs', moduleId: 'pages/inputs', nav: true,
                    settings: {key: 'inputs', title: this.i18n.tr('pages.inputs.title'), parent: 'settings'}
                },
                {
                    route: 'environment', name: 'environment', moduleId: 'pages/environment', nav: true,
                    settings: {key: 'environment', title: this.i18n.tr('pages.environment.title'), parent: 'settings'}
                },
                {
                    route: 'logout', name: 'logout', moduleId: 'pages/logout', nav: false,
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
