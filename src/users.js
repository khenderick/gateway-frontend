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

export class Users extends Base {
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
