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
import {EventAggregator} from "aurelia-event-aggregator";
import "whatwg-fetch";
import {HttpClient} from "aurelia-fetch-client";
import {Toolbox} from "./toolbox";
import {Storage} from "./storage";
import {PromiseContainer} from "./promises";
import Shared from "./shared";
import {API} from './api';

export class APIError extends Error {
    constructor(cause, message) {
        super(message);
        this.cause = cause;
        this.message = message;
    }
}

@inject(EventAggregator, Router)
export class APIBase {
    constructor(ea, router) {
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
        this.target = Shared.target;
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

    static _extractMessage(data) {
        if (data.msg) {
            return data.msg;
        }
        if (data['error_type'] !== undefined) {
            return data['error_type'].toLowerCase();
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

    async _rawFetch(api, params, authenticate, options) {
        options = options || {};
        Toolbox.ensureDefault(options, 'ignore401', false);
        Toolbox.ensureDefault(options, 'ignoreMM', false);
        Toolbox.ensureDefault(options, 'ignoreConnection', false);
        await this._ensureHttp();
        let fetchOptions = {
            headers: {}
        };
        if (authenticate === true && this.token !== undefined && this.token !== null) {
            fetchOptions.headers['Authorization'] = `Bearer ${this.token}`;
        }
        let url = api;
        if (options.method !== 'POST') {
            url += APIBase._buildArguments(params, options.installationId);
        } else {
            Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
            fetchOptions.method = 'POST';
            fetchOptions.body = JSON.stringify(params);
        }
        let response = await this.http.fetch(url, fetchOptions);
        let data = await response.json();
        let connection = true;
        if (response.status >= 200 && response.status < 400) {
            if (data.success === false) {
                let message = APIBase._extractMessage(data);
                if (message === 'gatewaytimeoutexception') {
                    connection = false;
                }
                if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                    Shared.connection = connection;
                    this.ea.publish('om:connection', {connection: Shared.connection});
                    console.info(`We're ${Shared.connection ? 'on' : 'off'}line`);
                }
                console.error(`Error calling API: ${message}`);
                throw new APIError('unsuccessful', message);
            }
            if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                Shared.connection = connection;
                this.ea.publish('om:connection', {connection: Shared.connection});
                console.info(`We're ${Shared.connection ? 'on' : 'off'}line`);
            }
            delete data.success;
            return data;
        }
        if (response.status === 400) {
            let message = APIBase._extractMessage(data);
            console.error(`Bad request: ${message}`);
            throw new APIError('bad_request', message);
        }
        if (response.status === 401) {
            let message = APIBase._extractMessage(data);
            console.error(`Unauthenticated or unauthorized: ${message}`);
            if (!options.ignore401) {
                this.router.navigate('logout');
            }
            throw new APIError('unauthenticated', message);
        }
        if (response.status === 503) {
            let message = APIBase._extractMessage(data);
            if (message === 'maintenance_mode') {
                if (options.ignoreMM) {
                    delete data.success;
                    return data;
                }
                console.error('Maintenance mode active');
                this.router.navigate('logout');
                throw new APIError('maintenance_mode', 'Maintenance mode active');
            }
            if (Shared.connection !== connection && this.ea !== undefined && !options.ignoreConnection) {
                Shared.connection = connection;
                this.ea.publish('om:connection', {connection: Shared.connection});
                console.info(`We're ${Shared.connection ? 'on' : 'off'}line`);
            }
            console.error(`Error calling API: ${message}`);
            throw new APIError('service_unavailable', message);
        }
        console.error(`Unexpected API response: ${message}`);
        throw new APIError('unexpected_failure', message);
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
        this.cache.set(APIBase._cacheKey(options), {
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
            for (let key of APIBase._cacheClearKeys(options)) {
                this.cache.remove(key);
                console.debug(`Removing cache "${key}": obsolete`);
            }
            let key = APIBase._cacheKey(options);
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
}
