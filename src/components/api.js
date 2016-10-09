import "fetch";
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
        this.endpoint = (location.origin.indexOf('localhost') !== -1 ? 'https://openmotics.local.plesetsk.be' : location.origin) + '/';
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
            }
            if (response.status === 401 && !options.ignore401) {
                console.error('Unauthenticated or unauthorized');
                this.router.navigate('logout');
            }
            else {
                try {
                    return response.json()
                        .then(data => {
                            console.error('Error calling API: ' + data.msg);
                            reject(new APIError('error_response', data.msg));
                        })
                        .catch(() => {
                            console.error('Error calling API: ' + response);
                        });
                } catch (error) {
                    console.error('Error calling API: ' + response);
                }
            }
            reject(new APIError('unknown_response', response));
        });
    };

    _call(api, id, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'dedupe', true);
        Toolbox.ensureDefault(options, 'ignore401', false);
        return new Promise((resolve, reject) => {
            let identification = api + (id === undefined ? '' : '_' + id);
            if (this.calls[identification] !== undefined && this.calls[identification].isPending() && options.dedupe) {
                console.warn('Discarding API call to ' + api + ': call pending');
                reject(new APIError('deduplicated', undefined));
            } else {
                let cacheKey = undefined;
                if (options.cache !== undefined) {
                    if (options.cache.clear !== undefined) {
                        for (let entry of options.cache.clear) {
                            this.cache.remove(entry);
                        }
                    }
                    cacheKey = options.cache.key;
                }
                if (cacheKey !== undefined) {
                    let cacheResult = this.cache.get(cacheKey);
                    if (cacheResult !== undefined) {
                        if (cacheResult.expire > Toolbox.getTimestamp()) {
                            resolve(cacheResult.data);
                            return;
                        }
                        this.cache.remove(cacheKey);
                    }
                }
                this.calls[identification] = this.http.fetch(api + this._buildArguments(params, authenticate))
                    .then((result) => {
                        let promise = this._parseResult(result, options);
                        if (cacheKey !== undefined) {
                            promise.then((data) => {
                                this.cache.set(cacheKey, {
                                    data: data,
                                    expire: Toolbox.getTimestamp() + (options.cache.expire || 5000)
                                });
                                return data;
                            });
                        }
                        return promise;
                    })
                    .then(resolve)
                    .catch((error) => {
                        this.calls[identification] = undefined;
                        reject(new APIError('unexpected_failure', error));
                    });
            }
        });
    };

    // General
    isDeduplicated(error) {
        return error.cause === 'deduplicated';
    }

    // Authentication
    login(username, password, options) {
        return this._call('login', undefined, {
            username: username,
            password: password
        }, false, options);
    };

    getUsernames() {
        return this._call('get_usernames', undefined, {}, false, {ignore401: true});
    }

    createUser(username, password) {
        return this._call('create_user', undefined, {
            username: username,
            password: password
        }, false, {ignore401: true});
    }

    removeUser(username) {
        return this._call('remove_user', undefined, {username: username}, false, {ignore401: true});
    }


    // Main API
    getModules(options) {
        return this._call('get_modules', undefined, {}, true, options);
    };

    getStatus(options) {
        return this._call('get_status', undefined, {}, true, options);
    };

    getVersion(options) {
        return this._call('get_version', undefined, {}, true, options);
    };

    getTimezone(options) {
        return this._call('get_timezone', undefined, {}, true, options);
    }

    setTimezone(timezone, options) {
        return this._call('set_timezone', undefined, {
            timezone: timezone
        }, true, options);
    }

    moduleDiscoverStart(options) {
        return this._call('module_discover_start', undefined, {}, true, options);
    }

    moduleDiscoverStop(options) {
        return this._call('module_discover_stop', undefined, {}, true, options);
    }

    moduleDiscoverStatus(options) {
        return this._call('module_discover_status', undefined, {}, true, options)
            .then((result) => {
                return result['running'];
            });
    }

    flashLeds(type, id, options) {
        return this._call('flash_leds', undefined, {
            type: type,
            id: id
        }, true, options);
    }

    // Outputs
    getOutputStatus(options) {
        return this._call('get_output_status', undefined, {}, true, options);
    };

    setOutput(id, on, dimmer, timer, options) {
        return this._call('set_output', id, {
            id: id,
            is_on: on,
            dimmer: dimmer,
            timer: timer
        }, true, options);
    }

    getOutputConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'output_configurations',
            expire: 30000
        };
        return this._call('get_output_configurations', undefined, {fields: fields}, true, options);
    }

    setOutputConfiguration(id, floor, name, timer, type, feedback, options) {
        options = options || {};
        options.cache = {clear: ['output_configurations']};
        return this._call('set_output_configuration', id, {
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
        return this._call('get_last_inputs', undefined, {}, true, options);
    }

    getInputConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'input_configurations',
            expire: 30000
        };
        return this._call('get_input_configurations', undefined, {fields: fields}, true, options);
    }

    setInputConfiguration(id, action, basicActions, name, options) {
        options = options || {};
        options.cache = {clear: ['input_configurations']};
        return this._call('set_input_configuration', id, {
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
        return this._call('do_shutter_' + direction, undefined, {id: id}, true, options);
    }

    getShutterStatus(options) {
        return this._call('get_shutter_status', undefined, {}, true, options);
    }

    getShutterConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'shutter_configurations',
            expire: 30000
        };
        return this._call('get_shutter_configurations', undefined, {fields: fields}, true, options);
    }

    setShutterConfiguration(id, name, timerUp, timerDown, upDownConfig, group1, group2, options) {
        options = options || {};
        options.cache = {clear: ['shutter_configurations']};
        return this._call('set_shutter_configuration', id, {
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

    // Plugins
    getPlugins(options) {
        options = options || {};
        options.cache = {
            key: 'plugins',
            expire: 30000
        };
        return this._call('get_plugins', undefined, {}, true, options);
    }

    getConfigDescription(plugin, options) {
        return this._call('plugins/' + plugin + '/get_config_description', undefined, {}, true, options);
    }

    getConfig(plugin, options) {
        return this._call('plugins/' + plugin + '/get_config', undefined, {}, true, options);
    }

    setConfig(plugin, config, options) {
        return this._call('plugins/' + plugin + '/set_config', undefined, {config: config}, true, options);
    }

    getPluginLogs(plugin, options) {
        options = options || {};
        options.cache = {
            key: 'plugin_logs',
            expire: 5000
        };
        return this._call('get_plugin_logs', undefined, {}, true, options)
            .then((data) => {
                if (data.logs.hasOwnProperty(plugin)) {
                    return data.logs[plugin];
                } else {
                    return [];
                }
            });
    }

    removePlugin(plugin, options) {
        return this._call('remove_plugin', plugin, {name: plugin}, true, options);
    }

    executePluginMethod(plugin, method, parameters, authenticated, options) {
        return this._call('plugins/' + plugin + '/' + method, undefined, parameters, authenticated, options);
    }

    // Thermostats
    getThermostats(options) {
        return this._call('get_thermostat_status', undefined, {}, true, options);
    }

    setCurrentSetpoint(thermostat, temperature, options) {
        return this._call('set_current_setpoint', thermostat.id, {
            thermostat: thermostat,
            temperature: temperature
        }, true, options);
    }

    // Group Actions
    getGroupActionConfigurations(options) {
        options = options || {};
        options.cache = {
            key: 'group_action_configurations',
            expire: 30000
        };
        return this._call('get_group_action_configurations', undefined, {}, true, options)
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
        return this._call('do_group_action', id, {group_action_id: id}, true, options);
    }

    setGroupActionConfiguration(id, name, actions, options) {
        options = options || {};
        options.cache = {clear: ['group_action_configurations']};
        return this._call('set_group_action_configuration', id, {
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
            key: 'output_sensor_configurations',
            expire: 30000
        };
        return this._call('get_sensor_configurations', undefined, {fields: fields}, true, options);
    }

    getSensorTemperatureStatus(options) {
        return this._call('get_sensor_temperature_status', undefined, {}, true, options);
    }

    getSensorHumidityStatus(options) {
        return this._call('get_sensor_humidity_status', undefined, {}, true, options);
    }

    getSensorBrightnessStatus(options) {
        return this._call('get_sensor_brightness_status', undefined, {}, true, options);
    }

    // Energy
    getPowerModules(options) {
        return this._call('get_power_modules', undefined, {}, true, options);
    }

    getRealtimePower(options) {
        return this._call('get_realtime_power', undefined, {}, true, options);
    }

    getPulseCounterConfigurations(options) {
        options = options || {};
        options.cache = {
            key: 'pulse_counter_configurations',
            expire: 30000
        };
        return this._call('get_pulse_counter_configurations', undefined, {}, true, options);
    }

    setPulseCounterConfiguration(id, input, name, options) {
        options = options || {};
        options.cache = {clear: ['pulse_counter_configurations']};
        return this._call('set_pulse_counter_configuration', id, {
            config: JSON.stringify({
                id: id,
                input: input,
                name: name
            })
        }, true, options);
    }
}
