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
import {inject, Factory} from "aurelia-framework";
import {Base} from "../../resources/base";
import {Plugin} from "../../containers/plugin";
import Shared from "../../components/shared";


@inject(Factory.of(Plugin))
export class PluginIndex extends Base {
    constructor(pluginFactory, ...rest) {
        super(...rest);
        this.pluginFactory = pluginFactory;
        this.reference = undefined;
        this.plugin = undefined;
        this.iframeLoading = true;
    };

    iframeLoaded() {
        this.iframeLoading = false;
        let iframeId = 'plugin-index-iframe';
        let iframe = document.getElementById(iframeId);
        let iframeStyle = iframe.style ? iframe.style : iframe;
        try {
            // First, try to stretch the iframe to it's contents. It should work fine, since it's same domain.
			let innerDocument = iframe.contentDocument ? iframe.contentDocument : iframe.contentWindow.document;
			if (innerDocument === null) {
                iframe.height = document.all[iframeId].clientHeight + document.all[iframeId] .offsetHeight + document.all[iframeId].offsetTop;
			} else {
				iframeStyle.height = innerDocument.body.scrollHeight + 18;
            }
		} catch (err) {
            // If not, then just make the iframe take all visible space. The rest will get scrollbars.
            let windowHeight = window.innerHeight;
            let headerHeight = document.getElementsByClassName('main-header')[0].clientHeight;
            let contentHeaderHeight = document.getElementsByClassName('content-header')[0].clientHeight;
            let footerHeight = document.getElementsByClassName('main-footer')[0].clientHeight;
            iframeStyle.height = (
                windowHeight - headerHeight - footerHeight - contentHeaderHeight -
                20 - // iframe padding
                23 - // box border and margin
                30 - // content padding
                7    // some extra buffer
            ) + 'px';
		}
    };

    // Aurelia
    attached() {
        super.attached();
    };

    activate(parameters) {
        this.reference = parameters.reference;
        Shared.pluginIndex = parameters.reference;
        return this.api.getPlugins()
            .then((data) => {
                for (let pluginData of data.plugins) {
                    let plugin = this.pluginFactory(pluginData.name);
                    plugin.fillData(pluginData);
                    if (plugin.reference === this.reference) {
                        this.plugin = plugin;
                        break;
                    }
                }
            });
    };

    deactivate() {
        Shared.pluginIndex = undefined;
    }
}
