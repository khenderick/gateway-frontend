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

export class Storage {
    constructor(prefix) {
        if (prefix) {
            this.prefix = prefix + '_';
        } else {
            this.prefix = '';
        }
    }

    set(key, value) {
        Storage.setItem(this.prefix + key, value)
    }

    remove(key) {
        Storage.removeItem(this.prefix + key);
    }

    get(key) {
        return Storage.getItem(this.prefix + key);
    }

    static setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static removeItem(key) {
        localStorage.removeItem(key);
    }

    static getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || undefined;
        }
        catch (error) {
            return undefined;
        }
    }
}
