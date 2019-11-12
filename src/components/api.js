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
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {EventAggregator} from 'aurelia-event-aggregator';
import 'whatwg-fetch';
import {HttpClient} from 'aurelia-fetch-client';
import {Toolbox} from './toolbox';
import {Logger} from './logger';
import {Storage} from './storage';
import {PromiseContainer} from './promises';
import Shared from './shared';

export class APIError extends Error {
    constructor(cause, message) {
        super(message);
        this.cause = cause;
        this.message = message;
    }
}

@inject(EventAggregator, Router)
export class API {
    constructor(ea, router) {
        this.shared = Shared;
        let apiParts = [Shared.settings.api_root || location.origin];
        if (Shared.settings.api_path) {
            apiParts.push(Shared.settings.api_path);
        }
        this.ea = ea;
        this.endpoint = `${apiParts.join('/')}/`;
        this.client_version = 1.1;
        this.router = router;
        this.calls = {};
        this.username = undefined;
        this.password = undefined;
        this.token = Storage.getItem('token');
        this.cache = new Storage('cache');
        this.http = undefined;
        this.id = Toolbox.generateHash(10);
    }

    static async loadHttpClient() {
        if (!self.fetch) {
            await import('isomorphic-fetch');
        } else {
            await Promise.resolve(self.fetch);
        }
        let client = new HttpClient();
        client.configure(config => {
            config.withDefaults({
                credentials: 'omit',
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-store'
            });
        });
        return client;
    }

    async _ensureHttp() {
        if (this.http !== undefined) {
            return;
        }
        this.http = await API.loadHttpClient();
        this.http.configure(config => {
            config.withBaseUrl(this.endpoint);
        });
    }

    // Helper methods
    static _buildArguments(params, options, replacements) {
        let items = [];
        for (let param in params) {
            if (!replacements.contains(param) && params.hasOwnProperty(param) && params[param] !== undefined) {
                items.push(`${param}=${params[param] === 'null' ? 'None' : encodeURIComponent(params[param])}`);
            }
        }
        let installationId = options.installationId;
        if (!replacements.contains('installationId') && !params.hasOwnProperty('installation_id') && !options.ignoreInstallationId && installationId !== undefined) {
            items.push(`installation_id=${installationId}`);
        }
        if (items.length > 0) {
            return `?${items.join('&')}`;
        }
        return '';
    }

    _buildUrl(url, params, options) {
        let replacements = [];
        for (let param in params) {
            if (params.hasOwnProperty(param) && params[param] !== undefined && url.contains('${' + param + '}')) {
                url = url.replace('${' + param + '}', params[param]);
                replacements.push(param);
            }
        }
        if (url.contains('${installationId}')) {
            let installationId = options.installationId;
            if ([null, undefined].contains(installationId)) {
                if (Shared.connection !== false && this.ea !== undefined && !options.ignoreConnection) {
                    Shared.connection = false;
                    this.ea.publish('om:connection', {connection: Shared.connection});
                }
                let message = 'Could not build URL due to missing installation';
                Logger.error(`Error calling API: ${message}`);
                throw new APIError('unsuccessful', message);
            }
            url = url.replace('${installationId}', installationId);
            replacements.push('installationId');
        }
        return [url, replacements]
    }

    static _extractMessage(data) {
        let possibleErrorKeys = {
            _errorCode: true, _error: false,
            msg: false, message: false, error_type: true
        };
        for (let [key, lowerCase] of Object.entries(possibleErrorKeys)) {
            if (data[key] !== undefined) {
                return lowerCase ? data[key].toLowerCase() : data[key];
            }
        }
        return JSON.stringify(data);
    }

    static _cacheKey(options) {
        if (options.cache === undefined || options.cache.key === undefined) {
            return undefined;
        }
        if (options.installationId === undefined) {
            return options.cache.key;
        }
        return `${options.installationId}_${options.cache.key}`;
    }

    static _cacheClearKeys(options) {
        if (options.cache === undefined || options.cache.clear === undefined) {
            return [];
        }
        let keys = [];
        for (let key of options.cache.clear) {
            if (options.installationId === undefined) {
                keys.push(key);
            } else {
                keys.push(`${options.installationId}_${key}`);
            }
        }
        return keys;
    }

    async fileFetch(api, params, authenticate, options) {
      const fetchOptions = {};
      fetchOptions.method = 'POST';
      fetchOptions.headers = {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment;filename="Bedroom-Floor-Plan.jpg"`,
      };
      fetchOptions.headers['Authorization'] = `Bearer ${this.token}`;
      await this.http.fetch(url, fetchOptions);
    }

    async _rawFetch(api, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'ignore401', false);
        Toolbox.ensureDefault(options, 'ignoreMM', false);
        Toolbox.ensureDefault(options, 'ignoreConnection', false);
        Toolbox.ensureDefault(options, 'ignoreInstallationId', false);
        await this._ensureHttp();
        let fetchOptions = {
            headers: {}
        };
        if (options.headers) {
          fetchOptions.headers = { ...options.headers };
        }
        if (authenticate === true && this.token !== undefined && this.token !== null) {
            fetchOptions.headers['Authorization'] = `Bearer ${this.token}`;
        }
        let [url, replacements] = this._buildUrl(api, params, options);
        if (options.method !== undefined) {
            fetchOptions.method = options.method;
        }
        if (['POST', 'PUT'].contains(fetchOptions.method)) {
            if (!(params instanceof File)) {
              Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
              fetchOptions.body = JSON.stringify(params);
            } else {
              fetchOptions.body = params;
            }
        } else {
            url += API._buildArguments(params, options, replacements);
        }
        if (options.timeout !== undefined) {
            let abortController = new AbortController();
            fetchOptions.signal = abortController.signal;
            ((ac) => { window.setTimeout(() => { ac.abort(); }, options.timeout); })(abortController);
        }
        let response = await this.http.fetch(url, fetchOptions);
        let data = await response.text();
        try {
            data = JSON.parse(data);
        } catch (error) {
            data = {msg: data};
        }
        let connection = true;
        let message = '';
        if (response.status >= 200 && response.status < 400) {
            if (data.success === false || ![undefined, null].contains(data._error)) {
                message = API._extractMessage(data);
                if (message === 'gatewaytimeoutexception') {
                    connection = false;
                }
                if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                    Shared.connection = connection;
                    this.ea.publish('om:connection', {connection: Shared.connection});
                }
                Logger.error(`Error calling API: ${message}`);
                throw new APIError('unsuccessful', message);
            }
            if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                Shared.connection = connection;
                this.ea.publish('om:connection', {connection: Shared.connection});
            }
            delete data.success;
            return data;
        }
        if (response.status === 400) {
            message = API._extractMessage(data);
            Logger.error(`Bad request: ${message}`);
            throw new APIError('bad_request', message);
        }
        if (response.status === 401) {
            message = API._extractMessage(data);
            Logger.error(`Unauthenticated: ${message}`);
            if (!options.ignore401) {
                this.router.navigate('logout');
            }
            throw new APIError('unauthenticated', message);
        }
        if (response.status === 403) {
            message = API._extractMessage(data);
            Logger.error(`Forbidden: ${message}`);
            this.shared.setInstallation(undefined);
            throw new APIError('forbidden', message);
        }
        if (response.status === 503) {
            message = API._extractMessage(data);
            if (message === 'maintenance_mode') {
                if (options.ignoreMM) {
                    delete data.success;
                    return data;
                }
                Logger.error('Maintenance mode active');
                this.router.navigate('logout');
                throw new APIError('maintenance_mode', 'Maintenance mode active');
            }
            if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                Shared.connection = connection;
                this.ea.publish('om:connection', {connection: Shared.connection});
            }
            Logger.error(`Error calling API: ${message}`);
            throw new APIError('service_unavailable', message);
        }
        Logger.error(`Unexpected API response: ${message}`);
        throw new APIError('unexpected_failure', message);
    }

    async _fetch(api, id, params, authenticate, cacheClearKeys, options) {
        let identification = `${options.installationId === undefined ? '' : options.installationId}_${api}_${id === undefined ? '' : id}`;
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
        let data = await this.calls[identification].promise;
        for (let [key, reason] of Object.entries(cacheClearKeys)) {
            this.cache.remove(key);
            Logger.debug(`Removing cache "${key}": ${reason}`);
        }
        return data;
    }

    async _fetchAndCache(options, ...rest) {
        let data = await this._fetch(...rest, options);
        let now = Toolbox.getTimestamp();
        this.cache.set(API._cacheKey(options), {
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
        Toolbox.ensureDefault(options, 'installationId', this.shared.installation !== undefined ? this.shared.installation.id : undefined);
        let cacheClearKeys = {};
        if (options.cache !== undefined) {
            let now = Toolbox.getTimestamp();
            for (let key of API._cacheClearKeys(options)) {
                cacheClearKeys[key] = 'obsolete';
            }
            let key = API._cacheKey(options);
            if (key !== undefined) {
                let data = undefined;
                let refresh = true;
                let cache = this.cache.get(key);
                if (cache !== undefined) {
                    if (cache.version === this.client_version) {
                        if (cache.expire > 0 && now > cache.expire) {
                            cacheClearKeys[key] = 'expired';
                        } else if (now > cache.stale) {
                            cache.expire = now + cache.limit;
                            this.cache.set(key, cache);
                            data = cache.data;
                        } else {
                            refresh = false;
                            data = cache.data;
                        }
                    } else {
                        cacheClearKeys[key] = 'old version';
                    }
                }
                if (data !== undefined) {
                    if (refresh) {
                        this._fetchAndCache(options, api, id, params, authenticate, cacheClearKeys).catch(() => {});
                    }
                    return data;
                } else {
                    return this._fetchAndCache(options, api, id, params, authenticate, cacheClearKeys).catch(() => {});
                }
            }
        }
        return this._fetch(api, id, params, authenticate, cacheClearKeys, options);
    }
}
