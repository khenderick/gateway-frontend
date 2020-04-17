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
function double_zero(number) {
    var number_string = number.toString();
    if (number_string.length === 1) {
        return "0" + number_string;
    }
    return number_string;
}
function distanceToSegmentSquared(p, a, b) {
    var line_length = distanceSquared(a, b);
    if (line_length === 0) {
        return distanceSquared(p, a);
    }
    var projection = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / line_length;
    if (projection < 0) {
        return distanceSquared(p, a);
    }
    if (projection > 1) {
        return distanceSquared(p, b);
    }
    return distanceSquared(p, {
        x: a.x + projection * (b.x - a.x),
        y: a.y + projection * (b.y - a.y) }
    );
}
function distanceToSegment(p, a, b) {
    return Math.sqrt(distanceToSegmentSquared(p, a, b));
}
export function systemtime_to_humantime(system_time) {
    var ten_minutes = Math.round(system_time);
    var minutes = (ten_minutes % 6) * 10;
    var hours = (ten_minutes - (minutes / 10)) / 6;
    return double_zero(hours) + ":" + double_zero(minutes);
}
export function humantime_to_systemtime(human_time) {
    var parts = human_time.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = Math.round(parseInt(parts[1], 10) / 10);
    return (hours * 6) + minutes;
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
    // Gateway environment
    if (!model.configuration) {
        model.output_0 = model.thermostat.output0Value;
        model.output_0_id = model.thermostat.output0Id;
        model.output_1_id = model.thermostat.output1Id;
        model.output_1 = model.thermostat.output1Value;
        model.configuration = {
            [mode]: {
                output_0_id: model.thermostat.output0Id,
                output_1_id: model.thermostat.output1Id,
            }
        }
    }
    const { output_0 } = model;
    if (model.configuration[mode].output_0_id < 255) {
        output0 = 1;
        available0 = true;
        
        if (output_0 < 10) {
            value0 = output_0 + ' %&nbsp;';
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
    const { output_1 } = model;
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

export const current_time_window = ({ global, isHeating, configuration, status, ...rest }) => {
    const result = {
        begin: '',
        end: '',
    };
    const mode = isHeating ? 'heating' : 'cooling';
    const mmt = moment();
    let data = {};
    let schedule = {};
    if (configuration[mode].schedule) {
        data = configuration[mode].schedule.data;
        schedule = data[mmt.day() - 1];
    } else {
        data = [
            0,
            ...rest.thermostat[`auto${mmt.format('dddd')}`]
            .systemSchedule
            .filter(el => typeof(el) === 'string')
            .map(el => humantime_to_seconds(el))
        ];
    }
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
    return result;
}

function humantime_to_seconds(time) {
    var parts = time.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = Math.round(parseInt(parts[1], 10) / 10);
    return hours * 60 * 60 + minutes * 60;
}

export const icon_type = (current_model) => {
    let type = 'PARTY';
    const { isDay } = current_time_window(current_model);
    const { status: { preset } } = current_model;
    if (preset === 'AUTO') {
        if (isDay) {
            type = 'DAY';
        } else {
            type = 'NIGHT';
        }
    } else {
        type = preset;
    }
    return type;
};

export default {
    systemtime_to_humantime,
    humantime_to_systemtime,
    distanceToSegment,
    decimal_split,
    distance,
    current_time_window,
    hex2rgba,
    icon_type,
    measureText,
    output_info,
    scale,
}
