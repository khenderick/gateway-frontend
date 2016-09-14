import "fetch";
import {Container} from "aurelia-dependency-injection";
import {Aurelia} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {Router} from "aurelia-router";
import {I18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {DialogService} from "aurelia-dialog";
import {API} from "./api";
import {Authentication} from "./authentication";

class Shared {
    constructor() {
        if (!Shared.instance) {
            let aurelia = Container.instance.get(Aurelia);
            let router = aurelia.container.get(Router);
            let api = new API(router);
            let authentication = new Authentication(aurelia, router, api);
            let signaler = aurelia.container.get(BindingSignaler);
            let i18n = aurelia.container.get(I18N);
            let ea = aurelia.container.get(EventAggregator);
            let dialogService = aurelia.container.get(DialogService);
            //let dialogController = aurelia.container.get(DialogController);
            this._data = [
                {id: 'api', data: api},
                {id: 'authentication', data: authentication},
                {id: 'aurelia', data: aurelia},
                {id: 'router', data: router},
                {id: 'signaler', data: signaler},
                {id: 'i18n', data: i18n},
                {id: 'ea', data: ea},
                {id: 'dialogService', data: dialogService},
                //{id: 'dialogController', data: dialogController}
            ];
            Shared.instance = this;
        }
        return Shared.instance;
    }

    add(item) {
        this._data.push(item);
    }

    get(id) {
        return this._data.find(d => d.id === id).data;
    }
}

const instance = new Shared();
Object.freeze(instance);

export default instance;
