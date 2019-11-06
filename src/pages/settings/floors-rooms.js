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
// import { Refresher } from '../../components/refresher';
import { inject } from 'aurelia-framework';
import { Logger } from '../../components/logger';
import { DialogService } from 'aurelia-dialog';
import { Base } from '../../resources/base';

@inject(DialogService)
export class FloorsAndRooms extends Base {
  constructor(dialogService, ...rest) {
    super(...rest);
    this.floors = [];
  }

  loadFloors = async () => {
    try {
      const { data } = await this.api.getFloors({ size: 'SMALL' });
      this.floors = data;
    } catch (error) {
      Logger.error(`Could not load Floors: ${error.message}`);
    }
  };

  // Aurelia
  attached() {
    super.attached();
  }

  activate() {
    this.loadFloors();
  }

  deactivate() {
    // this.refresher.stop();
  }
}
