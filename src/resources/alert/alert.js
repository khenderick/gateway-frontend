/*
 * Copyright (C) 2019 OpenMotics BV
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
import {inject} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import {DialogController} from 'aurelia-dialog';

@inject(DialogController, I18N)

export class Alert {
    constructor(dialogController, i18n) {
        this.controller = dialogController;
        this.i18n = i18n;
        this.answer = null;
        this.config = {
            acceptButtonStyle: 'btn-default',
        };

        dialogController.settings.centerHorizontalOnly = true;
    }

    activate(config) {
        this.config = { ...this.config, ...config };
    }
}