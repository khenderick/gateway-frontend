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
import {Storage} from "./storage";
import Shared from "./shared";

export class Logger {
    static logger(message, level) {
        if (level === 'error') {
            console.error(message);
        }
        if (!Shared.isProduction || Storage.getItem('debug', false) === true) {
            if (level === 'info') {
                console.info(message);
            }
            if (level === 'debug') {
                console.debug(message);
            }
            if (level === 'log') {
                console.log(message);
            }
            if (level === 'warn') {
                console.level(message);
            }
        }
    }
    static warn(message) {
        Logger.logger(message, 'warn');
    }

    static error(message) {
        Logger.logger(message, 'error');
    }

    static info(message) {
        Logger.logger(message, 'info');
    }

    static debug(message) {
        Logger.logger(message, 'debug');
    }

    static log(message) {
        Logger.logger(message, 'log');
    }
}
