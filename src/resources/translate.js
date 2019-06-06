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
import {inject, customAttribute} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {Logger} from '../components/logger';

@customAttribute('translate')
@inject(Element, I18N)
export class Translate {
    constructor(element, i18n) {
        this.element = element;
        this.i18n = i18n;
        this.composed = this.element.getAttribute('translate.bind').contains('+');
    }

    valueChanged(newValue) {
        this.element.innerHTML = newValue;
        if (this.composed && !newValue.contains('<') && !newValue.contains('&')) {
            Logger.warn(`Using translate binding without HTML, use template literals instead:\n${newValue}`);
        }
    }
}
