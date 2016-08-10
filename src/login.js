import "fetch";
import {inject, computedFrom} from "aurelia-framework";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "./components/api";

@inject(API, I18N, Element, EventAggregator)
export class Login extends BaseI18N {
    constructor(api, i18n, element, ea) {
        super(i18n, element, ea);
        this.api = api;
        this.username = '';
        this.password = '';
        this.failure = false;
    };

    login() {
        this.failure = false;
        this.api.login(this.username, this.password)
            .catch(() => {
                this.failure = true;
            });
    };

    // Aurelia
    configureRouter(config, router) {
        config.title = 'OpenMotics';
        config.map([
            {
                route: ['', 'login'],
                name: 'login',
                moduleId: 'login',
                nav: false,
                settings: {key: 'login', title: this.i18n.tr('pages.login.title')}
            }
        ]);
        this.router = router;
    };

    attached() {
        super.attached();
    };

    activate() {
        this.password = '';
    };
}
