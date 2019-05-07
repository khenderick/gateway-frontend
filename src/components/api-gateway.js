/*
 * Copyright (C) 2016 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {API} from "./api";

export class APIGateway extends API {
    constructor(...rest) {
        super(...rest);
    }

    // Authentication
    async login(username, password, extraParameters, options) {
        return this._execute('login', undefined, {
            username: username,
            password: password,
            timeout: extraParameters.timeout,
            accept_terms: extraParameters.acceptTerms
        }, false, options);
    }

    async logout(options) {
        return this._execute('logout', undefined, {}, true, options);
    }

    async getUsernames() {
        return this._execute('get_usernames', undefined, {}, false, {ignore401: true});
    }

    async createUser(username, password) {
        return this._execute('create_user', undefined, {
            username: username,
            password: password
        }, false, {ignore401: true});
    }

    async removeUser(username) {
        return this._execute('remove_user', undefined, {username: username}, false, {ignore401: true});
    }

    // Main API
    async getFeatures(options) {
        let data = await this._execute('get_features', undefined, {}, true, options);
        return data.features;
    }

    async getModules(options) {
        return this._execute('get_modules', undefined, {}, true, options);
    }

    async getStatus(options) {
        return this._execute('get_status', undefined, {}, true, options);
    }

    async getVersion(options) {
        return this._execute('get_version', undefined, {}, true, options);
    }

    async getTimezone(options) {
        options = options || {};
        options.cache = {key: 'timezone'};
        return this._execute('get_timezone', undefined, {}, true, options);
    }

    async setTimezone(timezone, options) {
        options = options || {};
        options.cache = {clear: ['timezone']};
        return this._execute('set_timezone', undefined, {
            timezone: timezone
        }, true, options);
    }

    async moduleDiscoverStart(options) {
        return this._execute('module_discover_start', undefined, {}, true, options);
    }

    async moduleDiscoverStop(options) {
        options = options || {};
        options.cache = {clear: [
            'output_configurations', 'input_configurations', 'shutter_configurations', 'can_led_configurations',
            'global_thermostat_configuration', 'thermostat_configurations', 'cooling_configurations',
            'group_action_configurations', 'sensor_configurations', 'pulse_counter_configurations'
        ]};
        return this._execute('module_discover_stop', undefined, {}, true, options);
    }

    async moduleDiscoverStatus(options) {
        let result = await this._execute('module_discover_status', undefined, {}, true, options);
        return result['running'];
    }

    async flashLeds(type, id, options) {
        return this._execute('flash_leds', undefined, {
            type: type,
            id: id
        }, true, options);
    }

    // Generic
    async doBasicAction(type, number, options) {
        return this._execute('do_basic_action', undefined, {
            action_type: type,
            action_number: number
        }, true, options);
    }

    // Rooms
    async getRooms(options) {
        let room = await this._execute('get_room_configurations', undefined, {}, true, options);
        return {
            data: room.config.map((room) => {
                return {
                    id: room.id,
                    floor_id: room.floor,
                    name: room.name
                }
            })
        }
    }

    // Outputs
    async getOutputStatus(options) {
        return this._execute('get_output_status', undefined, {}, true, options);
    }

    async setOutput(id, on, dimmer, timer, options) {
        return this._execute('set_output', id, {
            id: id,
            is_on: on,
            dimmer: dimmer,
            timer: timer
        }, true, options);
    }

    async getOutputConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'output_configurations'};
        return this._execute('get_output_configurations', undefined, {fields: fields}, true, options);
    }

    async setOutputConfiguration(id, floor, name, timer, type, moduleType, room, feedback, options) {
        options = options || {};
        options.cache = {clear: ['output_configurations']};
        return this._execute('set_output_configuration', id, {
            config: JSON.stringify({
                id: id,
                floor: floor,
                name: name,
                timer: timer,
                type: type,
                module_type: moduleType,
                room: room,
                can_led_1_id: feedback[0][0],
                can_led_1_function: feedback[0][1],
                can_led_2_id: feedback[1][0],
                can_led_2_function: feedback[1][1],
                can_led_3_id: feedback[2][0],
                can_led_3_function: feedback[2][1],
                can_led_4_id: feedback[3][0],
                can_led_4_function: feedback[3][1]
            })
        }, true, options);
    }

    // Inputs
    async getLastInputs(options) {
        return this._execute('get_last_inputs', undefined, {}, true, options);
    }

    async getInputConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'input_configurations'};
        return this._execute('get_input_configurations', undefined, {fields: fields}, true, options);
    }

    async setInputConfiguration(id, moduleType, action, basicActions, name, invert, can, room, options) {
        options = options || {};
        options.cache = {clear: ['input_configurations']};
        return this._execute('set_input_configuration', id, {
            config: JSON.stringify({
                id: id,
                module_type: moduleType,
                name: name,
                action: action,
                basic_actions: basicActions,
                invert: invert,
                can: can,
                room: room
            })
        }, true, options);
    }

    // Shutters
    async doShutter(id, direction, options) {
        return this._execute(`do_shutter_${direction}`, undefined, {id: id}, true, options);
    }

    async getShutterStatus(options) {
        return this._execute('get_shutter_status', undefined, {}, true, options);
    }

    async getShutterConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'shutter_configurations'};
        return this._execute('get_shutter_configurations', undefined, {fields: fields}, true, options);
    }

    async setShutterConfiguration(id, name, timerUp, timerDown, upDownConfig, group1, group2, room, options) {
        options = options || {};
        options.cache = {clear: ['shutter_configurations']};
        return this._execute('set_shutter_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                timer_up: timerUp,
                timer_down: timerDown,
                up_down_config: upDownConfig,
                group_1: group1,
                group_2: group2,
                room: room
            })
        }, true, options);
    }

    // CAN Leds
    async getCanLedConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'can_led_configurations'};
        return this._execute('get_can_led_configurations', undefined, {fields: fields}, true, options);
    }

    async setCanLedConfiguration(id, room, feedback, options) {
        options = options || {};
        options.cache = {clear: ['can_led_configurations']};
        return this._execute('set_can_led_configuration', id, {
            config: JSON.stringify({
                id: id,
                room: room,
                can_led_1_id: feedback[0][0],
                can_led_1_function: feedback[0][1],
                can_led_2_id: feedback[1][0],
                can_led_2_function: feedback[1][1],
                can_led_3_id: feedback[2][0],
                can_led_3_function: feedback[2][1],
                can_led_4_id: feedback[3][0],
                can_led_4_function: feedback[3][1]
            })
        }, true, options);
    }

    // Apps
    async getApps(options) {
        options = options || {};
        options.cache = {key: 'apps'};
        return this._execute('get_plugins', undefined, {}, true, options);
    }

    async installApp(name, options) {
        options = options || {};
        options.cache = {clear: ['apps']};
        return this._execute('install_plugin', undefined, { name: name }, true, options);
    }

    async getConfigDescription(app, options) {
        return this._execute(`plugins/${app}/get_config_description`, undefined, {}, true, options);
    }

    async getConfig(app, options) {
        return this._execute(`plugins/${app}/get_config`, undefined, {}, true, options);
    }

    async setConfig(app, config, options) {
        return this._execute(`plugins/${app}/set_config`, undefined, {config: config}, true, options);
    }

    async getAppLogs(app, options) {
        options = options || {};
        options.cache = {
            key: 'app_logs',
            stale: 5000
        };
        let data = await this._execute('get_plugin_logs', undefined, {}, true, options);
        if (data.logs.hasOwnProperty(app)) {
            return data.logs[app];
        } else {
            return [];
        }
    }

    async removeApp(app, options) {
        options = options || {};
        options.cache = {clear: ['apps']};
        return this._execute('remove_plugin', app, {name: app}, true, options);
    }

    async executeAppMethod(app, method, parameters, authenticated, options) {
        return this._execute(`plugins/${app}/${method}`, undefined, parameters, authenticated, options);
    }

    async startApp(app, options) {
        options = options || {};
        options.cache = {clear: ['apps']};
        return this._execute('start_plugin', app, {name: app}, true, options);
    }

    async stopApp(app, options) {
        options = options || {};
        options.cache = {clear: ['apps']};
        return this._execute('stop_plugin', app, {name: app}, true, options);
    }

    // Thermostats
    async getGlobalThermostatConfiguration(options) {
        options = options || {};
        options.cache = {key: 'global_thermostat_configuration'};
        return this._execute('get_global_thermostat_configuration', undefined, {}, true, options);
    }

    async setGlobalThermostatConfiguration(outsideSensor, pumpDelay, thresholdTemperature, switchToHeating, switchToCooling, options) {
        options = options || {};
        options.cache = {clear: ['global_thermostat_configuration']};
        return this._execute('set_global_thermostat_configuration', undefined, {
            config: JSON.stringify({
                outside_sensor: outsideSensor,
                pump_delay: pumpDelay,
                threshold_temp: thresholdTemperature,
                switch_to_heating_output_0: switchToHeating[0][0],
                switch_to_heating_value_0: switchToHeating[0][1],
                switch_to_heating_output_1: switchToHeating[1][0],
                switch_to_heating_value_1: switchToHeating[1][1],
                switch_to_heating_output_2: switchToHeating[2][0],
                switch_to_heating_value_2: switchToHeating[2][1],
                switch_to_heating_output_3: switchToHeating[3][0],
                switch_to_heating_value_3: switchToHeating[3][1],
                switch_to_cooling_output_0: switchToCooling[0][0],
                switch_to_cooling_value_0: switchToCooling[0][1],
                switch_to_cooling_output_1: switchToCooling[1][0],
                switch_to_cooling_value_1: switchToCooling[1][1],
                switch_to_cooling_output_2: switchToCooling[2][0],
                switch_to_cooling_value_2: switchToCooling[2][1],
                switch_to_cooling_output_3: switchToCooling[3][0],
                switch_to_cooling_value_3: switchToCooling[3][1]
            })
        }, true, options);
    }

    async getThermostatConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'thermostat_configurations'};
        return this._execute('get_thermostat_configurations', undefined, {fields: fields}, true, options);
    }

    async getCoolingConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'cooling_configurations'};
        return this._execute('get_cooling_configurations', undefined, {fields: fields}, true, options);
    }

    async getThermostatsStatus(options) {
        return this._execute('get_thermostat_status', undefined, {}, true, options);
    }

    async setThermostatMode(isOn, isAutomatic, isHeating, setpoint, options) {
        options = options || {};
        options.cache = {clear: ['global_thermostat_configuration']};
        return this._execute('set_thermostat_mode', undefined, {
            thermostat_on: isOn,
            automatic: isAutomatic,
            setpoint: setpoint,
            cooling_mode: !isHeating,
            cooling_on: isOn
        }, true, options);
    }

    async setCurrentSetpoint(thermostat, temperature, options) {
        return this._execute('set_current_setpoint', thermostat.id, {
            thermostat: thermostat,
            temperature: temperature
        }, true, options);
    }

    async setThermostatConfiguration(id, schedules, name, output0Id, output1Id, pid, sensorId, room, setpoints, options) {
        return this._setThermostatConfiguration(true, id, schedules, name, output0Id, output1Id, pid, sensorId, room, setpoints, options);
    }

    async setCoolingConfiguration(id, schedules, name, output0Id, output1Id, pid, sensorId, room, setpoints, options) {
        return this._setThermostatConfiguration(false, id, schedules, name, output0Id, output1Id, pid, sensorId, room, setpoints, options);
    }

    async _setThermostatConfiguration(heating, id, schedules, name, output0Id, output1Id, pid, sensorId, room, setpoints, options) {
        options = options || {};
        options.cache = {clear: ['thermostat_configurations', 'cooling_configurations']};
        return this._execute(`set_${heating ? 'thermostat' : 'cooling'}_configuration`, id, {
            config: JSON.stringify({
                id: id,
                auto_mon: schedules.monday,
                auto_tue: schedules.tuesday,
                auto_wed: schedules.wednesday,
                auto_thu: schedules.thursday,
                auto_fri: schedules.friday,
                auto_sat: schedules.saturday,
                auto_sun: schedules.sunday,
                name: name,
                output0: output0Id,
                output1: output1Id,
                pid_p: pid.P,
                pid_i: pid.I,
                pid_d: pid.D,
                pid_int: pid.int,
                sensor: sensorId,
                setp0: setpoints['0'],
                setp1: setpoints['1'],
                setp2: setpoints['2'],
                setp3: setpoints['3'],
                setp4: setpoints['4'],
                setp5: setpoints['5'],
                room: room
            })
        }, true, options);
    }

    async getPumpGroupConfigurations(options) {
        options = options || {};
        options.cache = {key: 'pump_group_configurations'};
        return this._execute('get_pump_group_configurations', undefined, {}, true, options);
    }

    async setPumpGroupconfiguration(id, output, outputs, room, options) {
        options = options || {};
        options.cache = {clear: ['pump_group_configurations']};
        return this._execute('set_pump_group_configuration', undefined, {
            config: JSON.stringify({
                id: id,
                output: output || 255,
                outputs: outputs.join(','),
                room: room
            })
        }, true, options);
    }

    async getCoolingPumpGroupConfigurations(options) {
        options = options || {};
        options.cache = {key: 'cooling_pump_group_configurations'};
        return this._execute('get_cooling_pump_group_configurations', undefined, {}, true, options);
    }

    async setCoolingPumpGroupconfiguration(id, output, outputs, room, options) {
        options = options || {};
        options.cache = {clear: ['cooling_pump_group_configurations']};
        return this._execute('set_cooling_pump_group_configuration', undefined, {
            config: JSON.stringify({
                id: id,
                output: output || 255,
                outputs: outputs.join(','),
                room: room
            })
        }, true, options);
    }

    // Group Actions
    async getGroupActionConfigurations(options) {
        options = options || {};
        options.cache = {key: 'group_action_configurations'};
        let data = await this._execute('get_group_action_configurations', undefined, {}, true, options);
        let groupActions = [];
        for (let groupAction of data.config) {
            if (groupAction.name !== '') {
                groupActions.push(groupAction);
            }
        }
        data.config = groupActions;
        return data;
    }

    async doGroupAction(id, options) {
        return this._execute('do_group_action', id, {group_action_id: id}, true, options);
    }

    async setGroupActionConfiguration(id, name, actions, options) {
        options = options || {};
        options.cache = {clear: ['group_action_configurations']};
        return this._execute('set_group_action_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                actions: actions
            })
        }, true, options);
    }

    // Sensors
    async getSensorConfigurations(fields, options) {
        options = options || {};
        options.cache = {key: 'sensor_configurations'};
        return this._execute('get_sensor_configurations', undefined, {fields: fields}, true, options);
    }

    async setSensorConfiguration(id, name, offset, room, options) {
        options = options || {};
        options.cache = {clear: ['sensor_configurations']};
        return this._execute('set_sensor_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                offset: offset,
                room: room
            })
        }, true, options);
    }

    async getSensorTemperatureStatus(options) {
        return this._execute('get_sensor_temperature_status', undefined, {}, true, options);
    }

    async getSensorHumidityStatus(options) {
        return this._execute('get_sensor_humidity_status', undefined, {}, true, options);
    }

    async getSensorBrightnessStatus(options) {
        return this._execute('get_sensor_brightness_status', undefined, {}, true, options);
    }

    // Energy
    async getPowerModules(options) {
        options = options || {};
        options.cache = {key: 'power_modules'};
        return this._execute('get_power_modules', undefined, {}, true, options);
    }

    async getRealtimePower(options) {
        return this._execute('get_realtime_power', undefined, {}, true, options);
    }

    async getPulseCounterConfigurations(options) {
        options = options || {};
        options.cache = {key: 'pulse_counter_configurations'};
        return this._execute('get_pulse_counter_configurations', undefined, {}, true, options);
    }

    async setPulseCounterConfiguration(id, input, name, room, options) {
        options = options || {};
        options.cache = {clear: ['pulse_counter_configurations']};
        return this._execute('set_pulse_counter_configuration', id, {
            config: JSON.stringify({
                id: id,
                input: input,
                name: name,
                room: room
            })
        }, true, options);
    }

    async energyDiscoverStart(options) {
        return this._execute('start_power_address_mode', undefined, {}, true, options);
    }

    async energyDiscoverStop(options) {
        options = options || {};
        options.cache = {clear: ['power_modules']};
        return this._execute('stop_power_address_mode', undefined, {}, true, options);
    }

    async energyDiscoverStatus(options) {
        let result = await this._execute('in_power_address_mode', undefined, {}, true, options);
        return result['address_mode'];
    }

    // Settings
    async getSettings(settings, options) {
        return this._execute('get_settings', undefined, {
            settings: JSON.stringify(settings)
        }, true, options)
    }

    async setSetting(setting, value, options) {
        return this._execute('set_setting', undefined, {
            setting: setting,
            value: JSON.stringify(value)
        }, true, options)
    }

    // Schedules
    async listSchedules(options) {
        options = options || {};
        options.cache = {key: ['schedules']};
        let data = await this._execute('list_schedules', undefined, {}, true, options);
        return {'schedules': data.schedules.filter(s => s['schedule_type'] !== 'MIGRATION')}
    }

    async removeSchedule(id, options) {
        options = options || {};
        options.cache = {clear: ['schedules']};
        return this._execute('remove_schedule', undefined, {
            schedule_id: id
        }, true, options);
    }

    async addSchedule(name, start, scheduleType, scheduleArguments, repeat, duration, end, options) {
        options = options || {};
        options.cache = {clear: ['schedules']};
        return this._execute('add_schedule', undefined, {
            name: name,
            start: start,
            schedule_type: scheduleType,
            arguments: [null, undefined].contains(scheduleArguments) ? undefined : JSON.stringify(scheduleArguments),
            repeat: [null, undefined].contains(repeat) ? undefined : JSON.stringify(repeat),
            duration: duration,
            end: end
        }, true, options);
    }
}
