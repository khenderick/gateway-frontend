/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Container} from 'aurelia-framework';
import {I18N} from 'aurelia-i18n';
import numeral from 'numeral';
import {Toolbox} from '../components/toolbox';

export class NumberFormatValueConverter {
    toView(value, format) {
        return numeral(value).format(format);
    }
}

export class ShortValueConverter {
    toView(value, length, middle) {
        return Toolbox.shorten(value, length, middle);
    }
}

export class SubMenuValueConverter {
    toView(menuItems, group) {
        let items = [];
        for (let item of menuItems) {
            item.children = [];
            if (item.settings.group !== group) {
                continue;
            }
            if (item.settings.parent) {
                let parent = menuItems.find((x) => x.config.name === item.settings.parent);
                parent.children.push(item);
            } else {
                items.push(item);
            }
        }
        for (let item of menuItems) {
            if (item.children.length > 0) {
                item.isActive = item.children.filter(c => c.isActive).length > 0;
            }
        }
        return items;
    }
}

export class ToJSONValueConverter {
    toView(value) {
        return JSON.stringify(value);
    }
}

/**
 * A value converter to simulate a "contains" function. This is a workaround, since Aurelia
 * doesn't observe arrays very well. The idea is to use it like this:
 * theArray.length | contains:theArray:theItem:'someKey':shouldInvert
 * Where the converter will return true|false depending on whether `theArray` contains `theItem`. The optional
 * 'someKey' can be used in case objects are used. `shouldInvert` indicates whether to negate the contains.
 */
export class ContainsValueConverter {
    toView(_, array, element, key, invert) {
        if (!Array.isArray(array)) {
            return false;
        }
        let result = array.contains(element, key);
        if (invert) {
            return !result;
        }
        return result;
    }
}

export class FormatSecondsValueConverter {
    toView(value, zeroIsDisabled) {
        zeroIsDisabled = !!zeroIsDisabled;
        if (value === 0 && zeroIsDisabled) {
            let i18n = Container.instance.get(I18N);
            return i18n.tr('generic.disabled');
        }
        let components = Toolbox.splitSeconds(value);
        let parts = [];
        if (components.hours > 0) {
            parts.push(`${components.hours}h`);
        }
        if (components.minutes > 0) {
            parts.push(`${components.minutes}m`);
        }
        if (components.seconds > 0 || parts.length === 0) {
            parts.push(`${components.seconds}s`);
        }
        return parts.join(' ');
    }
}

export class InstanceOfValueConverter {
    toView(value, type) {
        return value instanceof type;
    }
}

export class RoundValueConverter {
    toView(value, digits) {
        if (value === undefined || value === null) {
            value = 0;
        }
        let float = parseFloat(value);
        if (isNaN(float)) {
            return value;
        }
        return float.toFixed(digits);
    }
}

export class TranslateValueConverter {
    toView(value, namespace) {
        let i18n = Container.instance.get(I18N);
        let translation = i18n.tr(`${namespace}:${value}`);
        if (translation.startsWith(`${namespace}:`)) {
            return value;
        }
        return translation;
    }
}

export class EntriesValueConverter {
    toView(value) {
        let list = [];
        for (let [k, v] of Object.entries(value)) {
            list.push({
                key: k,
                value: v
            });
        }
        return list;
    }
}

export class TimeAgoValueConverter {
    toView(moment) {
        return moment.fromNow();
    }
}

export class ToHumanDateTimeValueConverter {
    toView(moment) {
        return moment.format('LLL');
    }
}