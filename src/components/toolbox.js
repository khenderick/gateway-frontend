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
        return array.some(e => {
            if (key === undefined) {
                return e === element;
            }
            return e[key] === element[key];
        });
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

    static match(objectA, objectB, key) {
        return objectA !== undefined && objectB !== undefined && objectA[key] === objectB[key];
    }

    static inRanges(number, ranges) {
        for (let range of ranges) {
            if (number >= Math.min(...range) && number <= Math.max(...range)) {
                return true;
            }
        }
        return false;
    }

    static dateDifference(date1, date2) {
        let days1 = date1.getTime() / 86400000;
        let days2 = date2.getTime() / 86400000;
        return Math.round(days2 - days1);
    }

    static formatDate(date, format) {
        let parts = {
            M: date.getMonth() + 1,
            d: date.getDate(),
            h: date.getHours(),
            m: date.getMinutes(),
            s: date.getSeconds()
        };

        return format.replace(/(M+|d+|h+|m+|s+)/g, function(part) {
            return ((part.length > 1 ? '0' : '') + parts[part.slice(-1)]).slice(-2);
        }).replace(/(y+)/g, function(part) {
            return date.getFullYear().toString().slice(-part.length)
        });
    }

    static formatDateRange(start, end, format, i18n) {
        if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
            return `${i18n.tr(`generic.days.long.${start.getDay()}`)} (${Toolbox.formatDate(start, format)})`;
        }
        let range = Toolbox.formatDate(start, format) + ' - ' + Toolbox.formatDate(end, format);
        let difference = Toolbox.dateDifference(start, end) + 1;
        if (difference > 20) {
            return `${i18n.tr(`generic.months.long.${(new Date(start.getTime() + difference / 2 * 86400000)).getMonth()}`)} (${range})`;
        }
        return range;
    }

    static arrayEquals(array1, array2) {
        if (array1 === undefined || array2 === undefined) {
            return false;
        }
        if (array1.length !== array2.length) {
            return false;
        }
        for (let i = 0; i < array1.length; i++) {
            if (array1[i] !== array2[i]) {
                return false;
            }
        }
        return true;
    }

    static limit(value, lowerBound, upperBound) {
        return Math.max(lowerBound, Math.min(upperBound, value));
    }

    static percentToSystem64(percent) {
        return Math.round(Toolbox.limit(percent, 0, 100) / 100 * 63);
    }

    static system64ToPercent(system64, round) {
        round = round !== undefined ? round : 1;
        return Math.round(Toolbox.limit(system64, 0, 63) / 63 * 100 / round) * round;
    }

    static generateCrontab(days, at, every) {
        let daysText = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        let selectedDays = [];
        for (let i of [0, 1, 2, 3, 4, 5, 6]) {
            if (days[i]) {
                selectedDays.push(daysText[i]);
            }
        }
        let time = '*/5 *';
        if (at !== undefined) {
            time = at.split(':').reverse().join(' ');
        } else if (every === 1) {
            time = '* *';
        } else if ([5, 10, 15, 20, 30].contains(every)) {
            time = `*/${every} *`;
        } else if (every === 60) {
            time = '0 *';
        } else if ([120, 180, 240, 360, 720].contains(every)) {
            time = `0 */${every / 60}`;
        }
        return `${time} * * ${selectedDays.join(',')}`;
    }

    static parseCrontab(crontab) {
        let daysText = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        try {
            if (crontab === undefined) { return undefined; }
            let days = [false, false, false, false, false, false, false];
            let at = undefined;
            let every = undefined;
            let parts = crontab.split(' ');
            if (parts.length !== 5) { return undefined; }
            if (parts[2] !== '*' || parts[3] !== '*') { return undefined; }
            if (parts[0] === '*' && parts[1] === '*') {
                every = 1;
            } else if (parts[0].contains('/')) {
                if (parts[1] === '*') { return undefined; }
                let subparts = parts[0].split('/');
                if (subparts.length !== 2 || subparts[0] !== '*') { return undefined; }
                every = parseInt(subparts[1]);
                if (![5, 10, 15, 20, 30].contains(every)) { return undefined; }
            } else if (parts[0] === '0' && parts[1].contains('*')) {
                if (parts[1] === '*') {
                    every = 60;
                } else if (!parts[1].contains('/')) {
                    return undefined;
                } else {
                    let subparts = parts[1].split('/');
                    if (subparts.length !== 2 || subparts[0] !== '*') { return undefined; }
                    every = parseInt(subparts[1]) * 60;
                    if (![120, 180, 240, 360, 720].contains(every)) { return undefined; }
                }
            } else {
                at = `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`;
                if (!at.match('^\\d{2}:\\d{2}$')) { return undefined; }
                if (isNaN(Date.parse(`2000 ${at}`))) { return undefined; }
            }
            let subparts = parts[4].split(',');
            for (let day of subparts) {
                if (!daysText.contains(day)) { return undefined; }
                days[daysText.indexOf(day)] = true;
            }
            return [days, at, every];
        } catch (error) {
            return undefined;
        }
    }

    static isDate(dateString) {
        return !([undefined, ''].contains(dateString) || !dateString.match('^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$') || isNaN(Date.parse(dateString.replace(' ', 'T'))));
    }

    static parseDate(dateString) {
        if (!Toolbox.isDate(dateString)) {
            return undefined;
        }
        return Date.parse(dateString.replace(' ', 'T'));
    }
}


// Internal Javascript prototype modifications
Array.prototype.contains = function (element, key) {
    return Toolbox.arrayHasElement(this, element, key);
};
Array.prototype.equals = function(otherArray) {
    return Toolbox.arrayEquals(this, otherArray);
};
Array.prototype.remove = function (element, key) {
    return Toolbox.removeElement(this, element, key);
};
String.prototype.contains = function (value) {
    return Toolbox.stringContains(this, value);
};
