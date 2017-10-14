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
import {inject} from "aurelia-framework";
import {Router} from "aurelia-router";
import "whatwg-fetch";
import {HttpClient} from "aurelia-fetch-client";
import {Toolbox} from "./toolbox";
import {Storage} from "./storage";
import {PromiseContainer} from "./promises";
import Shared from "./shared";

export class APIError extends Error {
    constructor(cause, message) {
        super(message);
        this.cause = cause;
        this.message = message;
    }
}

@inject(Router)
export class API {
    constructor(router) {
        let apiParts = [Shared.settings.api_root || location.origin];
        if (Shared.settings.api_path) {
            apiParts.push(Shared.settings.api_path);
        }
        this.endpoint = `${apiParts.join('/')}/`;
        this.client_version = 1.0;
        this.router = router;
        this.calls = {};
        this.username = undefined;
        this.password = undefined;
        this.token = Storage.getItem('token');
        this.cache = new Storage('cache');
        this.http = undefined;
        this.id = Toolbox.generateHash(10);
        this.installationId = undefined;
    }

    async _ensureHttp() {
        if (this.http !== undefined) {
            return;
        }
        if (!self.fetch) {
            await System.import('isomorphic-fetch');
        } else {
            await Promise.resolve(self.fetch);
        }
        this.http = new HttpClient();
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
    static _buildArguments(params, installationId) {
        let items = [];
        for (let param in params) {
            if (params.hasOwnProperty(param) && params[param] !== undefined) {
                items.push(`${param}=${params[param] === 'null' ? 'None' : params[param]}`);
            }
        }
        if (installationId !== undefined) {
            items.push(`installation_id=${installationId}`);
        }
        if (items.length > 0) {
            return `?${items.join('&')}`;
        }
        return '';
    };

    static cacheKey(options) {
        if (options.cache === undefined || options.cache.key === undefined) {
            return undefined;
        }
        if (options.installationId === undefined) {
            return options.cache.key;
        }
        return `${options.installationId}_${options.cache.key}`;
    }

    async _rawFetch(api, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'ignore401', false);
        Toolbox.ensureDefault(options, 'ignoreMM', false);
        await this._ensureHttp();
        let headers = {};
        if (authenticate === true && this.token !== undefined && this.token !== null) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        let response = await this.http.fetch(api + API._buildArguments(params, options.installationId), { headers: headers });
        let data = await response.json();
        if (response.status >= 200 && response.status < 400) {
            if (data.success === false) {
                console.error(`Error calling API: ${data.msg || JSON.stringify(data)}`);
                throw new APIError('unsuccessful', data.msg || data);
            }
            delete data.success;
            return data;
        }
        if (response.status === 401) {
            console.error(`Unauthenticated or unauthorized: ${data.msg || JSON.stringify(data)}`);
            if (!options.ignore401) {
                this.router.navigate('logout');
            }
            throw new APIError('unauthenticated', data.msg || data);
        }
        if (response.status === 503) {
            if (data.msg === 'maintenance_mode') {
                if (options.ignoreMM) {
                    delete data.success;
                    return data;
                }
                console.error('Maintenance mode active');
                this.router.navigate('logout');
                throw new APIError('maintenance_mode', 'Maintenance mode active');
            }
            console.error(`Error calling API: ${data.msg || JSON.stringify(data)}`);
            throw new APIError('service_unavailable', data.msg || data);
        }
        console.error(`Unexpected API response: ${data.msg || JSON.stringify(data)}`);
        throw new APIError('unexpected_failure', data.msg || data);
    }

    async _fetch(api, id, params, authenticate, options) {
        let identification = `${api}${id === undefined ? '' : `_${id}`}`;
        if (this.calls[identification] === undefined || !this.calls[identification].isPending) {
            let promiseContainer = new PromiseContainer();
            (async (p, ...args) => {
                try {
                    p.resolve(await this._rawFetch(...args));
                } catch (error) {
                    p.reject(error);
                }
            })(promiseContainer, api, params, authenticate, options);
            this.calls[identification] = promiseContainer;
        }
        return this.calls[identification].promise;
    }

    async _fetchAndCache(options, ...rest) {
        let data = await this._fetch(...rest, options);
        let now = Toolbox.getTimestamp();
        this.cache.set(API.cacheKey(options), {
            version: this.client_version,
            timestamp: now,
            stale: now + (options.cache.stale || 30000),
            expire: 0,
            limit: options.cache.limit || 30000,
            data: data
        });
        return data;
    }

    async _execute(api, id, params, authenticate, options) {
        options = options || {};
        options.installationId = this.installationId;
        if (options.cache !== undefined) {
            let now = Toolbox.getTimestamp();
            let clear = options.cache.clear;
            if (clear !== undefined) {
                for (let key of clear) {
                    let expire = this.cache.get(key);
                    if (expire !== undefined) {
                        expire.stale = now;
                        this.cache.set(key, expire);
                        console.debug(`Marking cache "${key}" as stale`);
                    }
                }
            }
            let key = API.cacheKey(options);
            if (key !== undefined) {
                let data = undefined;
                let refresh = true;
                let cache = this.cache.get(key);
                if (cache !== undefined) {
                    if (cache.version === this.client_version) {
                        if (cache.expire > 0 && now > cache.expire) {
                            console.debug(`Removing cache "${key}": expired`);
                            this.cache.remove(key);
                        } else if (now > cache.stale) {
                            cache.expire = now + cache.limit;
                            this.cache.set(key, cache);
                            data = cache.data;
                        } else {
                            refresh = false;
                            data = cache.data;
                        }
                    } else {
                        console.debug(`Removing cache "${key}": old version`);
                        this.cache.remove(key);
                    }
                }
                if (data !== undefined) {
                    if (refresh) {
                        this._fetchAndCache(options, api, id, params, authenticate).catch(() => {});
                    }
                    return data;
                } else {
                    return this._fetchAndCache(options, api, id, params, authenticate).catch(() => {});
                }
            }
        }
        return this._fetch(api, id, params, authenticate, options);
    }

    // Authentication
    async login(username, password, timeout, options) {
        return this._execute('login', undefined, {
            username: username,
            password: password,
            timeout: timeout
        }, false, options);
    };

    async logout() {
        return this._execute('logout', undefined, {}, true);
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
    async getInstallations(options) {
        return this._execute('get_installations', undefined, {}, true, options);
    };

    async getModules(options) {
        return this._execute('get_modules', undefined, {}, true, options);
    };

    async getStatus(options) {
        return this._execute('get_status', undefined, {}, true, options);
    };

    async getVersion(options) {
        return this._execute('get_version', undefined, {}, true, options);
    };

    async getTimezone(options) {
        return this._execute('get_timezone', undefined, {}, true, options);
    }

    async setTimezone(timezone, options) {
        return this._execute('set_timezone', undefined, {
            timezone: timezone
        }, true, options);
    }

    async moduleDiscoverStart(options) {
        return this._execute('module_discover_start', undefined, {}, true, options);
    }

    async moduleDiscoverStop(options) {
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

    // Outputs
    async getOutputStatus(options) {
        return this._execute('get_output_status', undefined, {}, true, options);
    };

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

    async setOutputConfiguration(id, floor, name, timer, type, room, feedback, options) {
        options = options || {};
        options.cache = {clear: ['output_configurations']};
        return this._execute('set_output_configuration', id, {
            config: JSON.stringify({
                id: id,
                floor: floor,
                name: name,
                timer: timer,
                type: type,
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

    async setInputConfiguration(id, action, basicActions, name, room, options) {
        options = options || {};
        options.cache = {clear: ['input_configurations']};
        return this._execute('set_input_configuration', id, {
            config: JSON.stringify({
                id: id,
                name: name,
                action: action,
                basic_actions: basicActions,
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
        return this._execute('remove_plugin', app, {name: app}, true, options);
    }

    async executeAppMethod(app, method, parameters, authenticated, options) {
        return this._execute(`plugins/${app}/${method}`, undefined, parameters, authenticated, options);
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
        options.cache = {clear: ['get_global_thermostat_configuration']};
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
        options.cache = {key: 'output_sensor_configurations'};
        return this._execute('get_sensor_configurations', undefined, {fields: fields}, true, options);
    }

    async setSensorConfiguration(id, name, offset, room, options) {
        options = options || {};
        options.cache = {clear: ['output_sensor_configurations']};
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
}
