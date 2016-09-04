import "../styles/openmotics.css";
import "font-awesome/css/font-awesome.css";
import "bootstrap/dist/css/bootstrap.css";
import "admin-lte/dist/css/AdminLTE.css";
import "admin-lte/dist/css/skins/skin-green.css";
import "bootstrap";
import * as Bluebird from "bluebird";
import {I18N} from "aurelia-i18n";
import XHR from "i18next-xhr-backend";
import {ViewLocator} from "aurelia-framework";
import {HttpClient} from "aurelia-fetch-client";
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

export async function configure(aurelia) {
    aurelia.use
        .standardConfiguration()
        .developmentLogging()
        .globalResources([
            'resources/translate',
            'resources/togglebutton/togglebutton',
            'resources/slider/slider',
            'resources/blockly/blockly',
            'resources/formatter'
        ])
        .plugin('aurelia-i18n', (instance) => {
            instance.i18next.use(XHR);
            return instance.setup({
                backend: {
                    loadPath: '{{lng}}/{{ns}}',
                    parse: (data) => data,
                    ajax: loadLocales
                },
                lng: 'en',
                attributes: ['data-i18n', 't', 'i18n'],
                fallbackLng: 'nl',
                debug: false,
                ns: ['translation', 'nav', 'secuident']
            });
        })
        .plugin('aurelia-dialog');

    let api = new API(aurelia, new HttpClient());
    await aurelia.start().then(a => {
        api.getModules()
            .then(() => {
                a.setRoot('index');
            })
            .catch(() => {
                a.setRoot('users');
            });
    });
}
