import numeral from "numeral";

export class NumberFormatValueConverter {
    toView(value, format) {
        return numeral(value).format(format);
    }
}

export class ShortValueConverter {
    toView(value, length, middle) {
        middle = middle || false;
        if (value.length > length) {
            length = length - 3;
            if (middle) {
                let subLength = Math.floor(length / 2);
                return value.substr(0, subLength) + '...' + value.substr(value.length - subLength);
            }
            return value.substr(0, length) + '...';
        }
        return value;
    }
}

export class SubMenuValueConverter {
    toView(menuItems) {
        let items = [];
        for (let item of menuItems) {
            if (item.settings.parent) {
                var parent = menuItems.find((x) => x.config.name == item.settings.parent);
                parent.children.push(item);
                Object.defineProperty(parent, 'isActive', {
                    get: () => {
                        for (let child of parent.children) {
                            if (child.isActive) {
                                return true;
                            }
                        }
                        return false;
                    }
                });
            } else {
                item.children = [];
                items.push(item);
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
