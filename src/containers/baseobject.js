export class BaseObject {
    fillData(data, validate) {
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
        if (validate && (!data.hasOwnProperty(this.mapping[this.key]) || this[this.key] !== data[this.mapping[this.key]])) {
            throw 'Invalid config received';
        }
        for (let entry of Object.keys(this.mapping)) {
            if (Array.isArray(this.mapping[entry])) {
                let key = this.mapping[entry][0];
                let hasAllKeys = true, args = [];
                for (let item of key) {
                    if (data.hasOwnProperty(item)) {
                        args.push(data[item]);
                    } else {
                        hasAllKeys = false;
                        break;
                    }
                }
                if (hasAllKeys === true) {
                    this[entry] = this.mapping[entry][1](...args);
                }
            } else {
                let key = this.mapping[entry];
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
    }

    cancel() {
        this._freeze = false;
        this.fillData(this._data, this._validate);
    }
}
