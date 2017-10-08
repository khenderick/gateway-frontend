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

export class Toolbox {
    static crossfiller(data, list, key, loader, mappingKey) {
        let newKeys = [], items = {};
        for (let item of data) {
            newKeys.push(item[key]);
            items[item[key]] = item;
        }
        let currentKeys = [], removals = [];
        for (let item of list) {
            if (newKeys.indexOf(item[key]) === -1) {
                if (loader !== undefined) {
                    removals.push(item);
                }
            } else {
                currentKeys.push(item[key]);
            }
        }
        for (let item of removals) {
            list.splice(list.indexOf(item), 1);
        }
        if (loader !== undefined) {
            for (let newKey of newKeys) {
                if (currentKeys.indexOf(newKey) === -1) {
                    currentKeys.push(newKey);
                    let item = loader(newKey, items[newKey]);
                    if (item !== undefined) {
                        list.push(item);
                    }
                }
            }
        }
        for (let item of list) {
            if (items.hasOwnProperty(item[key])) {
                item.fillData(items[item[key]], true, mappingKey);
            }
        }
    };

    static prettifyXml(xml) {
        let serializer = new XMLSerializer();
        let xmlText = serializer.serializeToString(xml);
        let lines = xmlText.split('<');
        let indent = '';
        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            if (line[0] === '/') {
                indent = indent.substring(2);
            }
            lines[i] = `${indent}<${line}`;
            if (line[0] !== '/' && line.slice(-2) !== '/>') {
                indent += '  ';
            }
        }
        let text = lines.join('\n');
        text = text.replace(/(<(\w+)\b[^>]*>[^\n]*)\n *<\/\2>/g, '$1</$2>');
        return text.replace(/^\n/, '');
    }

    static generateHash(length) {
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return (new Array(length)).join().split(',').map(function () {
            return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join('');
    }

    static ensureDefault(options, property, defaultValue) {
        if (!options.hasOwnProperty(property)) {
            options[property] = defaultValue
        }
    }

    static arrayHasElement(array, element, key) {
        for (let arrayElement of array) {
            if (key !== undefined) {
                if (element[key] === arrayElement[key]) {
                    return true;
                }
            } else if (element === arrayElement) {
                return true;
            }
        }
        return false;
    }

    static removeElement(array, element, key) {
        for (let [index, arrayElement] of array.entries()) {
            if (key !== undefined) {
                if (element[key] === arrayElement[key]) {
                    array.splice(index, 1);
                    return;
                }
            } else if (element === arrayElement) {
                array.splice(index, 1);
                return;
            }
        }
    }

    static getDeviceViewport() {
        let viewport = undefined;
        for (let item of ['xs', 'sm', 'md', 'lg']) {
            if ($(`#device-${item}`).is(':visible')) {
                viewport = item;
            }
        }
        return viewport;
    }

    static stringContains(string, value) {
        return string.indexOf(value) !== -1;
    }

    static getTimestamp() {
        return new Date().getTime();
    }

    static splitSeconds(value) {
        let minutes = Math.floor(value / 60);
        let seconds = value - (minutes * 60);
        let hours = Math.floor(minutes / 60);
        minutes = minutes - (hours * 60);
        return {
            hours: hours,
            minutes: minutes,
            seconds: seconds
        };
    }

    static parseTime(time, fallback) {
        let pieces = time.split(':'),
            hours = parseInt(pieces[0]),
            minutes = parseInt(pieces[1]);
        let totalMinutes = hours * 60 + minutes;
        if (totalMinutes < 0 || totalMinutes > 1440) {
            if (fallback !== undefined) {
                return Toolbox.parseTime(fallback);
            }
        }
        return totalMinutes;
    }

    static minutesToString(totalMinutes) {
        let minutes = totalMinutes % 60,
            hours = (totalMinutes - minutes) / 60;
        return `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}`;
    }

    static sort(first, second) {
        return function(a, b) {
            if (a[first] === b[first]) {
                return a[second] > b[second] ? 1 : -1;
            }
            return a[first] > b[first] ? 1 : -1;
        }
    }

    static formatBytes(bytes, i18n) {
        let units = ['b', 'kib', 'mib', 'gib', 'tib'], counter = 0, value = bytes;
        while (value >= 1000) {
            value = value / 1024;
            counter += 1;
        }
        return `${value.toFixed(2)} ${i18n.tr(`generic.units.${units[counter]}`)}`;
    }

    static iif(condition, entries, negativeEntries) {
        let ensureArray = (entry) => entry && (Array.isArray(entry) ? entry : [entry]) || [];
        return condition ? ensureArray(entries) : ensureArray(negativeEntries);
    }
}


// Internal Javascript prototype modifications
Array.prototype.contains = function (element, key) {
    return Toolbox.arrayHasElement(this, element, key);
};
Array.prototype.remove = function (element, key) {
    return Toolbox.removeElement(this, element, key);
};
String.prototype.contains = function (value) {
    return Toolbox.stringContains(this, value);
};
