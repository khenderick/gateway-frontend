/*
 * Copyright (C) 2017 OpenMotics BVBA
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
import {Toolbox} from "./toolbox";
import {Storage} from "./storage";
import Shared from "./shared";

export class WebSocketController {
    constructor() {
        let apiParts = [Shared.settings.api_root || location.origin, Shared.settings.api_path || ''];
        this.endpoint = `${apiParts.join('/')}/`.replace('http', 'ws');
        this.sockets = {};
        this.id = Toolbox.generateHash(10);
    }

    _buildArguments(params) {
        let items = [];
        for (let param in params) {
            if (params.hasOwnProperty(param) && params[param] !== undefined) {
                items.push(`${param}=${params[param] === 'null' ? 'None' : params[param]}`);
            }
        }
        items.push(`client_id=${this.id}`);
        items.push(`token=${Storage.getItem('token')}`);
        if (items.length > 0) {
            return `?${items.join('&')}`;
        }
        return '';
    };

    async openClient(path, parameters, onMessage, onError) {
        console.debug(`Opening socket to ${path}`);
        parameters = parameters || {};
        let msgPack = await import('msgpack-lite');
        let socket = new WebSocket(`${this.endpoint}ws_metrics${this._buildArguments(parameters)}`);
        socket.binaryType = 'arraybuffer';
        socket.onmessage = (message) => {
            onMessage(msgPack.decode(new Uint8Array(message.data)));
        };
        socket.onerror = () => {
            onError();
        };
        this.sockets[path] = socket;
    }

    closeClient(path) {
        console.debug(`Closing socket to ${path}`);
        this.sockets[path].close(1000, 'Closing socket');
    }
}


