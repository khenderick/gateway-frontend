export class Storage {
    constructor(prefix) {
        if (prefix) {
            this.prefix = prefix + '_';
        } else {
            this.prefix = '';
        }
    }

    set(key, value) {
        Storage.setItem(this.prefix + key, value)
    }

    remove(key) {
        Storage.removeItem(this.prefix + key);
    }

    get(key) {
        return Storage.getItem(this.prefix + key);
    }

    static setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static removeItem(key) {
        localStorage.removeItem(key);
    }

    static getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || undefined;
        }
        catch (error) {
            return undefined;
        }
    }
}
