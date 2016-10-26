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
        this.endpoint = (__SETTINGS__.api || location.origin) + '/';
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

    _call(api, id, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'dedupe', true);
        Toolbox.ensureDefault(options, 'ignore401', false);
        Toolbox.ensureDefault(options, 'ignoreMM', false);
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

    // CAN Leds
    getCanLedConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'can_led_configurations',
            expire: 30000
        };
        return this._call('get_can_led_configurations', undefined, {fields: fields}, true, options);
    }

    setCanLedConfiguration(id, feedback, options) {
        options = options || {};
        options.cache = {clear: ['can_led_configurations']};
        return this._call('set_can_led_configuration', id, {
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
    getGlobalThermostatConfiguration(options) {
        options = options || {};
        options.cache = {
            key: 'global_thermostat_configuration',
            expire: 30000
        };
        return this._call('get_global_thermostat_configuration', undefined, {}, true, options);
    }

    setGlobalThermostatConfiguration(outsideSensor, pumpDelay, thresholdTemperature, switchToHeating, switchToCooling, options) {
        options = options || {};
        options.cache = {clear: ['global_thermostat_configuration']};
        return this._call('set_global_thermostat_configuration', undefined, {
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
            key: 'thermostat_configurations',
            expire: 30000
        };
        return this._call('get_thermostat_configurations', undefined, {fields: fields}, true, options);
    }

    getCoolingConfigurations(fields, options) {
        options = options || {};
        options.cache = {
            key: 'cooling_configurations',
            expire: 30000
        };
        return this._call('get_cooling_configurations', undefined, {fields: fields}, true, options);
    }

    getThermostatsStatus(options) {
        return this._call('get_thermostat_status', undefined, {}, true, options);
    }

    setThermostatMode(isOn, isAutomatic, isHeating, setpoint, options){
        options = options || {};
        options.cache = {clear: ['get_global_thermostat_configuration']};
        return this._call('set_thermostat_mode', undefined, {
            thermostat_on: '',
            automatic: isAutomatic,
            setpoint: setpoint,
            cooling_mode: !isHeating,
            cooling_on: isOn
        }, true, options);
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

    setSensorConfiguration(id, name, offset, options) {
        options = options || {};
        options.cache = {clear: ['output_sensor_configurations']};
        return this._call('set_sensor_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                offset: offset
            })
        }, true, options);
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
