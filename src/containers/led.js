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
import {Container, computedFrom} from 'aurelia-framework';
import {I18N} from "aurelia-i18n";

export class Led {
    constructor(id, enumerator) {
        this.i18n = Container.instance.get(I18N);
        this.id = undefined;
        this.brightness = undefined;
        this.inverted = undefined;
        this._mode = undefined;
        if (id !== undefined && enumerator !== undefined) {
            this.load(id, enumerator);
        }
    }

    load(id, enumerator) {
        this.id = id;
        if (enumerator === 'UNKNOWN') {
            this.brightness = undefined;
            this.inverted = undefined;
            this.mode = undefined;
        } else {
            let parts = enumerator.split(' B');
            for (let [key, value] of modes) {
                if (value === parts[0]) {
                    this.mode = key;
                }
            }
            let invertedIndex = parts[1].indexOf(' Inverted');
            if (invertedIndex === -1) {
                this.inverted = false;
                this.brightness = parseInt(parts[1]);
            } else {
                this.inverted = true;
                this.brightness = parseInt(parts[1].substr(0, invertedIndex));
            }
        }
    }

    @computedFrom('_mode')
    get mode() {
        return this._mode;
    }

    set mode(newMode) {
        if (this._mode === 'off' && newMode !== 'off') {
            this.inverted = false;
        }
        this._mode = newMode;
        if (this._mode === 'off') {
            this.inverted = true;
        }
    }

    modeText(mode) {
        return this.i18n.tr(`generic.leds.modes.${mode}`);
    }

    outputText(output) {
        return this.i18n.tr('generic.leds.fulltextoutput', {
            mode: this.i18n.tr(`generic.leds.modes.${this.mode}`),
            brightness: Math.round(this.brightness / 16 * 20) * 5,
            output: output.identifier,
            outputstate: this.i18n.tr(`generic.${this.inverted ? 'off' : 'on'}`)
        });
    }

    @computedFrom('mode', 'brightness', 'inverted')
    get text() {
        return this.i18n.tr('generic.leds.fulltext', {
            mode: this.i18n.tr(`generic.leds.modes.${this.mode}`),
            brightness: Math.round(this.brightness / 16 * 20) * 5,
            outputstate: this.i18n.tr(`generic.${this.inverted ? 'off' : 'on'}`)
        });
    }

    @computedFrom('mode', 'brightness')
    get unlinkedText() {
        return this.i18n.tr('generic.leds.unlinkedtext', {
            mode: this.i18n.tr(`generic.leds.modes.${this.mode}`),
            brightness: Math.round(this.brightness / 16 * 20) * 5
        });
    }

    get enabled() {
        return this.id !== 255 && this.enumerator !== 'UNKNOWN';
    }

    @computedFrom('brightness', 'inverted', 'mode')
    get enumerator() {
        if (this.brightness === undefined || this.inverted === undefined || this.mode === undefined) {
            return 'UNKNOWN';
        }
        return `${modes.get(this.mode)} B${this.brightness}${this.inverted ? ' Inverted' : ''}`;
    }

    static get modes() {
        return modes.keys();
    }

    static get modesAndOff() {
        return [...Array.from(modes.keys()), 'off'];
    }
}

const modes = new Map([['on', 'On'], ['fast', 'Fast blink'], ['medium', 'Medium blink'], ['slow', 'Slow blink'], ['swing', 'Swinging']]);
