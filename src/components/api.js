import "fetch";
import {HttpClient} from "aurelia-fetch-client";
import {Aurelia, inject} from "aurelia-framework";
import {Router} from "aurelia-router";

@inject(Aurelia, HttpClient, Router)
export class API {
    constructor(aurelia, http, router) {
        //this.endpoint = 'https://openmotics.local.plesetsk.be/';
        //this.endpoint = 'https://openmotics.local.plesetsk.be:8443/';
        this.endpoint = window.origin;
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
        this.calls = {};
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
        return new Promise((resolve, reject) => {
            if (response.status >= 200 && response.status < 400) {
                return response.json()
                    .then(data => {
                        if (data.success === false) {
                            console.error('Error calling API: ' + data.msg);
                            reject(data.msg);
                        }
                        delete data.success;
                        resolve(data);
                    });
            }
            if (response.status === 404) {
                try {
                    return response.json()
                        .then(data => {
                            console.error('Error calling API: ' + data.msg);
                            reject(data.msg);
                        });
                } catch (error) {
                    console.error('Error calling API: ' + response);
                }
            }
            if (response.status === 401) {
                console.error('Unauthenticated or unauthorized');
                this._logout();
            }
            reject(response);
        });
    };

    _call(api, id, params, authenticate) {
        return new Promise((resolve, reject) => {
            let identification = api + (id === undefined ? '' : '_' + id);
            if (this.calls[identification] !== undefined && this.calls[identification].isPending()) {
                console.warn('Discarding API call to ' + api + ': call pending');
                reject();
            } else {
                this.calls[identification] = this.http.fetch(api + this._buildArguments(params, authenticate))
                    .then(this._parseResult)
                    .then(resolve)
                    .catch(reject);
                return this.calls[identification];
            }
        });
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
        return this._call('login', undefined, {
            username: username,
            password: password
        }, false)
            .then(this._login);
    };

    // Main API
    getModules() {
        return this._call('get_modules', undefined, {}, true);
    };

    // Outputs
    getOutputStatus() {
        return this._call('get_output_status', undefined, {}, true);
    };

    setOutput(id, on, dimmer, timer) {
        return this._call('set_output', id, {
            id: id,
            is_on: on,
            dimmer: dimmer,
            timer: timer
        }, true);
    }

    // Inputs
    getLastInputs() {
        return this._call('get_last_inputs', undefined, {}, true);
    }
    getInputConfigurations(fields) {
        return this._call('get_input_configurations', undefined, {fields: fields}, true);
    }
    setInputConfiguration(config) {
        return this._call('set_input_configuration', config.id, {config: config}, true);
    }

    // Configuration
    getOutputConfigurations(fields) {
        return this._call('get_output_configurations', undefined, {fields: fields}, true);
    }

    // Plugins
    getPlugins() {
        return this._call('get_plugins', undefined, {}, true);
    }

    getConfigDescription(plugin) {
        return this._call('plugins/' + plugin + '/get_config_description', undefined, {}, true);
    }

    getConfig(plugin) {
        return this._call('plugins/' + plugin + '/get_config', undefined, {}, true);
    }

    setConfig(plugin, config) {
        return this._call('plugins/' + plugin + '/set_config', undefined, {config: config}, true);
    }

    getPluginLogs(plugin) {
        return this._call('get_plugin_logs', undefined, {}, true)
            .then((data) => {
                if (data.logs.hasOwnProperty(plugin)) {
                    return data.logs[plugin];
                } else {
                    return [];
                }
            });
    }

    removePlugin(plugin) {
        return this._call('remove_plugin', plugin, {name: plugin}, true);
    }

    executePluginMethod(plugin, method, parameters, authenticated) {
        return this._call('plugins/' + plugin + '/' + method, undefined, parameters, authenticated);
    }

    // Thermostats
    getThermostats() {
        return this._call('get_thermostat_status', undefined, {}, true);
    }

    setCurrentSetpoint(thermostat, temperature) {
        return this._call('set_current_setpoint', thermostat.id, {
            thermostat: thermostat,
            temperature: temperature
        }, true);
    }

    // Group Actions
    getGroupActionConfigurations() {
        return this._call('get_group_action_configurations', undefined, {}, true)
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
    doGroupAction(id) {
        return this._call('do_group_action', id, {group_action_id: id}, true);
    }
}
