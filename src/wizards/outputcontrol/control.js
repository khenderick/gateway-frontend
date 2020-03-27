/*
 * Copyright (C) 2016 OpenMotics BV
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
import {Step} from '../basewizard';
import { Logger } from 'components/logger';

export class OutputControl extends Step {
    constructor(...rest) {
        let data = rest.pop();
        super(...rest);
        this.data = data;
    }

    async onDim({ detail: { value } }) {
        try {
            const { output: { id } } = this.data;
            await this.api.changeOutputValue({ id, value });
        } catch (err) {
            Logger.error(`Could not change a output value: ${err}`);
        }
    }

    async shutterChange(direction) {
        try {
            this.api.changeShutterDirection({ id: this.data.output.id, direction: direction.toUpperCase() });
        } catch (err) {
            Logger.error(`Could not change shutter direction: ${err}`);
        }
    }

    proceed() {
        return true;
    }

    attached() {
        super.attached();
    }
}
