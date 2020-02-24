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
import 'eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.min.css';
import 'styles/openmotics.css';
import 'font-awesome/css/font-awesome.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'admin-lte/dist/css/AdminLTE.min.css';
import 'admin-lte/dist/css/skins/skin-green.css';
import 'admin-lte/dist/js/adminlte.min.js';
import 'babel-polyfill';
import 'bootstrap';
import Chart from 'chart.js';
import * as Bluebird from 'bluebird';
import {PLATFORM} from 'aurelia-pal';
import {Container} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {DirtyCheckProperty} from 'aurelia-binding';
import {TCustomAttribute} from 'aurelia-i18n';
import Backend from 'i18next-xhr-backend';
import {API, APIError} from './components/api';
import {APIGateway} from './components/api-gateway';
import {APICloud} from './components/api-cloud';
import {Storage} from './components/storage';
import Shared from './components/shared';
import {Logger} from './components/logger';
import {Toolbox} from './components/toolbox';

Bluebird.config({warnings: false});

export async function configure(aurelia) {
    if (Shared.settings.has_config) {
        let client = await API.loadHttpClient();
        let response = await client.fetch(`/settings.json?timestamp=${Toolbox.getTimestamp()}`, {});
        let settings = JSON.parse(await response.text());
        Shared.settings = Object.assign(Shared.settings, settings);
    }

    let configuration = aurelia.use.standardConfiguration().
        developmentLogging().
        globalResources([
            PLATFORM.moduleName('resources/translate', 'resources'),
            PLATFORM.moduleName('resources/let', 'resources'),
            PLATFORM.moduleName('resources/timepicker/timepicker', 'resources'),
            PLATFORM.moduleName('resources/togglebutton/togglebutton', 'resources'),
            PLATFORM.moduleName('resources/schedule/schedule', 'resources'),
            PLATFORM.moduleName('resources/slider/slider', 'resources'),
            PLATFORM.moduleName('resources/blockly/blockly', 'resources.blockly'),
            PLATFORM.moduleName('resources/dropdown/dropdown', 'resources'),
            PLATFORM.moduleName('resources/globalthermostat/thermostat', 'resources'),
            PLATFORM.moduleName('resources/thermostatgroup/thermostat', 'resources'),
            PLATFORM.moduleName('resources/calendar/calendar', 'resources'),
            PLATFORM.moduleName('resources/confirm/confirm', 'resources'),
            PLATFORM.moduleName('resources/edit/edit', 'resources'),
            PLATFORM.moduleName('resources/toclipboard/toclipboard', 'resources'),
            PLATFORM.moduleName('resources/valueconverters', 'resources')
        ]).
        plugin(PLATFORM.moduleName('aurelia-i18n', 'aurelia'), instance => {
            let aliases = ['t', 'i18n'];
            let localesRoot = '';
            if (Shared.isProduction) {
                localesRoot = Shared.settings.target === 'gateway' ? '/static' : '';
            }
            TCustomAttribute.configureAliases(aliases);
            instance.i18next.use(Backend);
            return instance.setup({
                backend: {
                    loadPath: `${localesRoot}/locales/{{lng}}/{{ns}}.json?build=${Shared.build}`,
                },
                attributes: aliases,
                lng: Storage.getItem('locale', 'en'),
                fallbackLng: 'en',
                debug: false,
            });
        }).
        plugin(PLATFORM.moduleName('aurelia-bootstrap-datetimepicker', 'aurelia')).
        plugin(PLATFORM.moduleName('aurelia-chart', 'aurelia')).
        plugin(PLATFORM.moduleName('aurelia-dialog', 'aurelia')).
        plugin(PLATFORM.moduleName('aurelia-computed', 'aurelia'), {
            enableLogging: true
        });
    if (Shared.settings.analytics) {
        configuration.plugin(PLATFORM.moduleName('aurelia-google-analytics', 'analytics'), config => {
            config.init(Shared.settings.analytics);
            config.attach({
                anonymizeIp: {enabled: true},
                logging: {enabled: !Shared.isProduction},
                pageTracking: {enabled: Shared.isProduction},
                clickTracking: {enabled: Shared.isProduction},
            });
        });
    }

    let APIClass = APIGateway;
    if (Shared.target === 'cloud') {
        APIClass = APICloud;
    }
    aurelia.container.makeGlobal();
    Container.instance.registerSingleton(API, APIClass);

    DirtyCheckProperty.prototype.standardSubscribe = DirtyCheckProperty.prototype.subscribe;
    DirtyCheckProperty.prototype.subscribe = function(context, callable) {
        this.standardSubscribe(context, callable);
        Logger.warn(`'${this.obj.constructor.name}.${this.propertyName}' is being dirty checked`, this.obj);
    };

    await aurelia.start();
    let api = new APIClass(undefined, undefined);
    let router = Container.instance.get(Router);
    try {
        if (Shared.target === 'cloud') {
            let responseData = await api.contextInformation();
            if ([undefined, null].contains(responseData.data.user)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new APIError('unauthenticated');
            }
            Shared.currentUser = responseData.data.user;
        } else {
            await api.getVersion({ignoreMM: true, ignore401: true});
        }
        await router.navigate('/', {replace: true, trigger: false});
        return aurelia.setRoot(PLATFORM.moduleName('index', 'main'), document.body);
    } catch (error) {
        if (error.cause !== 'unauthenticated') {
            Logger.error(error);
        }
        await router.navigate('/', {replace: true, trigger: false});
        return aurelia.setRoot(PLATFORM.moduleName('users', 'main'), document.body);
    }
}
