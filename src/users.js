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
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import moment from 'moment';
import {Base} from './resources/base';
import {Toolbox} from './components/toolbox';

@inject(Router)
export class Users extends Base {
    constructor(router, ...rest) {
        super(...rest);
        this.router = router;
        this.copyrightYear = moment().year();
    }

    // Aurelia
    activate() {
        this.router.configure(config => {
            config.title = 'OpenMotics';
            config.map([
                {
                    route: '', redirect: 'login'
                },
                {
                    route: 'login', name: 'login', moduleId: PLATFORM.moduleName('usermanagement/login', 'users'), nav: false,
                    settings: {key: 'login', title: this.i18n.tr('pages.login.title')}
                },
                ...Toolbox.iif(this.shared.target !== 'cloud', [
                    {
                        route: 'create', name: 'create', moduleId: PLATFORM.moduleName('usermanagement/create', 'users'), nav: false,
                        settings: {key: 'create', title: this.i18n.tr('pages.create.title')}
                    }
                ]),
                ...Toolbox.iif(this.shared.target === 'cloud', [
                    {
                        route: 'register', name: 'register', moduleId: PLATFORM.moduleName('usermanagement/register', 'users'), nav: false,
                        settings: {key: 'register', title: this.i18n.tr('pages.register.title')}
                    }
                ])
            ]);
            config.mapUnknownRoutes({redirect: 'login'});
        });
    }

    attached() {
        window.addEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.addEventListener('resize', () => { $('body').layout('fix'); });
    }

    detached() {
        window.removeEventListener('aurelia-composed', () => { $('body').layout('fix'); });
        window.removeEventListener('resize', () => { $('body').layout('fix'); });
    }
}
