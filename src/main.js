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
import "styles/openmotics.css";
import "font-awesome/css/font-awesome.css";
import "bootstrap/dist/css/bootstrap.css";
import "admin-lte/dist/css/AdminLTE.css";
import "admin-lte/dist/css/skins/skin-green.css";
import "babel-polyfill";
import "bootstrap";
import * as Bluebird from "bluebird";
import {PLATFORM} from 'aurelia-pal';
import {I18N, TCustomAttribute} from "aurelia-i18n";
import Backend from "i18next-xhr-backend";
import {AdminLTE} from "admin-lte";
import {API} from "./components/api";
import {Storage} from "./components/storage";

Bluebird.config({warnings: false});

export async function configure(aurelia) {
    aurelia.use.standardConfiguration().
        developmentLogging().
        globalResources([
            PLATFORM.moduleName('resources/translate', 'resources'),
            PLATFORM.moduleName('resources/let', 'resources'),
            PLATFORM.moduleName('resources/togglebutton/togglebutton', 'resources'),
            PLATFORM.moduleName('resources/schedule/schedule', 'resources'),
            PLATFORM.moduleName('resources/slider/slider', 'resources'),
            PLATFORM.moduleName('resources/blockly/blockly', 'resources.blockly'),
            PLATFORM.moduleName('resources/dropdown/dropdown', 'resources'),
            PLATFORM.moduleName('resources/globalthermostat/thermostat', 'resources'),
            PLATFORM.moduleName('resources/valueconverters', 'resources'),
        ]).
        plugin(PLATFORM.moduleName('aurelia-i18n'), instance => {
            let aliases = ['t', 'i18n'];
            TCustomAttribute.configureAliases(aliases);
            instance.i18next.use(Backend);
            return instance.setup({
                backend: {
                    loadPath: `${__ENVIRONMENT__ === 'production' ? '/static' : ''}/locales/{{lng}}/{{ns}}.json`,
                },
                attributes: aliases,
                lng: Storage.getItem('locale', 'en'),
                fallbackLng: 'en',
                debug: false,
            });
        }).
        plugin(PLATFORM.moduleName('aurelia-dialog', 'aurelia')).
        plugin(PLATFORM.moduleName('aurelia-computed', 'aurelia')).
        plugin(PLATFORM.moduleName('aurelia-google-analytics', 'analytics'), config => {
            config.init('UA-37903864-4');
            config.attach({
                logging: {
                    enabled: __ENVIRONMENT__ === 'development',
                },
                pageTracking: {
                    enabled: __ENVIRONMENT__ === 'production',
                },
                clickTracking: {
                    enabled: __ENVIRONMENT__ === 'production',
                },
            });
        });
    aurelia.container.makeGlobal();

    await aurelia.start();
    let api = new API(undefined);
    try {
        await api.getVersion({ignoreMM: true, ignore401: true});
        return aurelia.setRoot(PLATFORM.moduleName('index', 'main'));
    } catch (error) {
        return aurelia.setRoot(PLATFORM.moduleName('users', 'main'));
    }
}
