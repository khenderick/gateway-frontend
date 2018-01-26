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

export class Refresher {
    constructor(callback, interval) {
        this.callback = callback;
        this.interval = interval;
        this.timeout = undefined;
    }

    start() {
        if (this.timeout === undefined) {
            this.timeout = setInterval(this.callback, this.interval);
        }
    }

    stop() {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
            this.timeout = undefined;
        }
    }

    run() {
        let started = this.timeout !== undefined;
        if (started) {
            this.stop();
        }
        this.callback();
        if (started) {
            this.start();
        }
    }

    setInterval(interval) {
        let started = this.timeout !== undefined;
        if (started) {
            this.stop();
        }
        this.interval = interval;
        if (started) {
            this.start();
        }
    }
}
