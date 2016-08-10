export class Toolbox {
    static crossfiller(data, list, key, loader) {
        var newKeys = [], currentKeys = [], items = {};
        for (let item of data) {
            newKeys.push(item[key]);
            items[item[key]] = item;
        }
        for (let item of list) {
            if (newKeys.indexOf(item[key]) === -1) {
                list.splice(list.indexOf(item), 1);
            } else {
                currentKeys.push(item[key]);
            }
        }
        for (let newKey of newKeys) {
            if (currentKeys.indexOf(newKey) === -1) {
                currentKeys.push(newKey);
                list.push(loader(newKey));
            }
        }
        for (let item of list) {
            if (items.hasOwnProperty(item[key])) {
                item.fillData(items[item[key]]);
            }
        }
    };

    static trySet(property, container, field) {
        if (container.hasOwnProperty(field)) {
            property = container[field];
        }
    }
}
