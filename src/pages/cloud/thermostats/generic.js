import moment from 'moment';

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

export const getGlobalPreset = (group) => {
    if (!group || !group.schedule || !group.schedule.preset) {
      return '';
    }
    debugger;
    const key = Object.keys(group.schedule.preset || {})[0];
    return (group.schedule.preset)[Number(key)] || '';
};

export const getNextSetpoint = (schedule) => {
    try {
      const mmt = moment();
      const currentDay = mmt.clone().startOf('day');
      const currentSeconds = mmt.diff(currentDay, 'seconds');
      if (!schedule || !schedule.length) {
        throw new Error(undefined);
      }
      const scheduleKeys = Object.keys(get(schedule, mmt.day() - 1, {}));
      return currentDay.add(scheduleKeys.find((time, index, array) => (
        Number(time) > currentSeconds && index + 1 !== array.length
      )) || schedule[0], 'seconds').format('hh:mm a');
    } catch (error) {
      return '';
    }
  };

export const current_time_window = ({ global, isHeating, thermostat: { configuration, status } }) => {
    const result = {
        begin: '',
        end: '',
    };
    if (getGlobalPreset(global) === 'AUTO' || status.preset === 'AUTO') {
        const mmt = moment();
        const data = configuration[isHeating ? 'heating' : 'cooling'].schedule.data;
        const schedule = data[mmt.day() - 1];
        const currentDay = mmt.clone().startOf('day');
        const currentTime = mmt.unix() - mmt.startOf('day').unix();
        const scheduleKeys = Object.keys(schedule).map(val => +val);
        if (currentTime > scheduleKeys[scheduleKeys.length - 1]) {
            result.isDay = false;
            result.begin = currentDay.clone().add(scheduleKeys[scheduleKeys.length - 1], 'seconds').format('HH:mm');
            result.end = currentDay.clone().add(scheduleKeys[0], 'seconds').format('HH:mm');
        }
        scheduleKeys.forEach((val, index) => {
            if (currentTime <= val) {
                result.isDay = true;
                result.begin = currentDay.clone().add(scheduleKeys[index - 1], 'seconds').format('HH:mm');
                result.end = currentDay.clone().add(val, 'seconds').format('HH:mm');
            }
        })
    }
    return result;
}

export default {
    decimal_split,
    distance,
    current_time_window,
    hex2rgba,
    measureText,
    output_info,
    scale,
}
