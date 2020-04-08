import $ from 'jquery';
import generic from 'resources/generic';

$.fn.thermostat = function (options) {

    function set_to_min_max(auto_config) {
        $.each([0,3,6], function(ignore, index) {
            if (auto_config[index] === undefined) {
                auto_config[index] = options.min + (options.max - options.min) / 2;
            }
            auto_config[index] = Math.min(Math.max(auto_config[index], options.min), options.max);
        });
    }

    // ##############################
    // ## Variables
    // ##############################
    var element = $(this[0]);
    if (!options.simple) {
        set_to_min_max(options.auto_mon);
        set_to_min_max(options.auto_tue);
        set_to_min_max(options.auto_wed);
        set_to_min_max(options.auto_thu);
        set_to_min_max(options.auto_fri);
        set_to_min_max(options.auto_sat);
        set_to_min_max(options.auto_sun);
    }
    var current_auto = [options.auto_mon.slice(), options.auto_tue.slice(), options.auto_wed.slice(), options.auto_thu.slice(),
                        options.auto_fri.slice(), options.auto_sat.slice(), options.auto_sun.slice()];

    var original_auto = [options.auto_mon.slice(), options.auto_tue.slice(), options.auto_wed.slice(), options.auto_thu.slice(),
                            options.auto_fri.slice(), options.auto_sat.slice(), options.auto_sun.slice()];

    // ## Colors
    var black = "#000000";
    var gray = "#cccccc";
    var light_gray = "#eeeeee";
    var background_color = options.background_color;
    var active_label = "#0088cc"; //"#51A351";
    var font = '"Helvetica Neue", Helvetica, Arial, ' + font;

    // ## Variables
    var i;
    var id_offset = options.prefix + '-' + options.id + '-';
    var current_day = 0;
    var dragging = false;
    var current_zone;
    var day_badges = [];
    var changed = false;
    var initial_save_enabled = options.is_changed;
    if (initial_save_enabled) {
        // We force a "change" so the save button is enabled
        original_auto[0][1] = original_auto[0][1] - 1;
    }
    var cooling = options.type === 'cooling';

    // ## Calculate variables
    var ratio = window.hasOwnProperty('devicePixelRatio') ? window.devicePixelRatio : 1;
    var draw_height = options.height;
    var draw_width = options.width;
    var height_offset_top = 20;
    var height_offset_bottom = 30;
    var width_offset = 20;
    var height = draw_height - height_offset_top - height_offset_bottom;
    var width  = draw_width - (width_offset * 2);
    var height_unit = height / (options.max - options.min);  // Height in pixels per 1 degrees
    var width_unit  = width / (24 * 6);                       // Width in pixels per 10 minutes
    // var width_unit  = width / 24;                       // Width in pixels per 10 minutes
    var prev_x = -1;
    var prev_y = -1;
    var height_units = (options.max - options.min);
    var simple_y_on  = height_offset_top + (Math.round(height_units / 10 * 3) * height_unit);
    var simple_y_off = height_offset_top + (Math.round(height_units / 10 * 8) * height_unit);
    var simple_y_ctr = ((simple_y_off - simple_y_on) / 2) + simple_y_on;
    var tbs_trigger_temperature = 20;

    // ## Data container structure
    //    Contains all exact measurements corresponding with the interface
    var guic = to_gui_container();

    // ## Prepare some variables
    var today = new Date();
    var today_date = today.getDay();
    if (today_date === 0) {
        today_date = 7;
    }
    current_day = today_date - 1;

    element.html('<canvas id="' + id_offset + 'canvas"></canvas>');
    var canvas_element = document.getElementById(id_offset + 'canvas');
    canvas_element.style.width = options.width + 'px';
    canvas_element.style.height = options.height + 'px';
    canvas_element.width = draw_width * ratio;
    canvas_element.height = draw_height * ratio;
    var canvas = $('#' + id_offset + 'canvas');
    var canvas_offset = canvas.offset();

    // ## Mouse handles
    function mousemove(event) {
        event.preventDefault();
        event.originalEvent.preventDefault();
        var coordinates = get_coordinates(event);
        var gui = guic[current_day];

        if (!dragging) {
            set_cusor(get_zone(event, coordinates));
        } else {
            var move = true;
            if (current_zone.horizontal) {
                if (options.simple) {
                    coordinates.y = (coordinates.y > simple_y_ctr ? simple_y_off : simple_y_on);
                } else {
                    coordinates.y = round_nearest(coordinates.y, height_offset_top, height_unit);
                    if (current_zone.zone === 'night') {
                        if (cooling) {
                            if (coordinates.y < height_offset_top) {
                                move = false;
                                gui.y[current_zone.zone] = height_offset_top;
                            }
                            var min_day = Math.min(gui.y.day1, gui.y.day2);
                            if (coordinates.y > min_day) {
                                move = false;
                                gui.y[current_zone.zone] = min_day;
                            }
                        } else {
                            if (coordinates.y > (height + height_offset_top)) {
                                move = false;
                                gui.y[current_zone.zone] = height + height_offset_top;
                            }
                            var max_day = Math.max(gui.y.day1, gui.y.day2);
                            if (coordinates.y < max_day) {
                                move = false;
                                gui.y[current_zone.zone] = max_day;
                            }
                        }
                    } else {
                        if (cooling) {
                            if (coordinates.y > (height + height_offset_top)) {
                                move = false;
                                gui.y[current_zone.zone] = height + height_offset_top;
                            } else if (coordinates.y < gui.y.night) {
                                move = false;
                                gui.y[current_zone.zone] = gui.y.night;
                            }
                        } else {
                            if (coordinates.y < height_offset_top) {
                                move = false;
                                gui.y[current_zone.zone] = height_offset_top;
                            } else if (coordinates.y > gui.y.night) {
                                move = false;
                                gui.y[current_zone.zone] = gui.y.night;
                            }
                        }
                    }
                }
                if (move) {
                    gui.y[current_zone.zone] = coordinates.y;
                }
            } else {
                coordinates.x = round_nearest(coordinates.x, width_offset, width_unit);
                if (current_zone.zone === 1 && coordinates.x < width_offset) {
                    move = false;
                    gui.x[current_zone.zone] = width_offset;
                } else if (current_zone.zone === 4 && coordinates.x > (draw_width - width_offset)) {
                    move = false;
                    gui.x[current_zone.zone] = draw_width - width_offset;
                } else if (current_zone.zone < 4 && coordinates.x > (gui.x[current_zone.zone + 1] - 3)) {
                    move = false;
                    gui.x[current_zone.zone] = gui.x[current_zone.zone + 1] - 3;
                } else if (current_zone.zone > 1 && coordinates.x < (gui.x[current_zone.zone - 1] + 3)) {
                    move = false;
                    gui.x[current_zone.zone] = gui.x[current_zone.zone - 1] + 3;
                }
                if (move) {
                    gui.x[current_zone.zone] = coordinates.x;
                }
            }
            if (prev_x !== coordinates.x || prev_y !== coordinates.y) {
                from_gui_container();
                draw_current_day();
                prev_x = coordinates.x;
                prev_y = coordinates.y;
            }
        }
    }
    function mousedown(event) {
        event.preventDefault();
        event.originalEvent.preventDefault();
        var coordinates = get_coordinates(event);
        var zone = get_zone(event, coordinates);
        if (zone) {
            // We start the dragging
            dragging = true;
            current_zone = zone;
            draw_current_day();
        } else {
            // Seems we're not on a drag-zone. We probably are clicking on a button.
            var badge;
            for (i = 0; i < day_badges.length; i++) {
                badge = day_badges[i];
                if (coordinates.x > badge.x && coordinates.x < (badge.x + badge.w) &&
                    coordinates.y > badge.y && coordinates.y < (badge.y + badge.h)) {
                    current_day = badge.day;
                    draw_current_day();
                    break;
                }
            }
            if (changed) {
                // If the data was changed, we also have to search for an 'undo' click
                if (coordinates.x > draw_width - 30 && coordinates.x < draw_width &&
                    coordinates.y > height_offset_top && coordinates.y < height_offset_top + 30) {
                    restore_data();
                }
            }
        }
    }
    function mouseup(event) {
        event.preventDefault();
        event.originalEvent.preventDefault();
        if (dragging) {
            dragging = false;
            current_zone = undefined;
            from_gui_container();
            draw_current_day();
            from_gui_container();
            send_data();
        }
    }
    canvas.bind('selectstart', function() { return false; });
    element.bind('selectstart', function () { return false; });

    canvas.bind('touchend',   mouseup);
    canvas.bind('mouseup',    mouseup);
    canvas.bind('mouseleave', mouseup);
    canvas.bind('touchmove',  mousemove);
    canvas.bind('mousemove',  mousemove);
    canvas.bind('touchstart', mousedown);
    canvas.bind('mousedown',  mousedown);

    // ## Images
    var images = {};
    function load_images(sources, callback) {
        var source;
        var images = {};
        var loadedImages = 0;
        var numberOfImages = 0;
        for (source in sources) {
            if (sources.hasOwnProperty(source)) {
                numberOfImages++;
            }
        }
        for (source in sources) {
            if (sources.hasOwnProperty(source)) {
                images[source] = new Image();
                images[source].onload = function () {
                    if (++loadedImages >= numberOfImages) {
                        callback(images);
                    }
                };
                images[source].src = sources[source];
            }
        }
    }
    var image_sources = {
        glyph: '/static/img/glyphicons.png',
        logo_bws: '/static/img/logo_bws.png'
    };

    // ## Drawing
    var first_draw = true;
    var context = canvas[0].getContext('2d');
    context.scale(ratio, ratio);
    function draw_current_day() {
        var gui = guic[current_day];
        // Blank the canvas (except for the images
        context.strokeStyle = background_color;
        context.fillStyle = background_color;
        context.fillRect(0, 0, draw_width, draw_height);
        context.stroke();

        // Draw raster
        context.strokeStyle = light_gray;
        context.fillStyle = light_gray;
        context.lineWidth = 1;
        context.beginPath();
        i = height_offset_top + height_unit;
        while (i < (draw_height - height_offset_bottom - 1)) {
            context.moveTo(width_offset, to_dot5(i));
            context.lineTo(draw_width - width_offset, to_dot5(i));
            i += height_unit;
        }
        i = width_offset;
        while (i <= draw_width - width_offset + 1) {
            context.moveTo(to_dot5(i), height_offset_top);
            context.lineTo(to_dot5(i), draw_height - height_offset_bottom);
            i += (width_unit * 6);
        }
        context.stroke();

        // Draw helper info
        context.strokeStyle = gray;
        context.fillStyle = gray;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, to_dot5(height_offset_top));
        context.lineTo(draw_width, to_dot5(height_offset_top));
        context.stroke();
        context.beginPath();
        context.moveTo(0, to_dot5(height_offset_top + height));
        context.lineTo(draw_width, to_dot5(height_offset_top + height));
        context.stroke();

        context.globalAlpha = 0.2;
        context.drawImage(images.logo_bws, 0, 0, 25, 27, width_offset + 5, height_offset_top + 5, 25, 27);
        context.globalAlpha = 1;

        draw_temperatures(context);
        draw_times(context, first_draw);
        draw_days(context);
        draw_undo(context);

        // Draw the curve
        context.strokeStyle = black;
        context.fillStyle = black;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0,             gui.y.night);
        context.lineTo(gui.x[1],      gui.y.night);     // Draw night 1
        context.lineTo(gui.x[1],      gui.y.day1);      // Draw night 1 to day 1
        context.lineTo(gui.x[2],      gui.y.day1);      // Draw day 1
        context.lineTo(gui.x[2],      gui.y.night);     // Draw day 1 to night 2
        context.lineTo(gui.x[3],      gui.y.night);     // Draw night 2
        context.lineTo(gui.x[3],      gui.y.day2);      // Draw night 2 to day 2
        context.lineTo(gui.x[4],      gui.y.day2);      // Draw day 2
        context.lineTo(gui.x[4],      gui.y.night);     // Draw day 2 to night 3
        context.lineTo(draw_width,    gui.y.night);     // Draw night 3
        context.stroke();

        // Draw time information lines
        if (gui.y.night === gui.y.day1 || gui.y.night === gui.y.day2) {
            context.strokeStyle = black;
            context.fillStyle = black;
            context.lineWidth = 1;
            context.beginPath();
            if (gui.y.night === gui.y.day1) {
                context.moveTo(to_dot5(gui.x[1]), to_dot5(gui.y.night + 5));
                context.lineTo(to_dot5(gui.x[1]), to_dot5(gui.y.night - 5));
                context.moveTo(to_dot5(gui.x[2]), to_dot5(gui.y.night + 5));
                context.lineTo(to_dot5(gui.x[2]), to_dot5(gui.y.night - 5));
            }
            if (gui.y.night === gui.y.day2) {
                context.moveTo(to_dot5(gui.x[3]), to_dot5(gui.y.night + 5));
                context.lineTo(to_dot5(gui.x[3]), to_dot5(gui.y.night - 5));
                context.moveTo(to_dot5(gui.x[4]), to_dot5(gui.y.night + 5));
                context.lineTo(to_dot5(gui.x[4]), to_dot5(gui.y.night - 5));
            }
            context.stroke();
        }

        first_draw = false;
    }

    // ## Kick of image loading that will render the canvas as soon as the images are loaded
    load_images(image_sources, function(loaded_images) {
        images = loaded_images;
        draw_current_day();
    });

    // ## Callbacks
    function send_data() {
        const preparedData = current_auto.map(day => 
            day.map((el, i) => [1, 2, 4, 5].includes(i) ? generic.systemtime_to_humantime(el) : el)
        );
        options.data_change({
            auto_mon: generic.systemtime_to_humantime(preparedData[0]),
            auto_tue: generic.systemtime_to_humantime(preparedData[1]),
            auto_wed: generic.systemtime_to_humantime(preparedData[2]),
            auto_thu: generic.systemtime_to_humantime(preparedData[3]),
            auto_fri: generic.systemtime_to_humantime(preparedData[4]),
            auto_sat: generic.systemtime_to_humantime(preparedData[5]),
            auto_sun: generic.systemtime_to_humantime(preparedData[6]),
            id: options.id,
            name: options.title
        });
    }
    function check_change_state() {
        changed = false;
        for (var i = 0; i < 7; i++) {
            for (var j = 0; j < 7; j++) {
                if (current_auto[i][j] !== original_auto[i][j]) {
                    changed = true;
                    break;
                }
            }
        }
    }
    function restore_data() {
        if (initial_save_enabled) {
            // Undo the initial_save_enabled tweak
            original_auto[0][1] = original_auto[0][1] + 1;
        }
        // Revert
        for (var i = 0; i < 7; i++) {
            current_auto[i] = original_auto[i].slice();
        }

        guic = to_gui_container();
        draw_current_day();
    }

    // ## Draw helpers
    function draw_undo(context) {
        check_change_state();

        if (changed) {
            context.drawImage(images.glyph, 50, 1050, 30, 30, draw_width - 30, height_offset_top, 30, 30);
        }
    }
    function draw_temperatures(context) {
        var gui = guic[current_day];
        var text = "";
        var width = 0;

        var night_t = current_auto[current_day][0];
        var day1_t = current_auto[current_day][3];
        var day2_t = current_auto[current_day][6];

        // Set some base information
        context.strokeStyle = black;
        context.fillStyle = black;
        context.font = 'bold 10px ' + font;

        text = options.simple ? (night_t > tbs_trigger_temperature ? 'on' : 'off') : set_one_digit(night_t) + ' °C';
        width = generic.measureText(context, 'bold 10px ' + font, text).width;
        context.fillText(
            text,
            ((gui.x[1] - gui.x[0]) > width + 5 ? ((gui.x[0] + gui.x[1]) / 2 - width / 2) : gui.x[1] + 5),
            (gui.y.night > height_offset_top + 18 ? gui.y.night - 5 : gui.y.night + 12)
        );
        text = options.simple ? (day1_t > tbs_trigger_temperature ? 'on' : 'off') : set_one_digit(day1_t) + ' °C';
        width = generic.measureText(context, 'bold 10px ' + font, text).width;
        context.fillText(
            text,
            ((gui.x[2] - gui.x[1]) > width + 5 ? ((gui.x[1] + gui.x[2]) / 2 - width / 2) : gui.x[2] + 5),
            (gui.y.day1 > height_offset_top + 18 ? gui.y.day1 - 5 : gui.y.day1 + 12)
        );
        text = options.simple ? (night_t > tbs_trigger_temperature ? 'on' : 'off') : set_one_digit(night_t) + ' °C';
        width = generic.measureText(context, 'bold 10px ' + font, text).width;
        context.fillText(
            text,
            ((gui.x[3] - gui.x[2]) > width + 5 ? ((gui.x[2] + gui.x[3]) / 2 - width / 2) : (gui.y.day1 > gui.y.day2 ? gui.x[3] + 5 : gui.x[2] - width - 5)),
            (gui.y.night > height_offset_top + 18 ? gui.y.night - 5 : gui.y.night + 12)
        );
        text = options.simple ? (day2_t > tbs_trigger_temperature ? 'on' : 'off') : set_one_digit(day2_t) + ' °C';
        width = generic.measureText(context, 'bold 10px ' + font, text).width;
        context.fillText(
            text,
            ((gui.x[4] - gui.x[3]) > width+ 5 ? ((gui.x[3] + gui.x[4]) / 2 - width / 2) : gui.x[3] - width - 5),
            (gui.y.day2 > height_offset_top + 18 ? gui.y.day2 - 5 : gui.y.day2 + 12)
        );
        text = options.simple ? (night_t > tbs_trigger_temperature ? 'on' : 'off') : set_one_digit(night_t) + ' °C';
        width = generic.measureText(context, 'bold 10px ' + font, text).width;
        context.fillText(
            text,
            ((gui.x[5] - gui.x[4]) > width + 5 ? ((gui.x[4] + gui.x[5]) / 2 - width / 2) : gui.x[4] - width - 5),
            (gui.y.night > height_offset_top + 18 ? gui.y.night - 5 : gui.y.night + 12)
        );
    }
    function draw_times(context, first_draw) {
        var gui = guic[current_day];

        // Draw times
        context.strokeStyle = black;
        context.fillStyle = black;
        context.font = '15px ' + font;

        if (current_auto[current_day].some(el => typeof(el) === 'string')) {
            context.fillText(current_auto[current_day][1], 28, 14);
            context.fillText(current_auto[current_day][2], 98, 14);
            context.fillText(current_auto[current_day][4], draw_width - 137, 14);
            context.fillText(current_auto[current_day][5], draw_width - 67, 14);
        } else {
            context.fillText(generic.systemtime_to_humantime(current_auto[current_day][1]), 28, 14);
            context.fillText(generic.systemtime_to_humantime(current_auto[current_day][2]), 98, 14);
            context.fillText(generic.systemtime_to_humantime(current_auto[current_day][4]), draw_width - 137, 14);
            context.fillText(generic.systemtime_to_humantime(current_auto[current_day][5]), draw_width - 67, 14);
        }

        context.strokeStyle = gray;
        context.fillStyle = gray;
        context.font = '10px ' + font;
        context.textAlign = 'center';
        context.fillText('00:00', width_offset,                      draw_height - height_offset_bottom - 3);
        context.fillText('06:00', width_offset + (width_unit * 36),  draw_height - height_offset_bottom - 3);
        context.fillText('12:00', width_offset + (width_unit * 72),  draw_height - height_offset_bottom - 3);
        context.fillText('18:00', width_offset + (width_unit * 108), draw_height - height_offset_bottom - 3);
        context.fillText('24:00', width_offset + (width_unit * 144), draw_height - height_offset_bottom - 3);
        context.textAlign = 'left';

        context.drawImage(images.glyph, 50, 1100, 30, 30, 75, 0, 15, 15);
        context.drawImage(images.glyph, 50, 1100, 30, 30, draw_width - 90, 0, 15, 15);
        context.drawImage(images.glyph,  0, 1100, 30, 30, 5, 0, 15, 15);
        context.drawImage(images.glyph,  0, 1100, 30, 30, 145, 0, 15, 15);
        context.drawImage(images.glyph,  0, 1100, 30, 30, draw_width - 160, 0, 15, 15);
        context.drawImage(images.glyph,  0, 1100, 30, 30, draw_width - 20, 0, 15, 15);
    }
    var previous_day = -1;
    function draw_days(context) {
        day_badges = [];
        var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var days_short = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        context.font = 'bold 11px ' + font;
        var total_dw = 0;
        for (i = 0; i < days.length; i++) {
            total_dw += context.measureText(days[i]).width + 30;
        }
        total_dw -= 10;
        if (total_dw > draw_width) {
            days = days_short;
            total_dw = 0;
            for (i = 0; i < days.length; i++) {
                total_dw += context.measureText(days[i]).width + 30;
            }
            total_dw -= 10;
        }
        var x = (draw_width - total_dw) / 2;
        var y = height_offset_top + height + 5.5;
        var w = 0;
        for (i = 0; i < days.length; i++)
        {
            w = context.measureText(days[i]).width + 20;
            draw_badge(context, days[i], x, y, w, "#ffffff", (current_day === i ? active_label : gray));
            day_badges.push({ day: i, x: x, y: y, w: w, h: 23 });
            x += 10 + w;
        }
    }
    function draw_badge(context, text, x, y, w, text_color, badge_color) {
        var alignment = context.textAlign;
        var h = 23;
        var r = 3;
        context.strokeStyle = badge_color;
        context.fillStyle = badge_color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, y + (h - r));
        context.lineTo(x, y + r);
        context.arcTo(x, y, x + r, y, r);
        context.lineTo(x + w - r, y);
        context.arcTo(x + w, y, x + w, y + r, r);
        context.lineTo(x + w, y + (h - r));
        context.arcTo(x + w, y + h, x + w - r, y + h, r);
        context.lineTo(x + r, y + h);
        context.arcTo(x, y + h, x, y + (h - r), r);
        context.fill();
        context.stroke();
        context.strokeStyle = text_color;
        context.fillStyle = text_color;
        context.textAlign = 'center';
        context.font = 'bold 11px ' + font;
        context.fillText(text, x + (w / 2), y + 15);
        context.textAlign = alignment;
    }

    // ## Helper functions
    function get_zone(event, given_coordinates) {
        var coordinates;
        if (given_coordinates) {
            coordinates = given_coordinates;
        } else {
            coordinates = get_coordinates(event);
        }
        var zone;
        var gui_x = guic[current_day].x;
        var gui_y = guic[current_day].y;
        var handle = options.handle_width / 2;

        // Let's calculate the distance of the current coordinates to each of the zone handles
        var distances = [
            { name: 'night0', value: generic.distanceToSegment(coordinates, { x: 0,        y: gui_y.night }, { x: gui_x[1],      y: gui_y.night }) },
            { name: 'day1_l', value: generic.distanceToSegment(coordinates, { x: gui_x[1], y: gui_y.night }, { x: gui_x[1],      y: gui_y.day1 }) },
            { name: 'day1',   value: generic.distanceToSegment(coordinates, { x: gui_x[1], y: gui_y.day1 },  { x: gui_x[2],      y: gui_y.day1 }) },
            { name: 'day1_r', value: generic.distanceToSegment(coordinates, { x: gui_x[2], y: gui_y.day1 },  { x: gui_x[2],      y: gui_y.night }) },
            { name: 'night1', value: generic.distanceToSegment(coordinates, { x: gui_x[2], y: gui_y.night }, { x: gui_x[3],      y: gui_y.night }) },
            { name: 'day2_l', value: generic.distanceToSegment(coordinates, { x: gui_x[3], y: gui_y.night }, { x: gui_x[3],      y: gui_y.day2 }) },
            { name: 'day2',   value: generic.distanceToSegment(coordinates, { x: gui_x[3], y: gui_y.day2 },  { x: gui_x[4],      y: gui_y.day2 }) },
            { name: 'day2_r', value: generic.distanceToSegment(coordinates, { x: gui_x[4], y: gui_y.day2 },  { x: gui_x[4],      y: gui_y.night }) },
            { name: 'night2', value: generic.distanceToSegment(coordinates, { x: gui_x[4], y: gui_y.night }, { x: draw_width,  y: gui_y.night }) }
        ];
        var ordered_distances = distances.sort(function(a, b) {
            return a.value - b.value;
        });
        var shortest = ordered_distances[0];

        if (shortest.value <= handle) {
            if (shortest.name === 'night0') { return { zone: 'night', horizontal: true }; }
            if (shortest.name === 'day1')   { return { zone: 'day1',  horizontal: true }; }
            if (shortest.name === 'night1') { return { zone: 'night', horizontal: true }; }
            if (shortest.name === 'day2')   { return { zone: 'day2',  horizontal: true }; }
            if (shortest.name === 'night2') { return { zone: 'night', horizontal: true }; }

            if (shortest.name === 'day1_l') { return { zone: 1, horizontal: false }; }
            if (shortest.name === 'day1_r') { return { zone: 2, horizontal: false }; }
            if (shortest.name === 'day2_l') { return { zone: 3, horizontal: false }; }
            if (shortest.name === 'day2_r') { return { zone: 4, horizontal: false }; }
        }

        return zone;
    }
    function get_coordinates(event) {
        var x = 0;
        var y = 0;
        if (event.originalEvent.touches) {
            if (event.originalEvent.touches.length === 1) {
                x = event.originalEvent.touches[0].pageX - canvas_offset.left;
                y = event.originalEvent.touches[0].pageY - canvas_offset.top;
            }
        } else {
            if (event.offsetX !== undefined) {
                x = event.offsetX;
                y = event.offsetY;
            } else {
                // Whoops, we have a browser not supporting offsetX. Probably firefox. Well, let's just calculate them
                x = event.originalEvent.layerX;
                y = event.originalEvent.layerY;
            }
        }
        return { x:x, y:y };
    }
    function set_cusor(zone) {
        if (zone) {
            canvas.css('cursor', (zone.horizontal ? 's-resize' : 'e-resize'));
        } else {
            canvas.css('cursor', 'default');
        }
    }
    function is_about(value, target, offset) {
        return (value >= target - offset && value <= target + offset);
    }
    function set_one_digit(value) {
        var rounded_value = Math.round(value);
        if (value === rounded_value) {
            value = value + ".0";
        }
        return value;
    }
    function get_temperature(cal_temp) {
        var int_cal_temp = parseInt(cal_temp, 10);
        var decimal = cal_temp - int_cal_temp;

        var returnvalue;
        if (decimal < 0.3) {
            returnvalue = int_cal_temp;
        } else if (decimal > 0.7) {
            returnvalue = int_cal_temp + 1;
        } else {
            returnvalue = int_cal_temp + 0.5;
        }
        return returnvalue;
    }
    function to_dot5(value) {
        return Math.round(value) + 0.5;
    }
    function round_nearest(value, offset, unit) {
        value = value - offset;
        return offset + Math.round(value - (value % (unit / 2)));
    }

    // ## Container translation functions
    function to_gui_container() {
        var container = {};
        let origin_width_unit = width_unit * 6;
        for (i = 0; i < 7; i++) {
            container[i] = {};
            container[i].x = [
                width_offset,
                Math.round(width_offset + generic.humantime_to_systemtime(current_auto[i][1]) * width_unit),
                Math.round(width_offset + generic.humantime_to_systemtime(current_auto[i][2]) * width_unit),
                Math.round(width_offset + generic.humantime_to_systemtime(current_auto[i][4]) * width_unit),
                Math.round(width_offset + generic.humantime_to_systemtime(current_auto[i][5]) * width_unit),
                draw_width - width_offset
            ];

            container[i].y = {
                night: draw_height - Math.round((current_auto[i][0] - options.min) * height_unit) - height_offset_bottom,
                day1:  draw_height - Math.round((current_auto[i][3] - options.min)  * height_unit) - height_offset_bottom,
                day2:  draw_height  - Math.round((current_auto[i][6] - options.min)  * height_unit) - height_offset_bottom
            };

            if (options.simple) {
                container[i].y.night = container[i].y.night > simple_y_ctr ? simple_y_off : simple_y_on;
                container[i].y.day1  = container[i].y.day1  > simple_y_ctr ? simple_y_off : simple_y_on;
                container[i].y.day2  = container[i].y.day2  > simple_y_ctr ? simple_y_off : simple_y_on;
            }
        }

        return container;
    }
    function from_gui_container() {
        for (i = 0; i < 7; i++) {
            var gui = guic[i];

            current_auto[i][1] = Math.round((gui.x[1] - width_offset) / width_unit);
            current_auto[i][2] = Math.round((gui.x[2] - width_offset) / width_unit);
            current_auto[i][4] = Math.round((gui.x[3] - width_offset) / width_unit);
            current_auto[i][5] = Math.round((gui.x[4] - width_offset) / width_unit);

            if (options.simple) {
                current_auto[i][0] = gui.y.night > simple_y_ctr ? 10 : (tbs_trigger_temperature + 2);
                current_auto[i][3] = gui.y.day1  > simple_y_ctr ? 10 : (tbs_trigger_temperature + 2);
                current_auto[i][6] = gui.y.day2  > simple_y_ctr ? 10 : (tbs_trigger_temperature + 2);
            } else {
                current_auto[i][0] = get_temperature((draw_height - height_offset_bottom - gui.y.night) / height_unit) + options.min;
                current_auto[i][3]  = get_temperature((draw_height - height_offset_bottom - gui.y.day1)  / height_unit) + options.min;
                current_auto[i][6]  = get_temperature((draw_height - height_offset_bottom - gui.y.day2)  / height_unit) + options.min;
            }
        }
    }
};
    