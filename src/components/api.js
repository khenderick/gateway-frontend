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
import "whatwg-fetch";
import {HttpClient} from "aurelia-fetch-client";
import {Toolbox} from "./toolbox";
import {Storage} from "./storage";

export class APIError extends Error {
    constructor(cause, message) {
        super(message);
        this.cause = cause;
        this.message = message;
    }
}

export class API {
    constructor(router) {
        this.endpoint = (__SETTINGS__.api || location.origin) + '/';
        this.client_version = 1.0;
        this.http = new HttpClient();
        this.router = router;
        this.calls = {};
        this.username = undefined;
        this.password = undefined;
        this.token = Storage.getItem('token');
        this.cache = new Storage('cache');

        this.http.configure(config => {
            config
                .withBaseUrl(this.endpoint)
                .withDefaults({
                    credentials: 'omit',
                    headers: {
                        'Accept': 'application/json',
                    },
                    cache: 'no-store'
                });
        });
    }

    // Helper methods
    _buildArguments(params, authenticate) {
        var items = [];
        for (var param in params) {
            if (params.hasOwnProperty(param) && params[param] !== undefined) {
                items.push(param + '=' + (params[param] === 'null' ? 'None' : params[param]));
            }
        }
        if (authenticate === true && this.token !== undefined && this.token !== null) {
            items.push('token=' + this.token);
        }
        if (items.length > 0) {
            return '?' + items.join('&');
        }
        return '';
    };

    _parseResult = (response, options) => {
        options = options || {};
        Toolbox.ensureDefault(options, 'ignore401', false);
        Toolbox.ensureDefault(options, 'ignoreMM', false);
        return new Promise((resolve, reject) => {
            if (response.status >= 200 && response.status < 400) {
                return response.json()
                    .then(data => {
                        if (data.success === false) {
                            console.error('Error calling API: ' + data.msg);
                            reject(new APIError('unsuccessful', data.msg));
                        }
                        delete data.success;
                        resolve(data);
                    });
            } else if (response.status === 401 && !options.ignore401) {
                console.error('Unauthenticated or unauthorized');
                reject(new APIError('unauthenticated', 'Unauthenticated or unauthorized'));
                this.router.navigate('logout');
            } else if (response.status === 503) {
                try {
                    return response.json()
                        .then(data => {
                            if (data.msg === 'maintenance_mode') {
                                if (options.ignoreMM) {
                                    delete data.success;
                                    resolve(data);
                                } else {
                                    console.error('Maintenance mode active');
                                    reject(new APIError('maintenance_mode', 'Maintenance mode active'));
                                    this.router.navigate('logout');
                                }
                            } else {
                                console.error('Error calling API: ' + data.msg);
                                reject(new APIError('service_unavailable', data.msg));
                            }
                        })
                        .catch(() => {
                            console.error('Error calling API: ' + response);
                            reject(new APIError('service_unavailable', response));
                        });
                } catch (error) {
                    console.error('Error calling API: ' + response);
                    reject(new APIError('service_unavailable', response));
                }
            } else {
                try {
                    return response.json()
                        .then(data => {
                            console.error('Error calling API: ' + data.msg);
                            reject(new APIError('error_response', data.msg));
                        })
                        .catch(() => {
                            console.error('Error calling API: ' + response);
                            reject(new APIError('error_response', response));
                        });
                } catch (error) {
                    console.error('Error calling API: ' + response);
                    reject(new APIError('error_response', response));
                }
            }
            reject(new APIError('unknown_response', response));
        });
    };

    _fetch(api, id, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'dedupe', true);
        return new Promise((resolve, reject) => {
            let identification = api + (id === undefined ? '' : '_' + id);
            if (this.calls[identification] !== undefined && this.calls[identification].isPending() && options.dedupe) {
                console.warn('Discarding API call to ' + api + ': call pending');
                reject(new APIError('deduplicated', undefined));
            } else {
                this.calls[identification] = this.http.fetch(api + this._buildArguments(params, authenticate))
                    .then((result) => {
                        return this._parseResult(result, options);
                    })
                    .then(resolve)
                    .catch((error) => {
                        this.calls[identification] = undefined;
                        reject(new APIError('unexpected_failure', error));
                    });
            }
        });
    }

    _load(api, id, params, authenticate, options) {
        options = options || {};
        return new Promise((resolve, reject) => {
            if (options.cache !== undefined) {
                let now = Toolbox.getTimestamp();
                let clear = options.cache.clear;
                if (clear !== undefined) {
                    for (let key of clear) {
                        let expire = this.cache.get(key);
                        if (expire !== undefined) {
                            expire.stale = now;
                            this.cache.set(key, expire);
                            console.debug('Marking cache "' + key + '" as stale');
                        }
                    }
                }
                let key = options.cache.key;
                if (key !== undefined) {
                    let data = undefined;
                    let promise = undefined;
                    let cache = this.cache.get(key);
                    if (cache !== undefined) {
                        if (cache.version === this.client_version) {
                            if (cache.expire > 0 && now > cache.expire) {
                                console.debug('Removing cache "' + key + '": expired');
                                this.cache.remove(key);
                            } else if (now > cache.stale) {
                                console.debug('Refreshing cache "' + key + '"');
                                promise = this._fetch(api, id, params, authenticate, options);
                                cache.expire = now + cache.limit;
                                this.cache.set(key, cache);
                                data = cache.data;
                            } else {
                                data = cache.data;
                            }
                        } else {
                            console.debug('Removing cache "' + key + '": old version');
                            this.cache.remove(key);
                        }
                    }
                    if (data !== undefined) {
                        resolve(data);
                    } else {
                        promise = this._fetch(api, id, params, authenticate, options);
                    }
                    if (promise !== undefined) {
                        promise
                            .then((result) => {
                                let now = Toolbox.getTimestamp();
                                this.cache.set(key, {
                                    version: this.client_version,
                                    timestamp: now,
                                    stale: now + (options.cache.stale || 30000),
                                    expire: 0,
                                    limit: options.cache.limit || 30000,
                                    data: result
                                });
                                if (result === undefined) {
                                    resolve(result);
                                }
                            })
                            .catch((error) => {
                                if (data === undefined) {
                                    reject(error);
                                }
                            });
                    }
                } else {
                    this._fetch(api, id, params, authenticate, options)
                        .then(resolve)
                        .catch(reject);
                }
            } else {
                this._fetch(api, id, params, authenticate, options)
                    .then(resolve)
                    .catch(reject);
            }
        });
    };

    // General
    isDeduplicated(error) {
        return error.cause === 'deduplicated';
    }

    // Authentication
    login(username, password, options) {
        return this._load('login', undefined, {
            username: username,
            password: password
        }, false, options);
    };

    getUsernames() {
        return this._load('get_usernames', undefined, {}, false, {ignore401: true});
    }

    createUser(username, password) {
        return this._load('create_user', undefined, {
            username: username,
            password: password
        }, false, {ignore401: true});
    }

    removeUser(username) {
        return this._load('remove_user', undefined, {username: username}, false, {ignore401: true});
    }


    // Main API
    getModules(options) {
        return this._load('get_modules', undefined, {}, true, options);
    };

    getStatus(options) {
        return this._load('get_status', undefined, {}, true, options);
    };

    getVersion(options) {
        return this._load('get_version', undefined, {}, true, options);
    };

    getTimezone(options) {
        return this._load('get_timezone', undefined, {}, true, options);
    }

    setTimezone(timezone, options) {
        return this._load('set_timezone', undefined, {
            timezone: timezone
        }, true, options);
    }

    moduleDiscoverStart(options) {
        return this._load('module_discover_start', undefined, {}, true, options);
    }

    moduleDiscoverStop(options) {
        return this._load('module_discover_stop', undefined, {}, true, options);
    }

    moduleDiscoverStatus(options) {
        return this._load('module_discover_status', undefined, {}, true, options)
            .then((result) => {
                return result['running'];
            });
    }

    flashLeds(type, id, options) {
        return this._load('flash_leds', undefined, {
            type: type,
            id: id
        }, true, options);
    }

    // Outputs
    getOutputStatus(options) {
        return this._load('get_output_status', undefined, {}, true, options);
    };

    setOutput(id, on, dimmer, timer, options) {
        return this._load('set_output', id, {
            id: id,
            is_on: on,
            dimmer: dimmer,
            timer: timer
        }, true, options);
    }

    getOutputConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'output_configurations'
        };
        return this._load('get_output_configurations', undefined, {fields: fields}, true, options);
    }

    setOutputConfiguration(id, floor, name, timer, type, feedback, options) {
        options = options || {};
        options.cache = {clear: ['output_configurations']};
        return this._load('set_output_configuration', id, {
            config: JSON.stringify({
                id: id,
                floor: floor,
                name: name,
                timer: timer,
                type: type,
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
    getLastInputs(options) {
        return this._load('get_last_inputs', undefined, {}, true, options);
    }

    getInputConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'input_configurations'
        };
        return this._load('get_input_configurations', undefined, {fields: fields}, true, options);
    }

    setInputConfiguration(id, action, basicActions, name, options) {
        options = options || {};
        options.cache = {clear: ['input_configurations']};
        return this._load('set_input_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                action: action,
                basic_actions: basicActions
            })
        }, true, options);
    }

    // Shutters
    doShutter(id, direction, options) {
        return this._load('do_shutter_' + direction, undefined, {id: id}, true, options);
    }

    getShutterStatus(options) {
        return this._load('get_shutter_status', undefined, {}, true, options);
    }

    getShutterConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'shutter_configurations'
        };
        return this._load('get_shutter_configurations', undefined, {fields: fields}, true, options);
    }

    setShutterConfiguration(id, name, timerUp, timerDown, upDownConfig, group1, group2, options) {
        options = options || {};
        options.cache = {clear: ['shutter_configurations']};
        return this._load('set_shutter_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                timer_up: timerUp,
                timer_down: timerDown,
                up_down_config: upDownConfig,
                group_1: group1,
                group_2: group2
            })
        }, true, options);
    }

    // CAN Leds
    getCanLedConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'can_led_configurations'
        };
        return this._load('get_can_led_configurations', undefined, {fields: fields}, true, options);
    }

    setCanLedConfiguration(id, feedback, options) {
        options = options || {};
        options.cache = {clear: ['can_led_configurations']};
        return this._load('set_can_led_configuration', id, {
            config: JSON.stringify({
                id: id,
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

    // Plugins
    getPlugins(options) {
        options = options || {};
        options.cache = {
            key: 'plugins'
        };
        return this._load('get_plugins', undefined, {}, true, options);
    }

    getConfigDescription(plugin, options) {
        return this._load('plugins/' + plugin + '/get_config_description', undefined, {}, true, options);
    }

    getConfig(plugin, options) {
        return this._load('plugins/' + plugin + '/get_config', undefined, {}, true, options);
    }

    setConfig(plugin, config, options) {
        return this._load('plugins/' + plugin + '/set_config', undefined, {config: config}, true, options);
    }

    getPluginLogs(plugin, options) {
        options = options || {};
        options.cache = {
            key: 'plugin_logs',
            stale: 5000
        };
        return this._load('get_plugin_logs', undefined, {}, true, options)
            .then((data) => {
                if (data.logs.hasOwnProperty(plugin)) {
                    return data.logs[plugin];
                } else {
                    return [];
                }
            });
    }

    removePlugin(plugin, options) {
        return this._load('remove_plugin', plugin, {name: plugin}, true, options);
    }

    executePluginMethod(plugin, method, parameters, authenticated, options) {
        return this._load('plugins/' + plugin + '/' + method, undefined, parameters, authenticated, options);
    }

    // Thermostats
    getGlobalThermostatConfiguration(options) {
        options = options || {};
        options.cache = {
            key: 'global_thermostat_configuration'
        };
        return this._load('get_global_thermostat_configuration', undefined, {}, true, options);
    }

    setGlobalThermostatConfiguration(outsideSensor, pumpDelay, thresholdTemperature, switchToHeating, switchToCooling, options) {
        options = options || {};
        options.cache = {clear: ['global_thermostat_configuration']};
        return this._load('set_global_thermostat_configuration', undefined, {
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

    getThermostatConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'thermostat_configurations'
        };
        return this._load('get_thermostat_configurations', undefined, {fields: fields}, true, options);
    }

    getCoolingConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'cooling_configurations'
        };
        return this._load('get_cooling_configurations', undefined, {fields: fields}, true, options);
    }

    getThermostatsStatus(options) {
        return this._load('get_thermostat_status', undefined, {}, true, options);
    }

    setThermostatMode(isOn, isAutomatic, isHeating, setpoint, options) {
        options = options || {};
        options.cache = {clear: ['get_global_thermostat_configuration']};
        return this._load('set_thermostat_mode', undefined, {
            thermostat_on: '',
            automatic: isAutomatic,
            setpoint: setpoint,
            cooling_mode: !isHeating,
            cooling_on: isOn
        }, true, options);
    }

    setCurrentSetpoint(thermostat, temperature, options) {
        return this._load('set_current_setpoint', thermostat.id, {
            thermostat: thermostat,
            temperature: temperature
        }, true, options);
    }

    setThermostatConfiguration(id, schedules, name, output0Id, output1Id, pid, sensorId, setpoints, options) {
        options = options || {};
        options.cache = {clear: ['thermostat_configurations', 'cooling_configurations']};
        return this._load('set_thermostat_configuration', undefined, {
            config: JSON.stringify({
                id: id,
                auto_mon: schedules.monday,
                auto_tue: schedules.thuesday,
                auto_wed: schedules.wednesday,
                auto_thu: schedules.thuesday,
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
                setp5: setpoints['5']
            })
        }, true, options);
    }

    // Group Actions
    getGroupActionConfigurations(options) {
        options = options || {};
        options.cache = {
            key: 'group_action_configurations'
        };
        return this._load('get_group_action_configurations', undefined, {}, true, options)
            .then((data) => {
                let groupActions = [];
                for (let groupAction of data.config) {
                    if (groupAction.name !== '') {
                        groupActions.push(groupAction);
                    }
                }
                data.config = groupActions;
                return data;
            });
    }

    doGroupAction(id, options) {
        return this._load('do_group_action', id, {group_action_id: id}, true, options);
    }

    setGroupActionConfiguration(id, name, actions, options) {
        options = options || {};
        options.cache = {clear: ['group_action_configurations']};
        return this._load('set_group_action_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                actions: actions
            })
        }, true, options);
    }

    // Sensors
    getSensorConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'output_sensor_configurations'
        };
        return this._load('get_sensor_configurations', undefined, {fields: fields}, true, options);
    }

    setSensorConfiguration(id, name, offset, options) {
        options = options || {};
        options.cache = {clear: ['output_sensor_configurations']};
        return this._load('set_sensor_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                offset: offset
            })
        }, true, options);
    }

    getSensorTemperatureStatus(options) {
        return this._load('get_sensor_temperature_status', undefined, {}, true, options);
    }

    getSensorHumidityStatus(options) {
        return this._load('get_sensor_humidity_status', undefined, {}, true, options);
    }

    getSensorBrightnessStatus(options) {
        return this._load('get_sensor_brightness_status', undefined, {}, true, options);
    }

    // Energy
    getPowerModules(options) {
        return this._load('get_power_modules', undefined, {}, true, options);
    }

    getRealtimePower(options) {
        return this._load('get_realtime_power', undefined, {}, true, options);
    }

    getPulseCounterConfigurations(options) {
        options = options || {};
        options.cache = {
            key: 'pulse_counter_configurations'
        };
        return this._load('get_pulse_counter_configurations', undefined, {}, true, options);
    }

    setPulseCounterConfiguration(id, input, name, options) {
        options = options || {};
        options.cache = {clear: ['pulse_counter_configurations']};
        return this._load('set_pulse_counter_configuration', id, {
            config: JSON.stringify({
                id: id,
                input: input,
                name: name
            })
        }, true, options);
    }
}
