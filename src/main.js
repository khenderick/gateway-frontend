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
import {bootstrap} from "aurelia-bootstrapper-webpack";
import "styles/openmotics.css";
import "font-awesome/css/font-awesome.css";
import "bootstrap/dist/css/bootstrap.css";
import "admin-lte/dist/css/AdminLTE.css";
import "admin-lte/dist/css/skins/skin-green.css";
import "bootstrap";
import * as Bluebird from "bluebird";
import Backend from "i18next-xhr-backend";
import {ViewLocator} from "aurelia-framework";
import {AdminLTE} from "admin-lte";
import {API} from "./components/api";

Bluebird.config({warnings: false});

function loadLocales(url, options, callback, data) {
    try {
        let waitForLocale = require('bundle!locale/' + url + '.json');
        waitForLocale((locale) => {
            callback(locale, {status: '200'});
        });
    } catch (e) {
        callback(null, {status: '404'});
    }
}

bootstrap(async aurelia => {
    if (!global.Intl) {
        console.log('Intl not present, loading polyfill.');
        await new Promise((resolve) => {
            require.ensure(['intl', 'intl/locale-data/jsonp/en.js'], function (require) {
                require('intl');
                require('intl/locale-data/jsonp/en.js');
                resolve();
            });
        });
    }
    await boot(aurelia);
});

async function boot(aurelia) {
    aurelia.use
        .standardConfiguration()
        .developmentLogging()
        .globalResources([
            'resources/translate',
            'resources/let',
            'resources/togglebutton/togglebutton',
            'resources/schedule/schedule',
            'resources/slider/slider',
            'resources/blockly/blockly',
            'resources/dropdown/dropdown',
            'resources/globalthermostat/thermostat',
            'resources/valueconverters'
        ])
        .plugin('aurelia-i18n', (instance) => {
            instance.i18next.use(Backend);
            return instance.setup({
                backend: {
                    loadPath: '{{lng}}/{{ns}}',
                    parse: (data) => data,
                    ajax: loadLocales
                },
                lng: 'en',
                attributes: ['t', 'i18n'],
                fallbackLng: 'nl',
                debug: false,
                ns: ['translation']
            });
        })
        .plugin('aurelia-dialog')
        .plugin('aurelia-computed')
        .plugin('aurelia-google-analytics', (config) => {
            config.init('UA-37903864-4');
            config.attach({
                logging: {
                    enabled: __ENVIRONMENT__ === 'development'
                },
                pageTracking: {
                    enabled: __ENVIRONMENT__ === 'production'
                },
                clickTracking: {
                    enabled: __ENVIRONMENT__ === 'production'
                }
            });
        });
    aurelia.container.makeGlobal();

    await aurelia.start();
    let api = new API(undefined);
    return api.getVersion({ignoreMM: true, ignore401: true})
        .then(() => {
            return aurelia.setRoot('index', document.body);
        })
        .catch(() => {
            return aurelia.setRoot('users', document.body);
        });
}
