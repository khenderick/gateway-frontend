/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {inject, Factory} from "aurelia-framework";
import {Base} from "../../resources/base";
import {App} from "../../containers/app";

@inject(Factory.of(App))
export class AppIndex extends Base {
    constructor(appFactory, ...rest) {
        super(...rest);
        this.appFactory = appFactory;
        this.reference = undefined;
        this.app = undefined;
        this.iframeLoading = true;
    };

    iframeLoaded() {
        this.iframeLoading = false;
        let iframe = document.getElementById('app-index-iframe');
        let iframeStyle = iframe.style ? iframe.style : iframe;
        let windowHeight = window.innerHeight;
        let headerHeight = document.getElementsByClassName('main-header')[0].clientHeight;
        let contentHeaderHeight = document.getElementsByClassName('content-header')[0].clientHeight;
        let footerHeight = document.getElementsByClassName('main-footer')[0].clientHeight;
        iframeStyle.height = `${
            windowHeight - headerHeight - footerHeight - contentHeaderHeight -
            20 - // iframe padding
            3 -  // box border
            30 - // content padding
            6    // some extra buffer
        }px`;
    };

    // Aurelia
    attached() {
        super.attached();
    };

    async activate(parameters) {
        this.iframeLoading = true;
        this.reference = parameters.reference;
        this.shared.appIndex = parameters.reference;
        let data = await this.api.getApps();
        for (let appData of data.plugins) {
            let app = this.appFactory(appData.name);
            app.fillData(appData);
            if (app.reference === this.reference) {
                this.app = app;
                break;
            }
        }
    };

    deactivate() {
        this.shared.appIndex = undefined;
    }
}
