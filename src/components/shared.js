/*
 * Copyright (C) 2019 OpenMotics BVBA
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

class Shared {
    constructor() {
        if (!Shared.instance) {
            this.appIndex = undefined;
            this.locale = undefined;
            this.installation = undefined;
            this.autoLogin = undefined;
            this.navigationGroup = 'installation';

            this.wizards = [];
            this.features = [];
            this.connection = true;
            this.installations = [];

            this.settings = __SETTINGS__;
            this.version = __VERSION__;
            this.isProduction = __ENVIRONMENT__ === 'production';
            this.build = __BUILD__;

            this.setInstallation = () => {};

            switch (this.settings.target || '') {
                case 'cloud':
                    this.target = 'cloud';
                    break;
                case 'gateway':
                default:
                    this.target = 'gateway';
            }

            Shared.instance = this;
        }
        return Shared.instance;
    }
}

const instance = new Shared();
export default instance;
