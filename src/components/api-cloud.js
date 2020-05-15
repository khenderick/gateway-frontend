/*
 * Copyright (C) 2018 OpenMotics BV
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
import { APIGateway } from './api-gateway';

export class APICloud extends APIGateway {
    constructor(...rest) {
        super(...rest);
    }

    async _executeV1(api, id, params, authenticate, options) {
        options = options || {};
        options.ignoreInstallationId = true;
        return super._execute(`v1/${api}`, id, params, authenticate, options);
    }

    async contextInformation(options) {
        return this._executeV1('', undefined, {}, true, options);
    }

    // Overrides
    async login(username, password, extraParameters, options) {
        options = options || {};
        options.method = 'POST';
        let result = await this._executeV1('authentication/basic/login', undefined, {
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

    async logout(options) {
        return this._executeV1('authentication/basic/logout', undefined, {}, true, options);
    }

    // Installations
    async getInstallations(options) {
        options = options || {};
        options.ignoreConnection = true;
        let data = await this._executeV1('base/installations', undefined, {}, true, options);
        return data.data;
    }

    // Installations
    async searchInstallations(queryString, options) {
        options = options || {};
        options.ignoreConnection = true;
        let data = await this._executeV1('base/installations/search', undefined, { query: queryString }, true, options);
        return data.data;
    }


    async getInstallation(id, options) {
        options = options || {};
        let data = await this._executeV1(`base/installations/${id}`, id, {}, true, options);
        return data.data;
    }

    async addInstallation(registrationKey, options) {
        options = options || {};
        options.method = 'POST';
        let data = await this._executeV1('base/installations', undefined, {
            registration_key: registrationKey
        }, true, options);
        return data.data;
    }

    async updateInstallation(id, name, options) {
        options = options || {};
        options.method = 'PUT';
        return this._executeV1(`base/installations/${id}`, id, {
            name: name
        }, true, options);
    }

    async checkAlive(options) {
        options = options || {};
        let data = await this._executeV1('base/installations/${installationId}/check_alive', undefined, {}, true, options);
        return data.data
    }

    // Registration
    async register(firstName, lastName, email, password, registrationKey, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/registration', undefined, {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
            registration_key: registrationKey
        }, false, options);
    }

    // Users
    async getUsers(installationId, options) {
        return this._executeV1('base/users', undefined, {
            installation_id: installationId
        }, true, options);
    }

    async addUser(firstName, lastName, email, password, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/users', undefined, {
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        }, true, options);
    }

    async getFilteredUsers(email, options) {
        return this._executeV1('base/users', undefined, {
            email: email
        }, true, options);
    }

    async updateUser(id, firstName, lastName, email, password, options) {
        options = options || {};
        options.method = 'PUT';
        return this._executeV1('base/users/${userId}', id, {
            userId: id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password
        }, true, options);
    }

    async updateTFA(id, enabled, token, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/users/${userId}/tfa', id, {
            userId: id,
            token: token,
            enabled: enabled
        }, true, options);
    }

    // Roles
    async getRoles(options) {
        return this._executeV1('base/installations/${installationId}/roles', undefined, {}, true, options);
    }

    async addRole(installationId, userId, role, roomIds, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/roles', undefined, {
            installation_id: installationId,
            user_id: userId,
            role: role,
            room_ids: roomIds
        }, true, options);
    }

    async updateRole(id, installationId, userId, role, roomIds, options) {
        options = options || {};
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/roles/${roleId}', id, {
            roleId: id,
            installation_id: installationId,
            user_id: userId,
            role: role,
            room_ids: roomIds
        }, true, options);
    }

    async removeRole(id, options) {
        options = options || {};
        options.method = 'DELETE';
        return this._executeV1('base/installations/${installationId}/roles/${roleId}', id, {
            roleId: id
        }, true, options);
    }

    // Lights
    async getLights(filter, options = {}) {
        return this._executeV1('base/installations/${installationId}/outputs?filter=${filter}', undefined, {
            filter: JSON.stringify({
                type: 'LIGHT',
                ...filter,
            }),
        },
            true,
            options,
        );
    }

    
    // Outputs
    async getOutputs(filter = { usage: 'CONTROL' }, options = {}) {
        return this._executeV1('base/installations/${installationId}/outputs?filter=${filter}', undefined, {
            filter: JSON.stringify(filter),
        },
            true,
            options,
        );
    }
    
    async changeOutputValue({ id, value }, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/outputs/${id}/turn_on', id, { id, value },
            true,
            options,
        );
    }

    async toggleOutput(id, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/outputs/${id}/toggle', id, { id },
            true,
            options,
        );
    }

    async changeOutputFloorLocation({ id, floor_id, x, y }, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/outputs/${id}/location', id, {
            id,
            floor_id,
            floor_coordinates: { x, y },
        },
            true,
            options,
        );
    }



    // Shutters
    async getShutters(options = {}) {
        return this._executeV1('base/installations/${installationId}/shutters', undefined, {}, true, options);
    }
    
    async changeShutterDirection({ id, direction }, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/shutters/${id}/change_direction', id, { id, direction }, true, options);
    }
    
    // Floors
    async getFloors(filter, options) {
        return this._executeV1('base/installations/${installationId}/floors?filter=${filter}', undefined, {
            filter: JSON.stringify(filter),
        },
            true,
            options,
        );
    }

    async updateFloor(body, options = {}) {
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/floors/${id}', undefined, body,
            true,
            options,
        );
    }

    async createFloor(body, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/floors', undefined, body,
            true,
            options,
        );
    }

    async removeFloor(id, options = {}) {
        options.method = 'DELETE';
        return this._executeV1('base/installations/${installationId}/floors/${id}', undefined, { id },
            true,
            options,
        );
    }

    async uploadFloorImage(id, file, options = {}) {
        const fileAsBlob = new Blob([file]);
        const blobAsFile = new File([fileAsBlob], file.name, { type: file.type, lastModified: file.lastModifiedDate });
        options.method = 'POST';
        options.headers = {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment;filename="${file.name}"`,
        }
        return this._executeV1(`base/installations/\${installationId}/floors/${id}/picture`, undefined, blobAsFile,
            true,
            options,
        );
    }

    // Rooms
    async getRooms(options) {
        return this._executeV1('base/installations/${installationId}/rooms', undefined, {}, true, options);
    }

    async updateRoom(body, options = {}) {
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/rooms/${id}', undefined, body,
            true,
            options,
        );
    }

    async createRoom(body, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/rooms', undefined, body,
            true,
            options,
        );
    }

    async removeRoom(id, options = {}) {
        options.method = 'DELETE';
        return this._executeV1('base/installations/${installationId}/rooms/${id}', undefined, { id }, true, options);
    }

    // Consumption
    async getLabels(filter, options = {}) {
        return this._executeV1('base/installations/${installationId}/metrics/labels?filter=${filter}', undefined, { filter }, true, options);
    }

    async createLabel(body, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/metrics/labels', undefined, body,
            true,
            options,
        );
    }

    async updateLabel(body, options = {}) {
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/metrics/labels/${id}', undefined, body,
            true,
            options,
        );
    }
    
    async getHistory(data, options = {}) {
        return this._executeV1('base/installations/${installationId}/metrics/labels/${labelId}/historical', data.labelId, data, true, options);
    }

    async getExport(data, options = {}) {
        return this._executeV1(
            'reports/installations/${installationId}/energy/${exportType}/export?start=${start}&end=${end}&type=${type}&download=${download}',
            undefined,
            data,
            true,
            options,
        );
    }

    // Inputs, Labels
    async getPowerInputs(options = {}) {
        return this._executeV1('base/installations/${installationId}/powerinputs', undefined, {}, true, options);
    }

    async setPowerInputsLocation(body, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/powerinputs/${id}/location', undefined, body,
            true,
            options,
        );
    }

    async getLabelInputs(options = {}) {
        return this._executeV1('base/installations/${installationId}/metrics/label_inputs', undefined, {}, true, options);
    }

    async updateLabelInputs(body, options = {}) {
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/metrics/label_inputs/${id}', undefined, body,
            true,
            options,
        );
    }

    async createLabelInput(body, options = {}) {
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/metrics/label_inputs', undefined, body,
            true,
            options,
        );
    }

    // Pulse Counters
    async getPulseCounters(options = {}) {
        return this._executeV1('base/installations/${installationId}/pulsecounters', undefined, {}, true, options);
    }

    async getPulseCounters(options = {}) {
        return this._executeV1('base/installations/${installationId}/pulsecounters', undefined, {}, true, options);
    }

    //Suppliers
    async getSuppliers(options = {}) {
        return this._executeV1('base/installations/${installationId}/suppliers', undefined, {}, true, options);
    }

    // OAuth2
    async getOAuth2Applications(options) {
        return this._executeV1('authentication/oauth2/applications', undefined, {}, true, options);
    }

    async removeOAuth2Application(id, options) {
        options = options || {};
        options.method = 'DELETE';
        return this._executeV1('authentication/oauth2/applications/${applicationId}', id, {
            applicationId: id
        }, true, options);
    }

    async addOAuth2Application(name, userId, grantType, clientType, redirectUris, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('authentication/oauth2/applications', undefined, {
            name: name,
            user_id: userId,
            authorization_grant_type: grantType,
            client_type: clientType,
            redirect_uris: redirectUris
        }, true, options);
    }

    async getOAuth2ApplicationGrants(options) {
        return this._executeV1('authentication/oauth2/application-grants', undefined, {}, true, options);
    }

    async revokeOAuth2ApplicationGrant(id, options) {
        options = options || {};
        options.method = 'DELETE';
        return this._executeV1('authentication/oauth2/application-grants/${grantId}', id, {
            grantId: id
        }, true, options);
    }

    // Apps
    async getStoreApps(options) {
        return this._execute('store_plugins', undefined, {}, true, options);
    }

    // Backups
    async getBackups(options) {
        return this._executeV1('base/installations/${installationId}/backups', undefined, {}, true, options);
    }

    async createBackup(description, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/backups', undefined, {
            description: description
        }, true, options);
    }

    async restoreBackup(id, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/backups/${id}/restore', id, {
            id: id
        }, true, options);
    }

    // Updates
    async getUpdates(options) {
        options = options || {};
        return this._executeV1('base/installations/${installationId}/updates', undefined, {}, true, options);
    }

    async runUpdate(installationId, id, options) {
        options = options || {};
        options.method = 'POST';
        await this._executeV1(`base/installations/${installationId}/updates/${id}/run`, id, {
            id: id
        }, true, options);
    }

    async updateHistory(installationId, options) {
        options = options || {};
        return await this._executeV1(`base/installations/${installationId}/updates/history`, undefined, {}, true, options);
    }

    // Thermostats
    async getThermostatGroups(options) {
        return this._executeV1('base/installations/${installationId}/thermostats/groups', undefined, {}, true, options);
    }

    async getThermostatUnits(options) {
        return this._executeV1('base/installations/${installationId}/thermostats/units', undefined, {}, true, options);
    }

    async setCurrentSetpoint(unitId, setpoint, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/thermostats/units/' + unitId + '/setpoint', unitId, {
            temperature: setpoint
        }, true, options);
    }

    async setThermostatMode(mode, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/thermostats/mode', undefined, {
            mode: mode
        }, true, options);
    }

    async setThermostatState(state, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/thermostats/state', undefined, {
            state: state
        }, true, options);
    }

    async setThermostatPreset(preset, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/thermostats/preset', undefined, {
            preset: preset
        }, true, options);
    }

    async setUnitThermostatPreset(id, preset, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/thermostats/units/${id}/preset', id, { id, preset }, true, options);
    }

    // Event Rules
    async getEventRules(options) {
        return this._executeV1('base/installations/${installationId}/event-rules', undefined,
            {}, true, options);
    }

    async addEventRule(title, message, target, triggerType, triggerId, triggerStatus, options) {
        options = options || {};
        options.method = 'POST';
        return this._executeV1('base/installations/${installationId}/event-rules', undefined, {
            title,
            message,
            target,
            trigger_type: triggerType,
            trigger_id: triggerId,
            trigger_status: triggerStatus,
        }, true, options);
    }

    async updateEventRule(id, title, message, target, triggerType, triggerId, triggerStatus, options) {
        options = options || {};
        options.method = 'PUT';
        return this._executeV1('base/installations/${installationId}/event-rules/${id}', id, {
            id,
            title,
            message,
            target,
            trigger_type: triggerType,
            trigger_id: triggerId,
            trigger_status: triggerStatus,
        }, true, options);
    }

    async removeEventRule(id, options) {
        options = options || {};
        options.method = 'DELETE';
        return this._executeV1('base/installations/${installationId}/event-rules/' + id, id,
            {}, true, options);
    }
}
