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
            let wizards = [];
            let aurelia = Container.instance.get(Aurelia);
            let router = aurelia.container.get(Router);
            let api = new API(router);
            let authentication = new Authentication(aurelia, router, api, wizards);
            let signaler = aurelia.container.get(BindingSignaler);
            let i18n = aurelia.container.get(I18N);
            let ea = aurelia.container.get(EventAggregator);
            let dialogService = aurelia.container.get(DialogService);
            this._data = [
                {id: 'api', data: api},
                {id: 'authentication', data: authentication},
                {id: 'aurelia', data: aurelia},
                {id: 'router', data: router},
                {id: 'signaler', data: signaler},
                {id: 'i18n', data: i18n},
                {id: 'ea', data: ea},
                {id: 'dialogService', data: dialogService},
                {id: 'wizards', data: wizards}
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
