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
import { inject } from 'aurelia-framework';
import { Logger } from 'components/logger';
import { DialogService } from 'aurelia-dialog';
import { Base } from 'resources/base';
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
        this.loading = false;
        this.selectedFile = undefined;
        this.editFloor = undefined;
        this.editRoom = undefined;
        this.working = false;
        this.imageLoading = false;
        this.removingFloorId = undefined;
        this.removingRoomId = undefined;
        this.selectedFloor = undefined;
        this.refresher = new Refresher(() => {
            if (this.removingFloorId || this.removingRoomId) {
                return;
            }
            this.getData();
        }, 5000);
    }

    async getFloors() {
        try {
            const { data } = await this.api.getFloors({ size: 'MEDIUM' }, {}, '1.1');
            return data;
        } catch (error) {
            Logger.error(`Could not load Floors: ${error.message}`);
            return undefined;
        }
    };

    async getRooms() {
        try {
            const { data } = await this.api.getRooms({}, '1.1');
            return data;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
            return undefined;
        }
    };

    async getData() {
        const [floors, rooms = []] = await Promise.all([this.getFloors(), this.getRooms()]);
        if (floors && rooms && !this.loading) {
            this.rooms = Array.isArray(rooms) ? rooms : [rooms];
            this.floors = floors.map((floor) => {
                const roomsOfFloor = this.rooms.filter(({ floor_id }) => floor_id === floor.id);
                return {
                    ...floor,
                    rooms: roomsOfFloor,
                    roomsNames: roomsOfFloor.map(({ name }) => name).join(', '),
                    warnings: floor?.image?.url
                        ? ''
                        : `${this.i18n.tr(`pages.setup.floorsandrooms.table.warnings`)}: ${this.i18n.tr(`pages.setup.floorsandrooms.table.noimageattached`)}`,
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
                    rooms: [],
                    roomsNames: [],
                };
                await this.api.createFloor(floor, {}, '1.1');
                this.newFloor = '';
                this.floors.push(floor);
                this.selectedFloor = floor;
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
                await this.api.createRoom(room, {}, '1.1');
                this.newRoom = '';
                this.rooms.push(room);
                this.selectedFloor.rooms.push(room);
            } catch (error) {
                Logger.error(`Could not add new Room: ${error.message}`);
            }
        }
    }

    async removeFloor(floorId) {
        try {
            this.removingFloorId = floorId;
            this.working = true;
            await this.api.removeFloor(floorId, {}, '1.1');
            this.floors = this.floors.filter(({ id }) => id !== floorId);
            if (this.selectedFloor.id === floorId) {
                this.selectedFloor = undefined;
            }
            const results = await Promise.all(this.rooms.filter(({ floor_id }) => floor_id === floorId).map(({ id }) => this.removeRoom(id)));
            this.working = false;
            this.removingFloorId = undefined;
        } catch (error) {
            this.working = false;
            this.removingFloorId = undefined;
            Logger.error(`Could not remove Floor: ${error.message}`);
        }
    }

    async removeRoom(roomId) {
        try {
            this.removingRoomId = roomId;
            this.working = true;
            await this.api.removeRoom(roomId, {}, '1.1');
            this.selectedFloor.rooms = this.selectedFloor.rooms.filter(({ id }) => id !== roomId);
            this.working = false;
            this.removingRoomId = undefined;
        } catch (error) {
            this.working = false;
            this.removingRoomId = undefined;
            Logger.error(`Could not remove Room: ${error.message}`);
        }
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
                const { data } = await this.api.uploadFloorImage(
                    this.selectedFloor.id,
                    this.selectedFile,
                    {},
                    '1.1'
                );
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
            this.loading = true;
            const nextSequence = this.floors[newIndex].sequence;
            await this.api.updateFloor({
                ...item,
                sequence: nextSequence,
            }, {}, '1.1');
            const prevSequence = item.sequence;
            await this.api.updateFloor({
                ...this.floors[newIndex],
                sequence: prevSequence,
            }, {}, '1.1');

            item.sequence = nextSequence;
            this.floors.splice(oldIndex, 1);
            this.floors.splice(newIndex, 0, item);
            this.floors[oldIndex].sequence = prevSequence;

            this.loading = false;
        } catch (error) {
            this.loading = false;
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
            await this.api.updateFloor(floor, {}, '1.1');
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
            await this.api.updateRoom(room, {}, '1.1');
            const index = this.selectedFloor.rooms.findIndex(({ id }) => room.id === id);
            if (index !== -1) {
                this.selectedFloor.rooms[index].name = room.name;
            }
        } catch (error) {
            Logger.error(`Could not update Room: ${error.message}`);
        }
        this.editFloor = undefined;
    }

    handleFloorKeypress($event) {
        if ($event.key === 'Enter' ) {
            this.addNewFloor();
        }
        return true;
    }

    handleRoomKeypress($event) {
        if ($event.key === 'Enter' ) {
            this.addNewRoom();
        }
        return true;
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
