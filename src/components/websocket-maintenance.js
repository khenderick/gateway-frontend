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

export class MaintenanceWebSocketClient extends WebSocketClient {
    constructor() {
        super('maintenance', 'v1', false);
    }

    async _onOpen(...rest) {
        return this.specifyChannel();
    }

    async specifyChannel() {
        if (this.shared.target === 'cloud' && this.shared.installation !== undefined) {
            if (this.shared.openMoticGateway !== undefined) {
                return this.send(`connect gateway ${this.shared.openMoticGateway.id}`);
            }
            return this.send(`connect ${this.shared.installation.id}`);
        }
    }
}
