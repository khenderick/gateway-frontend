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
            var key = undefined, parser = undefined;
            if (Array.isArray(this.mapping[entry])) {
                key = this.mapping[entry][0];
                parser = this.mapping[entry][1];
            } else {
                key = this.mapping[entry];
            }
            if (data.hasOwnProperty(key)) {
                if (parser === undefined) {
                    this[entry] = data[key];
                } else {
                    this[entry] = parser(data[key]);
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
