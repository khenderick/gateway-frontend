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

function get_degrees(percentage) {
    var arcStart = options.arcOffset + 90;
    var arcEnd = 360 - options.arcOffset + 90;
    while (arcStart > 360) {
        arcStart -= 360;
        arcEnd -= 360;
    }
    while (arcStart < 0) {
        arcStart += 360;
        arcEnd += 360;
    }
    var arcDifference = arcEnd - arcStart;
    arcDifference = arcDifference / 100 * percentage;
    arcEnd = arcStart + arcDifference;
    return {
        start: deg2rad(arcStart),
        end:   deg2rad(arcEnd)
    };
}

function deg2rad(degrees) {
    return (degrees * (Math.PI / 180));
}

export function output_info(model) {
    var opaque = 0.3;
    var output0 = opaque;
    var output0_a = opaque;
    var available0 = false;
    var value0 = 'n/a &nbsp; ';
    var image0 = "url('/static/img/glyphicons.png')";
    const mode = model.isHeating ? 'heating' : 'cooling';
    const { status: { output_0 } } = model;
    if (model.configuration[mode].output_0_id < 255) {
        output0 = 1;
        available0 = true;
        
        if (output_0 < 10) {
            value0 = output_0 + ' %&nbsp;';
            debugger;
        } else {
            value0 = output_0 + ' %';
        }
        if (output_0 > 0) {
            image0 = "url('/static/img/glyphicons_color.png')";
            output0_a = 1;
        }
    }
    var output1 = opaque;
    var output1_a = opaque;
    var available1 = false;
    var value1 = ' &nbsp; n/a';
    var image1 = "url('/static/img/glyphicons.png')";
    const { status: { output_1 } } = model;
    if (model.configuration[mode].output_1_id < 255) {
        output1 = 1;
        available1 = true;
        if (output_1 < 10) {
            value0 = output_1 + ' %&nbsp;';
        } else {
            value0 = output_1 + ' %';
        }
        if (output_1 > 0) {
            image1 = "url('/static/img/glyphicons_color.png')";
            output1_a = 1;
        }
    }
    return {
        'opacity_0': output0,
        'filter_0': 'filter(opacity=' + (output0 * 100) + ')',
        'opacity_a_0': output0_a,
        'filter_a_0': 'filter(opacity=' + (output0_a * 100) + ')',
        'value_0': value0,
        'image_0': image0,
        'available_0': available0,
        'opacity_1': output1,
        'filter_1': 'filter(opacity=' + (output1 * 100) + ')',
        'opacity_a_1': output1_a,
        'filter_a_1': 'filter(opacity=' + (output1_a * 100) + ')',
        'value_1': value1,
        'image_1': image1,
        'available_1': available1
    };
}

export default {
    decimal_split,
    distance,
    hex2rgba,
    measureText,
    output_info,
    scale,
}
