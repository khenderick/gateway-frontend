export class BaseObject {
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
