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
import { inject } from 'aurelia-framework';
import { Logger } from '../../../components/logger';
import { DialogService } from 'aurelia-dialog';
import { Base } from '../../../resources/base';
import { Alert } from 'resources/alert/alert';
import { Refresher } from 'components/refresher';

@inject(DialogService)
export class FloorsAndRooms extends Base {
    constructor(dialogService, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.floors = [];
        this.rooms = [];
        this.newFloor = '';
        this.newRoom = '';
        this.selectedFile = undefined;
        this.editFloor = undefined;
        this.editRoom = undefined;
        this.imageLoading = false;
        this.selectedFloor = undefined;
        this.refresher = new Refresher(() => this.getData(), 5000);
        this.styleSelectedRow = 'background-color: #f5f5f5;';
        this.tableStyles = {
            'box-shadow:': '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
            background: '#fff',
            'border-radius': '4px',
        };
    }

    async getFloors() {
        try {
            const { data } = await this.api.getFloors({ size: 'ORIGINAL' });
            return data;
        } catch (error) {
            Logger.error(`Could not load Floors: ${error.message}`);
            return undefined;
        }
    };

    async getRooms() {
        try {
            const { data } = await this.api.getRooms();
            return data;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
            return undefined;
        }
    };

    async getData() {
        const [floors, rooms] = await Promise.all([this.getFloors(), this.getRooms()]);
        if (floors && rooms) {
            this.rooms = rooms;
            this.floors = floors.map((floor) => {
                const roomsOfFloor = rooms.filter(({ floor_id }) => floor_id === floor.id);
                return {
                    ...floor,
                    rooms: roomsOfFloor,
                    roomsNames: roomsOfFloor.map(({ name }) => name).join(', '),
                    warnings: floor.image.url
                        ? ''
                        : `${this.i18n.tr(`pages.settings.floorsandrooms.table.warnings`)}: ${this.i18n.tr(`pages.settings.floorsandrooms.table.noimageattached`)}`,
                };
            }).sort((a, b) => a.sequence - b.sequence);
        }
    }

    async addNewFloor() {
        if (this.newFloor) {
            try {
                let newId = 0;
                let newSequence = 0;
                this.floors.forEach(({ id, sequence }) => {
                    newId = Math.max(newId, id);
                    newSequence = Math.max(sequence, newSequence);
                });
                const floor = {
                    id: newId + 1,
                    sequence: newSequence + 1,
                    name: this.newFloor,
                };
                await this.api.createFloor(floor);
                this.newFloor = '';
                this.floors.push(floor);
            } catch (error) {
                Logger.error(`Could not add new Floor: ${error.message}`);
            }
        }
    }

    async addNewRoom() {
        if (this.selectedFloor && this.newRoom) {
            try {
                let newId = 0;
                this.rooms.forEach(({ id }) => {
                    newId = Math.max(newId, id);
                });
                const room = {
                    id: newId + 1,
                    name: this.newRoom,
                    floor_id: this.selectedFloor.id,
                };
                await this.api.createRoom(room);
                this.newFloor = '';
                this.rooms.push(room);
                this.selectedFloor.rooms.push(room);
            } catch (error) {
                Logger.error(`Could not add new Room: ${error.message}`);
            }
        }
    }

    async removeFloor(floorId) {
        const model = {
            title: this.i18n.tr('pages.settings.floorsandrooms.table.removefloor'),
            acceptButtonStyle: 'btn-danger',
        }
        this.dialogService.open({ viewModel: Alert, model }).whenClosed(async (response) => {
            if (!response.wasCancelled) {
                try {
                    await this.api.removeFloor(floorId);
                    this.floors = this.floors.filter(({ id }) => id !== floorId);
                    if (this.selectedFloor.id === floorId) {
                        this.selectedFloor = undefined;
                    }
                } catch (error) {
                    Logger.error(`Could not remove Floor: ${error.message}`);
                }
            }
        });
    }

    async removeRoom(roomId) {
        const model = {
            title: this.i18n.tr('pages.settings.floorsandrooms.table.removeRoom'),
            acceptButtonStyle: 'btn-danger',
        }
        this.dialogService.open({ viewModel: Alert, model }).whenClosed(async (response) => {
            if (!response.wasCancelled) {
                try {
                    await this.api.removeRoom(roomId);
                    this.floors.rooms = this.floors.rooms.filter(({ id }) => id !== roomId);
                } catch (error) {
                    Logger.error(`Could not remove Room: ${error.message}`);
                }
            }
        });
    }

    moveUp(i, floor) {
        this.moveItem(i, i - 1, floor);
    }

    moveDown(i, floor) {
        this.moveItem(i, i + 1, floor);
    }

    async uploadImage() {
        if (this.selectedFile) {
            this.imageLoading = true;
            try {
                const { data } = await this.api.uploadFloorImage(this.selectedFloor.id, this.selectedFile);
                this.selectedFloor.image = data[0];
                this.imageLoading = false;
            } catch (error) {
                this.imageLoading = false;
                Logger.error(`Could not upload Floor image: ${error.message}`);
            }
        }
    }

    async moveItem(oldIndex, newIndex, item) {
        try {
            await this.api.updateFloor({
                ...item,
                sequence: this.floors[newIndex].sequence,
            });
            await this.api.updateFloor({
                ...this.floors[newIndex],
                sequence: item.sequence,
            });
            this.floors.splice(oldIndex, 1);
            this.floors.splice(newIndex, 0, item);
        } catch (error) {
            Logger.error(`Could not update Floor: ${error.message}`);
        }
    }

    startEditFloor(floor) {
        this.editFloor = { ...floor };
    }

    startEditRoom(room) {
        this.editRoom = { ...room };
    }

    async saveFloor() {
        const floor = { ...this.editFloor };
        try {
            await this.api.updateFloor(floor);
            const index = this.floors.findIndex(({ id }) => floor.id === id);
            if (index !== -1) {
                this.floors[index].name = floor.name;
            }
        } catch (error) {
            Logger.error(`Could not update Floor: ${error.message}`);
        }
        this.editFloor = undefined;
    }

    async saveRoom() {
        const room = { ...this.editRoom };
        try {
            await this.api.updateRoom(room);
            const index = this.selectedFloor.rooms.findIndex(({ id }) => room.id === id);
            if (index !== -1) {
                this.selectedFloor.rooms[index].name = room.name;
            }
        } catch (error) {
            Logger.error(`Could not update Room: ${error.message}`);
        }
        this.editFloor = undefined;
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
}
