import $ from 'jquery';
import generic from 'resources/generic';

$.fn.thermostat_ui = function (options) {
    // ##############################
    // ## Variables
    // ##############################
    var element = $(this[0]);

    // ## Data container structure
    //    Contains all exact measurements corresponding with the interface
    var current_model = {
        ...options,
        type: 'thermostat',
        current_setpoint_int: function () {
            var int_part = '--';
            var currentSetpoint = this.currentSetpoint;
            if (currentSetpoint >= 6 && currentSetpoint <= 45) {
                int_part = generic.decimal_split(currentSetpoint)[0];
            }
            return int_part;
        },
        current_setpoint_dec: function () {
            var decimal_part = '.-';
            var currentSetpoint = this.currentSetpoint;
            if (currentSetpoint >= 6 && currentSetpoint <= 45) {
                decimal_part = '.' + generic.decimal_split(currentSetpoint)[1];
            }
            return decimal_part;
        },
        arc_color: function() {
            return this.actualTemperature >= this.currentSetpoint ? '#3A87AD' : '#B94A48';
        },
        actual_temperature_full: function () {
            if (this.actualTemperature === null) {
                return 'n/a';
            }
            var parts = generic.decimal_split(this.actualTemperature);
            if (parts[0] === "") {
                return 'n/a';
            }
            return parts[0] + '.' + parts[1];
        }
    };

    // ## Colors
    var black = "#525252";
    var background_color = options.background_color;
    var arc_background_color = options.arc_background_color;
    var cool_color = options.cool_color;
    var hot_color = options.hot_color;
    var title_color = options.cool_color;
    var font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

    // ## Image information
    var icons = {
        flame: { x: 100, y: 95,   w: 22, h: 29 },
        ice:   { x: 50,  y: 95,   w: 26, h: 29 },
        house: { x: 1,   y: 94,   w: 29, h: 29 },
        moon:  { x: 3,   y: 1104, w: 23, h: 27 },
        sun:   { x: 50,  y: 1104, w: 25, h: 27 },
        away:  { x: 98,  y: 722,  w: 28, h: 25 },
        vac:   { x: 1,   y: 1199, w: 29, h: 28 },
        party: { x: 339, y: 48,   w: 23, h: 27 }
    };

    // ## Variables
    var i;
    var id_offset = 'thui-' + options.id + '-';
    var coordinates = {};
    var dragging = false;
    var arcinfo = get_degrees(100);
    var deg_per_rad = (options.max - options.min) / (arcinfo.end - arcinfo.start);
    var temp_width = 0;
    var temprange = options.max - options.min;
    var actual_setpoint = options.currentSetpoint;
    var images_loaded = false;
    var model_loaded = false;

    // ## Calculate variables
    var ratio = window.hasOwnProperty('devicePixelRatio') ? window.devicePixelRatio : 1;
    var draw_height = options.height;
    var draw_width = options.width;
    var radius = (draw_width - options.thickness) / 2;
    var center = {
        x: draw_width / 2,
        y: radius + (options.thickness / 2)
    };
    element.html('<canvas id="' + id_offset + 'canvas"></canvas>');
    var canvas_element = document.getElementById(id_offset + 'canvas');
    canvas_element.style.width = options.width + 'px';
    canvas_element.style.height = options.height + 'px';
    canvas_element.width = draw_width * ratio;
    canvas_element.height = draw_height * ratio;
    var canvas = $('#' + id_offset + 'canvas');

    // ## Mouse handles
    function mousemove(event) {
        coordinates = get_coordinates(event);
        if (dragging) {
            event.preventDefault();
            event.originalEvent.preventDefault();
            draw();
        }
    }

    function mousedown(event) {
        coordinates = get_coordinates(event);
        dragging = over_arc(coordinates);
        if (dragging) {
            event.preventDefault();
            event.originalEvent.preventDefault();
            actual_setpoint = current_model.currentSetpoint;
            draw();
        }
    }

    function mouseup(event) {
        if (dragging) {
            event.preventDefault();
            event.originalEvent.preventDefault();

            dragging = false;
            actual_setpoint = current_model.currentSetpoint;
            draw();

            current_model.thermostat.change({ detail: { value: actual_setpoint }})
        }
    }

    canvas.bind('selectstart', function () {
        return false;
    });
    element.bind('selectstart', function () {
        return false;
    });

    canvas.bind('touchend', mouseup);
    canvas.bind('mouseup', mouseup);
    canvas.bind('mouseleave', mouseup);
    canvas.bind('touchmove', mousemove);
    canvas.bind('mousemove', mousemove);
    canvas.bind('touchstart', mousedown);
    canvas.bind('mousedown', mousedown);

    // ## Images
    var images = {};
    var image_sources = {
        glyph:    '/static/img/glyphicons.png',
        glyph_c:  '/static/img/glyphicons_color.png',
        logo:     '/static/img/logo.png',
        logo_bw:  '/static/img/logo_bw.png',
        logo_bws: '/static/img/logo_bws.png'
    };
    function load_images(sources) {
        var source;
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
                    loadedImages++;
                    if (loadedImages >= numberOfImages) {
                        images_loaded = true;
                        if (model_loaded) {
                            draw(); // Refresh images
                        }
                    }
                };
                images[source].src = sources[source];
            }
        }
    }
    load_images(image_sources);

    // ## Drawing
    var context = canvas[0].getContext('2d');
    context.scale(ratio, ratio);
    setTimeout(() => {
        actual_setpoint = current_model.currentSetpoint;
        draw();
    }, 1000);
    function draw() {
        // Calculate some base variables
        var current_radians;
        if (dragging) {
            current_radians = Math.atan2(coordinates.y - center.y, coordinates.x - center.x);
        } else {
            current_radians = temp2relrad(actual_setpoint);
        }
        if (current_radians < 0) {
            current_radians += (Math.PI * 2);
        }
        var relative_radians = current_radians;
        if (relative_radians < (arcinfo.start - deg2rad(options.arcOffset))) {
            relative_radians += (Math.PI * 2);
        }
        relative_radians = Math.min(relative_radians, arcinfo.end);
        relative_radians = Math.max(relative_radians, arcinfo.start);
        if (options.simple) {
            relative_radians = relative_radians > ((arcinfo.end - arcinfo.start) / 2 + arcinfo.start) ? arcinfo.end : arcinfo.start;
        }

        var new_setpoint = (deg_per_rad * (relative_radians - arcinfo.start)) + options.min;
        new_setpoint = Math.round(new_setpoint * 2) / 2;

        // Blank the canvas
        context.strokeStyle = background_color;
        context.fillStyle = background_color;
        context.fillRect(0, 0, draw_width, draw_height);
        context.stroke();

        current_model.currentSetpoint = new_setpoint;
        var original_rads = temp2relrad(actual_setpoint);
        var current_rads = temp2relrad(current_model.currentSetpoint);
        var actual_rads = temp2relrad(current_model.actualTemperature);

        // Logo
        //if (images_loaded) {
        //    context.globalAlpha = 0.2;
        //    context.drawImage(images.logo_bws, 0, 0, 25, 27, 0, 0, 25, 27);
        //    context.globalAlpha = 1;
        //}

        // Arc background
        context.fillStyle = arc_background_color;
        context.strokeStyle = arc_background_color;
        context.lineWidth = options.thickness;
        context.beginPath();
        context.arc(center.x, center.y, radius, arcinfo.start, arcinfo.end, false);
        context.stroke();

        // Arc colors
        var color = current_model.arc_color();
        if (options.simple) {
            color = cool_color;
        } else {
            if (dragging) {
                color = current_rads > actual_rads ? hot_color : cool_color;
                color = generic.hex2rgba(color, 0.5);
            }
        }

        // Arc value
        context.fillStyle = color;
        context.strokeStyle = color;
        context.lineWidth = options.thickness;
        context.beginPath();
        context.arc(center.x, center.y, radius, arcinfo.start, original_rads, false);
        context.stroke();

        if (dragging) {
            // Current drawing arc
            context.fillStyle = color;
            context.strokeStyle = color;
            context.lineWidth = options.thickness;
            context.beginPath();
            context.arc(center.x, center.y, radius, arcinfo.start, current_rads, false);
            context.stroke();
        }

        // Helping numbers
        drawscale(context);

        // Name
        context.strokeStyle = title_color;
        context.fillStyle = title_color;
        context.font = 'bold 18px ' + font;
        context.textAlign = 'center';
        context.fillText(options.name, center.x, draw_height - 4);

        // Current setpoint
        if (options.simple) {
            var text = current_model.currentSetpoint >= 20 ? 'on' : 'off';
            temp_width = generic.measureText(context, 'bold 60px ' + font, text).width;
            context.strokeStyle = black;
            context.fillStyle = black;
            context.font = 'bold 60px ' + font;
            context.textAlign = 'left';
            context.fillText(text, center.x - temp_width / 2, draw_height * 0.75);
        } else {
            temp_width  = generic.measureText(context, 'bold 60px ' + font, current_model.current_setpoint_int()).width;
            temp_width += generic.measureText(context, 'bold 25px ' + font, current_model.current_setpoint_dec()).width;
            context.strokeStyle = black;
            context.fillStyle = black;
            context.font = 'bold 60px ' + font;
            context.textAlign = 'left';
            context.fillText(current_model.current_setpoint_int(), center.x - temp_width / 2, draw_height * 0.7);
            context.font = 'bold 25px ' + font;
            context.textAlign = 'right';
            context.fillText(current_model.current_setpoint_dec(), center.x + temp_width / 2, draw_height * 0.7);
            context.font = '20px ' + font;
            context.textAlign = 'right';
            context.fillText('°c', center.x + temp_width / 2, draw_height * 0.7 - 28);
        }

        if (!options.simple) {
            // Actual temperature
            var house = icons.house;
            var house_s = generic.scale(house, 0.5);
            temp_width  = generic.measureText(context, 'bold 17px ' + font, current_model.actual_temperature_full()).width;
            temp_width += house_s.w + 2;
            context.strokeStyle = black;
            context.fillStyle = black;
            context.font = 'bold 17px ' + font;
            context.textAlign = 'right';
            context.fillText(current_model.actual_temperature_full(), center.x + temp_width / 2, draw_height * 0.82);
            if (images_loaded) {
                context.drawImage(images.glyph, house.x, house.y, house.w, house.h, center.x - temp_width / 2 - 1, draw_height * 0.82 - house_s.h + 1, house_s.w, house_s.h);
            }
        }

        // Output flames
        var output_info = generic.output_info(current_model);
        var center_offset = draw_width * 0.27;
        var coord_0 = {
            x: center.x - center_offset,
            y: draw_height * 0.63
        };
        var coord_1 = {
            x: center.x + center_offset,
            y: draw_height * 0.63
        };

        // Gateway environment
        if (!current_model.status) {
                current_model.status = {
                    output_0: current_model.thermostat.output0Value,
                    output_1:  current_model.thermostat.output1Value,
            }
        }

        if (images_loaded) {
            var flame = current_model.type == 'thermostat' ? icons.flame : icons.ice;
            var flame_s = generic.scale(flame, 0.8);
            // - Left flame
            context.globalAlpha = output_info.opacity_0;
            var image_0 = images.glyph;
            if (current_model.status.output_0 > 0) {
                image_0 = images.glyph_c;
            }
            context.drawImage(image_0, flame.x, flame.y, flame.w, flame.h, coord_0.x - (flame_s.w / 2), coord_0.y - flame_s.h, flame_s.w, flame_s.h);
            // - Right flame
            context.globalAlpha = output_info.opacity_1;
            var image_1 = images.glyph;
            if (current_model.status.output_1 > 0) {
                image_1 = images.glyph_c;
            }
            context.drawImage(image_1, flame.x, flame.y, flame.w, flame.h, coord_1.x - (flame_s.w / 2), coord_1.y - flame_s.h, flame_s.w, flame_s.h);
            context.globalAlpha = 1;
        }
        var text_0 = 'n/a';
        var text_1 = 'n/a';
        if (output_info.available_0) {
            text_0 = current_model.status.output_0 + ' %';
        }
        if (output_info.available_1) {
            text_1 = current_model.status.output_1 + ' %';
        }
        context.strokeStyle = black;
        context.fillStyle = black;
        context.font = '10px ' + font;
        context.textAlign = 'center';
        context.fillText(text_0, coord_0.x, coord_0.y + 11);
        context.fillText(text_1, coord_1.x, coord_1.y + 11);

        // State icon
        var icon_width = 30;
        var show_window = false;
        if (images.glyph && images_loaded) {

            var ico = icons.party;
            switch(generic.icon_type(current_model)) {
                case 'DAY':
                    ico = icons.sun;
                    show_window = true;
                    break;
                case 'NIGHT':
                    ico = icons.moon;
                    show_window = true;
                    break;
                case 'AWAY':
                    ico = icons.away;
                    break;
                case 'VACATION':
                    ico = icons.vac;
                    break;
            }
            context.drawImage(images.glyph, ico.x, ico.y, ico.w, ico.h, center.x - (ico.w / 2), draw_height * 0.3, ico.w, ico.h);
            icon_width = ico.w;
        }

        // Active window times
        if (show_window) {
            var window = generic.current_time_window(current_model);
            context.strokeStyle = black;
            context.fillStyle = black;
            context.font = 'bold 12px ' + font;
            context.textAlign = 'right';
            context.fillText(window.begin, center.x - icon_width / 2 - 10, draw_height * 0.3 + 20);
            context.textAlign = 'left';
            context.fillText(window.end, center.x + icon_width / 2 + 10, draw_height * 0.3 + 20);
            context.stroke();
        }
    }

    // ## Draw helpers
    function drawscale(context, arcinfo_v) {
        function getxy(offset, rad) {
            return {
                x: offset * Math.cos(rad) + center.x,
                y: offset * Math.sin(rad) + center.y
            };
        }

        var start = {
            from: getxy(radius + options.thickness / 2 + 4, arcinfo.start),
            to:   getxy(radius - options.thickness / 2, arcinfo.start)
        };
        var end = {
            from: getxy(radius + options.thickness / 2 + 4, arcinfo.end),
            to:   getxy(radius - options.thickness / 2, arcinfo.end)
        };
        var actualTemperature = current_model.actualTemperature;
        var actual_rads = ((actualTemperature - options.min) / deg_per_rad) + arcinfo.start;
        var curr = {
            from: getxy(radius + options.thickness / 2, actual_rads),
            to:   getxy(radius - options.thickness / 2 - 4, actual_rads)
        };

        var min_text = options.simple ? 'off' : options.min + '°c';
        var max_text = options.simple ? 'on' : options.max + '°c';
        var text = current_model.actual_temperature_full() + '°c';

        context.font = '10px ' + font;
        context.textAlign = 'center';
        context.fillStyle = black;
        context.strokeStyle = black;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(start.from.x, start.from.y);
        context.lineTo(start.to.x, start.to.y);
        context.fillText(min_text, start.from.x, start.from.y + 10);
        context.moveTo(end.from.x, end.from.y);
        context.lineTo(end.to.x, end.to.y);
        context.fillText(max_text, end.from.x, end.from.y + 10);
        if (!options.simple && actualTemperature !== options.min && actualTemperature !== options.max) {
            context.moveTo(curr.from.x, curr.from.y);
            context.lineTo(curr.to.x, curr.to.y);

            temp_width = generic.measureText(context, '10px ' + font, text).width;
            var temp_width_half = temp_width / 2;
            curr.to.y += 10;
            var left_part = actualTemperature < (temprange / 2 + options.min);
            if (left_part) {
                while (over_arc({ x: curr.to.x - temp_width_half - 5, y: curr.to.y }) ||
                       over_arc({ x: curr.to.x - temp_width_half - 5, y: curr.to.y - 10 })) {
                    curr.to.x += 1;
                }
            } else {
                while (over_arc({ x: curr.to.x + temp_width_half + 5, y: curr.to.y }) ||
                       over_arc({ x: curr.to.x + temp_width_half + 5, y: curr.to.y  - 10 })) {
                    curr.to.x -= 1;
                }
            }
            context.fillText(text, curr.to.x, curr.to.y);
        }
        context.stroke();
    }

    function get_coordinates(event) {
        var x = 0;
        var y = 0;
        if (event.originalEvent.touches) {
            if (event.originalEvent.touches.length === 1) {
                var offset = canvas.offset();
                x = event.originalEvent.touches[0].pageX - offset.left;
                y = event.originalEvent.touches[0].pageY - offset.top;
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
    function over_arc(coordinates) {
        var overarc = false;
        var oncircle = false;
        var dist = generic.distance(coordinates, center);
        if (dist > (radius - (options.thickness / 2)) && dist < (radius + (options.thickness / 2))) {
            oncircle = true;
        }
        if (oncircle) {
            // We're over the circle part, but are we over the arc? Let's find out
            var rads = Math.atan2(coordinates.y - center.y, coordinates.x - center.x);
            if (rads < 0) {
                rads = Math.PI + (Math.PI + rads);
            }
            var degrees = rad2deg(rads);
            var arcinfo = get_degrees(100);
            if (arcinfo.end > (Math.PI * 2)) {
                arcinfo.end -= (Math.PI * 2);
            }
            if ((rads >= arcinfo.start && rads <= (Math.PI * 2)) ||
                (rads >= 0 && rads <= arcinfo.end)) {
                overarc = true;
            }
        }
        return overarc;
    }
    function deg2rad(degrees) {
        return (degrees * (Math.PI / 180));
    }
    function rad2deg(radians) {
        return (radians * (180 / Math.PI));
    }
    function temp2relrad(temperature) {
        return get_degrees((temperature - options.min) / temprange * 100).end;
    }
};
