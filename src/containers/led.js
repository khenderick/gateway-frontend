import Shared from "../components/shared";

export class Led {
    constructor(id, enumerator) {
        this.i18n = Shared.get('i18n');
        this.id = undefined;
        this.brightness = undefined;
        this.inverted = undefined;
        this.mode = undefined;
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
            for (var [key, value] of modes) {
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

    modeText(mode) {
        return this.i18n.tr('generic.leds.modes.' + mode);
    }

    get text() {
        return this.i18n.tr('generic.leds.fulltext', {
            mode: this.i18n.tr('generic.leds.modes.' + this.mode),
            brightness: this.brightness / 16 * 100,
            output: this.i18n.tr('generic.' + (this.inverted ? 'off' : 'on'))
        });
    }

    get enabled() {
        return this.id !== 255 && this.enumerator !== 'UNKNOWN';
    }

    get enumerator() {
        if (this.brightness === undefined || this.inverted === undefined || this.mode === undefined) {
            return 'UNKNOWN';
        }
        return modes.get(this.mode) + ' B' + this.brightness + (this.inverted ? ' Inverted' : '');
    }

    static get modes() {
        return modes.keys();
    }
}

const modes = new Map([['on', 'On'], ['fast', 'Fast blink'], ['medium', 'Medium blink'], ['slow', 'Slow blink'], ['swing', 'Swinging']]);
