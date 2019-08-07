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
import {inject} from 'aurelia-framework';
import {API} from '../components/api';

@inject(API)
export class BaseObject {
    constructor(api) {
        this.api = api;
        this.key = undefined;
        this.mapping = undefined;
        this._edit = false;
    }

    fillData(data, validate, mappingKey) {
        if (this._freeze === true) {
            return;
        }
        if (this._skip === true) {
            this._skip = false;
            return;
        }
        if (validate === undefined) {
            validate = true;
        }
        let mapping = mappingKey === undefined ? this.mapping : this[mappingKey];
        if (validate && (!data.hasOwnProperty(mapping[this.key]) || this[this.key] !== data[mapping[this.key]])) {
            throw 'Invalid config received';
        }
        for (let entry of Object.keys(mapping)) {
            if (Array.isArray(mapping[entry])) {
                let keys = mapping[entry][0];
                let hasAllKeys = true, args = [];
                for (let item of keys) {
                    if (data.hasOwnProperty(item)) {
                        args.push(data[item]);
                    } else {
                        hasAllKeys = false;
                        break;
                    }
                }
                if (hasAllKeys === true) {
                    this[entry] = mapping[entry][1](...args);
                }

            } else if (mapping[entry].split('.').length > 1){
                let elements = mapping[entry].split('.');
                let element = undefined;
                for (let one of elements) {
                    if (element === undefined) {
                        element = data[one];
                    } else {
                        element = element[one];
                    }
                }
                this[entry] = element;
            } else {
                let key = mapping[entry];
                if (data.hasOwnProperty(key)) {
                    this[entry] = data[key];
                }
            }
        }
        this._freeze = false;
        this._dirty = false;
        this._data = data;
        this._validate = validate;
        this._skip = false;
        this._mappingKey = mappingKey
    }

    cancel() {
        this._freeze = false;
        this.fillData(this._data, this._validate, this._mappingKey);
    }
}
