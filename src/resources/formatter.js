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
