import {I18N, BaseI18N} from "aurelia-i18n";
import {AdminLTE} from "admin-lte";
import {inject} from "aurelia-framework";
import {EventAggregator} from "aurelia-event-aggregator";
import {Router} from "aurelia-router";
import {API} from "./components/api";

@inject(API, I18N, Element, EventAggregator, Router)
export class Users extends BaseI18N {
    constructor(api, i18n, element, ea, router) {
        super(i18n, element, ea);
        this.router = router;
        this.api = api;
    };

    // Aurelia
    activate() {
        this.router.configure((config) => {
            config.title = 'OpenMotics';
            config.map([
                {
                    route: '', redirect: 'login'
                },
                {
                    route: 'login', name: 'login', moduleId: 'usermanagement/login', nav: false,
                    settings: {key: 'login', title: this.i18n.tr('pages.login.title')}
                },
                {
                    route: 'create', name: 'create', moduleId: 'usermanagement/create', nav: false,
                    settings: {key: 'create', title: this.i18n.tr('pages.create.title')}
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
