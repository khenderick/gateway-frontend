import "../styles/openmotics.css";
import "font-awesome/css/font-awesome.css";
import "bootstrap/dist/css/bootstrap.css";
import "admin-lte/dist/css/AdminLTE.css";
import "admin-lte/dist/css/skins/skin-green.css";
import "bootstrap";
import * as Bluebird from "bluebird";
import XHR from "i18next-xhr-backend";
import {ViewLocator} from "aurelia-framework";
import {AdminLTE} from "admin-lte";

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
            'resources/let',
            'resources/togglebutton/togglebutton',
            'resources/schedule/schedule',
            'resources/slider/slider',
            'resources/blockly/blockly',
            'resources/dropdown/dropdown',
            'resources/valueconverters'
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
                attributes: ['t', 'i18n'],
                fallbackLng: 'nl',
                debug: false,
                ns: ['translation', 'nav', 'secuident']
            });
        })
        .plugin('aurelia-dialog');
    aurelia.container.makeGlobal();

    await aurelia.start().then((a) => {
        a.setRoot('index');
    });
}
