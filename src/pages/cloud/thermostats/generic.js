export function hex2rgba(hexcolor, alpha) {
    hexcolor = hexcolor.substring(1, 7);
    var rgb = [
        parseInt(hexcolor.substring(0, 2), 16),
        parseInt(hexcolor.substring(2, 4), 16),
        parseInt(hexcolor.substring(4, 6), 16)
    ];
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
}
export function scale(metrics, factor) {
    return {
        x: metrics.x,
        y: metrics.y,
        w: metrics.w * factor,
        h: metrics.h * factor
    };
}

export function measureText(context, font, text) {
    var originalfont = context.font;
    context.font = font;
    var metrics = context.measureText(text);
    context.font = originalfont;
    return metrics;
}

function sqr(x) {
    return x * x;
}

function distanceSquared(a, b) {
    return sqr(a.x - b.x) + sqr(a.y - b.y);
}

export function distance(a, b) {
    return Math.sqrt(distanceSquared(a, b));
}

export function decimal_split(value) {
    var temp = '';
    if (value || value === 0) {
        temp = value.toString();
    }
    var result = [temp, '0'];
    if (temp.indexOf('.') >= 0) {
        result = temp.split('.');
    }
    return result;
}

export default {
    decimal_split,
    distance,
    hex2rgba,
    measureText,
    scale,
}
