/*
 * Copyright (C) 2019 OpenMotics BV
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
import {WebSocketClient} from './websocket';
import {Toolbox} from './toolbox';
import {Refresher} from './refresher';

export class EventsWebSocketClient extends WebSocketClient {
    constructor(eventTypes, version = 'v1') {
        super('events', version);
        this.eventTypes = eventTypes;
        this.lastEventReceived = 0;
        this._keepalive = new Refresher(async () => {
            await this.send({
                type: 'PING',
                data: null
            });
        }, 5000);
    }

    async _onOpen(...rest) {
        this._keepalive.start();
        return this.updateSubscription();
    }

    async _onClose(...rest) {
        this._keepalive.stop();
    }

    async _onMessage(message) {
        if (!this.eventTypes.contains(message.type)) {
            return null;
        }
        this.lastEventReceived = Toolbox.getTimestamp();
        return message;
    }

    async updateSubscription(eventTypes) {
        if (eventTypes !== undefined) {
            this.eventTypes = eventTypes;
        }
        let data = {
            type: 'ACTION',
            data: {
                action: 'set_subscription',
                types: this.eventTypes
            }
        };
        if (this.shared.target === 'cloud' && this.shared.installation !== undefined) {
            data.data.installation_ids = [this.shared.installation.id];
        }
        return this.send(data);
    }

    isAlive(minInterval) {
        let now = Toolbox.getTimestamp();
        if (this.lastDataReceived < now - (10 * 1000)) {
            return false;
        }
        if (this.lastEventReceived === 0) {
            return false;
        }
        return this.lastEventReceived >= now - (minInterval * 1000);
    }
}


