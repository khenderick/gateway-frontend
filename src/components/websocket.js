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
import {Storage} from "./storage";
import {Toolbox} from "./toolbox";
import {Logger} from "./logger";
import Shared from "./shared";
import msgPack from "msgpack-lite";

export class WebSocketClient {
    constructor(socketEndpoint) {
        Logger.debug(`Opening ${socketEndpoint} socket`);

        this.shared = Shared;
        this.onOpen = null;
        this.onError = null;
        this.onMessage = null;

        let apiParts = [Shared.settings.api_root || location.origin, Shared.settings.api_path || ''];
        if (Shared.target === 'cloud') {
            this.endpoint = `${apiParts.join('/')}/v1/ws/${socketEndpoint}`;
        } else {
            this.endpoint = `${apiParts.join('/')}/ws_${socketEndpoint}`;
        }
        this.endpoint = this.endpoint.replace('http', 'ws');
        this.name = socketEndpoint;
        this.lastDataReceived = 0;
        this.reconnectFrequency = 1000 * 60;
        this._socket = null;
    }

    connect(parameters) {
        Logger.debug(`Connecting ${this.name} socket`);
        this._socket = new WebSocket(
            `${this.endpoint}${WebSocketClient._buildArguments(parameters)}`,
            [`authorization.bearer.${btoa(Storage.getItem('token')).replace('=', '')}`]
        );
        this._socket.binaryType = 'arraybuffer';
        this._socket.onopen = async (...rest) => {
            Logger.debug(`The ${this.name} socket is connected`);
            this.reconnectFrequency = 2.5;
            await this._onOpen(...rest);
            if (![null, undefined].contains(this.onOpen)) {
                return this.onOpen(...rest);
            }
        };
        this._socket.onerror = async (...rest) => {
            await this._onError(...rest);
            if (![null, undefined].contains(this.onError)) {
                return this.onError(...rest);
            } else {
                Logger.error('Got error event from WebSocket');
            }
        };
        this._socket.onmessage = async (rawMessage) => {
            let message = msgPack.decode(new Uint8Array(rawMessage.data));
            this.lastDataReceived = Toolbox.getTimestamp();
            message = await this._onMessage(message);
            if (message === null) {
                return;
            }
            if (![null, undefined].contains(this.onMessage)) {
                return this.onMessage(message);
            }
        };
        this._socket.onclose = async (...rest) => {
            Logger.debug(`The ${this.name} socket closed.`);
            await this._onClose(...rest);
            this._socket = null;
            await Toolbox.sleep(this.reconnectFrequency);
            this.connect();
        }
    }

    async _onOpen(...rest) {
    }

    async _onError(...rest) {
    }

    async _onClose(...rest) {
    }

    async _onMessage(message) {
        return message;
    }

    static _buildArguments(params) {
        let items = [];
        for (let param in params) {
            if (params.hasOwnProperty(param) && params[param] !== undefined) {
                items.push(`${param}=${params[param] === 'null' ? 'None' : params[param]}`);
            }
        }
        if (items.length > 0) {
            return `?${items.join('&')}`;
        }
        return '';
    }

    async send(data) {
        if (this._socket !== null) {
            return this._socket.send(msgPack.encode(data));
        }
    }

    async close() {
        if (this._socket !== null) {
            return this._socket.close(1000, 'Closing socket');
        }
    }
}


