import "fetch";
import {inject, computedFrom} from "aurelia-framework";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";

@inject(API, I18N, Element, EventAggregator)
export class Logout extends BaseI18N {
    constructor(api, i18n, element, ea) {
        super(i18n, element, ea);
        this.api = api;
    };

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.api.logout();
    };
}
