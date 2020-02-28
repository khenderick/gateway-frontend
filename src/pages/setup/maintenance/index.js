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
import {inject} from 'aurelia-framework';
import $ from 'jquery';
import * as terminal from 'jquery.terminal'; // Make sure the plugin is loaded
import {Base} from '../../../resources/base';
import {MaintenanceWebSocketClient} from '../../../components/websocket-maintenance';
import {Logger} from '../../../components/logger';

@inject()
export class Maintenance extends Base {

    constructor(...rest) {
        super(...rest);
        this.webSocket = new MaintenanceWebSocketClient();
        this.webSocket.onMessage = async (message) => {
            if (this.terminal !== undefined) {
                if (message === this.lastCommand) {
                    return;
                }
                if (message === 'OK' || message.contains('Instruction not found') || message.contains('ERROR ')) {
                    if (message === 'OK') {
                        this.terminal.echo('[[;#00a65a;]OK]');
                    } else {
                        this.terminal.echo(`[[;red;]${message}]`);
                    }
                    this.terminal.resume();
                } else if (message === 'disconnect') {
                    this.disconnect();
                } else {
                    this.terminal.echo(message);
                }
            }
        };
        this.webSocket.onOpen = async () => {
            this.connected = true;
            this.terminal.echo('');
            this.terminal.echo('[[;#00a65a;]Connected]');
            this.terminal.resume();
        };
        this.webSocket._onClose = async () => {
            this.connected = false;
            this.terminal.echo('[[;red;]Disconnected]');
            this.terminal.resume();
        };
        this.terminal = undefined;
        this.buffer = '';
        this.prompt = '[openmotics]$ ';
        this.lastCommand = '';
        this.connected = false;
        this.initVariables();

        this.header = [
            '',
            '  ______                                 __       __              __      __',
            ' /      \\                               /  \\     /  |            /  |    /  |',
            '/OOOOOO  |  ______    ______   _______  MM  \\   /MM |  ______   _tt |_   ii/   _______   _______',
            'OO |  OO | /      \\  /      \\ /       \\ MMM  \\ /MMM | /      \\ / tt   |  /  | /       | /       |',
            'OO |  OO |/pppppp  |/eeeeee  |nnnnnnn  |MMMM  /MMMM |/oooooo  |tttttt/   ii |/ccccccc/ /sssssss/',
            'OO |  OO |pp |  pp |ee    ee |nn |  nn |MM MM MM/MM |oo |  oo |  tt | __ ii |cc |      ss      \\',
            'OO \\__OO |pp |__pp |eeeeeeee/ nn |  nn |MM |MMM/ MM |oo \\__oo |  tt |/  |ii |cc \\_____  ssssss  |',
            'OO    OO/ pp    pp/ ee       |nn |  nn |MM | M/  MM |oo    oo/   tt  tt/ ii |cc       |/     ss/',
            ' OOOOOO/  ppppppp/   eeeeeee/ nn/   nn/ MM/      MM/  oooooo/     tttt/  ii/  ccccccc/ sssssss/',
            '          pp |',
            '          pp |',
            '          pp/',
            '',
            '  Enter \'connect\' to connect to your system',
            '  Enter \'disconnect\' to disconnect again.',
            ''
        ].join('\r\n');
    }

    initVariables() {
    }

    async installationUpdated() {
        this.terminal.pause();
        await this.disconnect();
        this.terminal.echo(this.header);
        this.terminal.resume();
        this.installationHasUpdated = true;
    }

    async connect() {
        try {
            this.webSocket.connect();
        } catch (error) {
            Logger.error(`Could not start websocket for maintenance: ${error}`);
        }
    }

    async disconnect() {
        try {
            await this.webSocket.close();
        } catch (error) {
            Logger.error(`Could not stop websocket for maintenance: ${error}`);
        }
    }

    // Aurelia
    attached() {
        super.attached();
        this.terminal = $('#terminal').terminal(async (command) => {
            this.terminal.pause();
            this.lastCommand = command;
            if (!this.connected) {
                if (this.lastCommand.toLowerCase() === 'connect') {
                    this.terminal.echo('Connecting...');
                    await this.connect();
                } else {
                    this.terminal.echo('[[;red;]Not connected] - Enter \'connect\' to connect to your system');
                    console.log(this.terminal.paused());
                    //this.terminal.resume();
                }
            } else {
                if (['disconnect', 'exit'].contains(this.lastCommand.toLowerCase())) {
                    this.terminal.echo('Disconnecting...');
                    await this.disconnect();
                } else {
                    await this.webSocket.send(this.lastCommand);
                }
            }
        }, {
            prompt: this.prompt,
            greetings: this.header
        });
    }

    detached() {
        super.detached();
        if (this.terminal !== undefined) {
            this.terminal.destroy();
            this.terminal = undefined;
        }
    }

    deactivate() {
        this.webSocket.close();
    }
}
