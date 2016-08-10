import "fetch";
import {HttpClient} from "aurelia-fetch-client";
import {Aurelia, inject} from "aurelia-framework";
import {Router} from "aurelia-router";

@inject(Aurelia, HttpClient, Router)
export class API {
    constructor(aurelia, http, router) {
        this.endpoint = 'https://openmotics.local.plesetsk.be/';
        //this.endpoint = 'https://openmotics.local.plesetsk.be:8443/';
        http.configure(config => {
            config
                .withBaseUrl(this.endpoint)
                .withDefaults({
                    credentials: 'omit',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
        });
        this.router = router;
        this.aurelia = aurelia;
        this.http = http;
        this.token = localStorage.getItem('token');
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

    _parseResult = (response) => {
        if (response.status >= 200 && response.status < 400) {
            return response.json()
                .then(data => {
                    if (data.success === false) {
                        throw data.msg;
                    }
                    delete data.success;
                    return data;
                });
        }
        if (response.status === 404) {
            try {
                response.json()
                    .then(data => {
                        throw data.msg;
                    });
            } catch (error) {
                throw response;
            }
        }
        if (response.status === 401) {
            this._logout();
        }
        throw response;
    };

    _call(api, params, authenticate) {
        return this.http.fetch(api + this._buildArguments(params, authenticate)).then(this._parseResult);
    };

    _logout = () => {
        this.token = undefined;
        localStorage.removeItem('token');
        return this.aurelia.setRoot('login');
    };
    _login = (data) => {
        this.token = data.token;
        localStorage.setItem('token', data.token);
        return this.aurelia.setRoot('index');
    };

    // Authentication
    logout() {
        return this._logout();
    };

    login(username, password) {
        return this._call('login', {
            username: username,
            password: password
        }, false)
            .then(this._login);
    };

    // Main API
    getModules() {
        return this._call('get_modules', {}, true);
    };

    // Outputs
    getOutputStatus() {
        return this._call('get_output_status', {}, true);
    };

    setOutput(id, on, dimmer, timer) {
        return this._call('set_output', {
            id: id,
            is_on: on,
            dimmer: dimmer,
            timer: timer
        }, true);
    }

    // Configuration
    getOutputConfigurations(fields) {
        return this._call('get_output_configurations', {fields: fields}, true)
    }

    // Plugins
    getPlugins() {
        return this._call('get_plugins', {}, true);
    }

    getConfigDescription(plugin) {
        return this._call('plugins/' + plugin + '/get_config_description', {}, true);
    }

    getConfig(plugin) {
        return this._call('plugins/' + plugin + '/get_config', {}, true);
    }

    setConfig(plugin, config) {
        return this._call('plugins/' + plugin + '/set_config', {config: config}, true);
    }

    getPluginLogs(plugin) {
        return this._call('get_plugin_logs', {}, true)
            .then((data) => {
                if (data.logs.hasOwnProperty(plugin)) {
                    return data.logs[plugin];
                } else {
                    return [];
                }
            });
    }

    removePlugin(plugin) {
        return this._call('remove_plugin', {name: plugin}, true);
    }

    executePluginMethod(plugin, method, parameters, authenticated) {
        return this._call('plugins/' + plugin + '/' + method, parameters, authenticated);
    }

    // Thermostats
    getThermostats() {
        return this._call('get_thermostat_status', {}, true);
    }

    setCurrentSetpoint(thermostat, temperature) {
        return this._call('set_current_setpoint', {
            thermostat: thermostat,
            temperature: temperature
        }, true);
    }
}
