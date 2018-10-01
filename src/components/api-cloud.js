/*
 * Copyright (C) 2018 OpenMotics BVBA
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
import {APIGateway} from "./api-gateway";

export class APICloud extends APIGateway {
    constructor(...rest) {
        super(...rest);
    }

    // Overrides
    async login(username, password, extraParameters, options) {
        options = options || {};
        options.method = 'POST';
        let result = await this._execute('v1/authentication/basic/login', undefined, {
            username: username,
            password: password,
            totp: extraParameters.totp,
            accept_terms: extraParameters.acceptTerms
        }, false, options);
        for (let key of Object.keys(result.data)) {
            result.data[key] = result.data[key].toLowerCase();
        }
        Object.assign(result, result.data);
        delete result.data;
        return result;
    }

    // Installations
    async getInstallations(options) {
        options = options || {};
        options.ignoreConnection = true;
        let data = await this._execute('v1/base/installations', undefined, {}, true, options);
        return data.data;
    }

    async addInstallation(registrationKey, options) {
        options = options || {};
        options.method = 'POST';
        let data = await this._execute('v1/base/installations', undefined, {
            registration_key: registrationKey
        }, true, options);
        return data.data;
    }

    // Registration
    async register(firstName, lastName, email, password, registrationKey, options) {
        options = options || {};
        options.method = 'POST';
        return this._execute('v1/base/registration', undefined, {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
            registration_key: registrationKey
        }, false, options);
    }

    // Users
    async getUsers(installationId, options) {
        options = options || {};
        return this._execute('v1/base/users', undefined, {
            installation_id: installationId
        }, true, options);
    }

    async addUser(firstName, lastName, email, password, options) {
        options = options || {};
        options.method = 'POST';
        return this._execute('v1/base/users', undefined, {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        }, true, options);
    }

    async updateUser(id, firstName, lastName, email, password, options) {
        options = options || {};
        options.method = 'PUT';
        return this._execute('v1/base/users/${userId}', id, {
            userId: id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        }, true, options);
    };

    async updateTFA(id, enabled, token, options) {
        options = options || {};
        options.method = 'POST';
        return this._execute('v1/base/users/${userId}/tfa', id, {
            userId: id,
            token: token,
            enabled: enabled
        }, true, options);
    }

    // Roles
    async getRoles(options) {
        options = options || {};
        return this._execute('v1/base/installations/${installationId}/roles', undefined, {}, true, options);
    }

    async addRole(installationId, userId, role, rooms, options) {
        options = options || {};
        options.method = 'POST';
        return this._execute('v1/base/installations/${installationId}/roles', undefined, {
            installation_id: installationId,
            user_id: userId,
            role: role,
            rooms: rooms
        }, true, options);
    }

    async updateRole(id, installationId, userId, role, rooms, options) {
        options = options || {};
        options.method = 'PUT';
        return this._execute('v1/base/installations/${installationId}/roles/${roleId}', id, {
            roleId: id,
            installation_id: installationId,
            user_id: userId,
            role: role,
            rooms: rooms
        }, true, options);
    }

    async removeRole(id, options) {
        options = options || {};
        options.method = 'DELETE';
        return this._execute('v1/base/installations/${installationId}/roles/${roleId}', id, {
            roleId: id
        }, true, options);
    }

    // Rooms
    async getRooms(options) {
        options = options || {};
        return this._execute('v1/base/installations/${installationId}/rooms', undefined, {}, true, options);
    }

    // Apps
    async getStoreApps(options) {
        options = options || {};
        return this._execute('store_plugins', undefined, {}, true, options);
    }
}