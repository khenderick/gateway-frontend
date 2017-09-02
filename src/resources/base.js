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
import $ from "jquery";
import {inject} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {BindingSignaler} from "aurelia-templating-resources";
import {API} from "../components/api";

@inject(I18N, EventAggregator, BindingSignaler, API)
export class Base {
    constructor(i18n, ea, signaler, api) {
        this.i18n = i18n;
        this.ea = ea;
        this.signaler = signaler;
        this.api = api;

        this.ea.subscribe('i18n:locale:changed', () => {
            this.i18n.updateTranslations($('body'));
        });
    }

    async attached() {
        this.i18n.updateTranslations($('body'));
    }
}
