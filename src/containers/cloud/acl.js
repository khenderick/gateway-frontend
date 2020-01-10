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
import {Logger} from '../../components/logger';

export class Acl {
    constructor(aclObject) {
        this.aclObject = aclObject;
    }

    hasAccessTo(accessAttributes) {
        try {
            if (Array.isArray(accessAttributes)) {
                for (let accessAttribute of accessAttributes) {
                    if (!this.aclObject[accessAttribute].allowed) {
                        return false;
                    }
                }
                return true;
            }
            return this.aclObject[accessAttributes].allowed;
        } catch (error) {
            Logger.error(`Failed to get acl access attribute ${this.aclObject}: ${error}`)
            return false;
        }
    }
}
