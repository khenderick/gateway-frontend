/*
 * Copyright (C) 2017 OpenMotics BVBA
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
import {Container, computedFrom} from 'aurelia-framework';
import {I18N} from "aurelia-i18n";
import {Led} from "../containers/led";
import {BaseObject} from "./baseobject";
import {Logger} from "../components/logger";

export class GlobalLed extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.i18n = Container.instance.get(I18N);
        this.id = id;
        this.key = 'id';
        this.led1 = undefined;
        this.led2 = undefined;
        this.led3 = undefined;
        this.led4 = undefined;
        this.room = undefined;

        this.mapping = {
            id: 'id',
            room: 'room',
            led1: [['can_led_1_function', 'can_led_1_id'], (enumerator, id) => {
                return new Led(id, enumerator, 'global');
            }],
            led2: [['can_led_2_function', 'can_led_2_id'], (enumerator, id) => {
                return new Led(id, enumerator, 'global');
            }],
            led3: [['can_led_3_function', 'can_led_3_id'], (enumerator, id) => {
                return new Led(id, enumerator, 'global');
            }],
            led4: [['can_led_4_function', 'can_led_4_id'], (enumerator, id) => {
                return new Led(id, enumerator, 'global');
            }]
        };
    }

    @computedFrom('id')
    get text() {
        return this.i18n.tr(`generic.leds.generalmodes.numberof${this.id <= 15 ? 'lights': 'outputs'}`, {
            specifier: this.i18n.tr(`generic.leds.generalmodes.${this.id === 0 || this.id === 16 ? 'equals' : 'gtoe'}`, {
                amount: this.id <= 15 ? this.id : (this.id - 16)
            })
        });
    }

    async save() {
        try {
            await this.api.setCanLedConfiguration(
                this.id,
                this.room,
                [
                    [this.led1.id, this.led1.enumerator],
                    [this.led2.id, this.led2.enumerator],
                    [this.led3.id, this.led3.enumerator],
                    [this.led4.id, this.led4.enumerator],
                ]
            );
        } catch (error) {
            Logger.error(`Could not save Globel Led configuration ${this.name}: ${error.message}`)
        }
        this._skip = true;
        this._freeze = false;
    }
}