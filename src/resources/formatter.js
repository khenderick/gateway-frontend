import numeral from "numeral";

export class NumberFormatValueConverter {
    toView(value, format) {
        return numeral(value).format(format);
    }
}

export class ShortValueConverter {
    toView(value, length) {
        if (value.length > length + 2) {
            return value.substr(0, length - 2) + '...';
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
