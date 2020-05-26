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
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';

export class Landing extends Base {
    constructor(...rest) {
        super(...rest);
        this.checkAliveTime = 20000;
        this.refresher = new Refresher(async () => {
            if (this.shared.installation !== undefined) {
                await this.shared.installation.checkAlive(this.checkAliveTime);
                if (this.shared.installation.alive && !this.shared.installation.updateLoading) {
                    this.router.navigate('dashboard');
                }
            }
        }, this.checkAliveTime);
        this.installationsLoading = true;
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }

    detached() {
    }
}
