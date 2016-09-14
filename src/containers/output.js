import Shared from "../components/shared";
import {BaseObject} from "./baseobject";

export class Output extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.floor = undefined;
        this.moduleType = undefined;
        this.name = undefined;
        this.type = undefined;
        this.timer = undefined;
        this.dimmer = undefined;
        this.status = undefined;
        this.mapping = {
            id: 'id',
            floor: 'floor',
            moduleType: ['module_type', (data) => {
                return data.toUpperCase()
            }],
            name: 'name',
            type: ['type', (data) => {
                return data === 255 ? 'light' : 'output';
            }],
            timer: 'ctimer',
            dimmer: 'dimmer',
            status: ['status', (data) => {
                return data !== 0;
            }]
        };
    }

    set() {
        let dimmer, timer;
        if (this.status === true) {
            dimmer = this.dimmer;
            timer = this.timer;
            if ([150, 450, 900, 1500, 2220, 3120].indexOf(timer) === -1) {
                timer = undefined;
            }
        }
        this._skip = true;
        this.api.setOutput(this.id, this.status, dimmer, timer)
            .then(() => {
                this._freeze = false;
                this.processing = false;
            })
            .catch(() => {
                this._freeze = false;
                this.processing = false;
                console.error('Could not set Output ' + this.name);
            });
    }

    toggle(on) {
        this._freeze = true;
        this.processing = true;
        let newStatus, dimmer, timer;
        if (on === undefined) {
            newStatus = !this.status;
        } else {
            newStatus = !!on;
        }
        this.status = newStatus;
        this.set();
    }

    onToggle(event) {
        this.toggle(event.detail.value);
    }

    dim(event) {
        this._freeze = true;
        this.processing = true;
        if (this.moduleType === 'D') {
            let newValue = event.detail.value, dimmer, timer;
            if (newValue > 0) {
                this.status = true;
                this.dimmer = newValue;
            } else {
                this.status = false;
                this.dimmer = 0;
            }
            this.set();
        } else {
            this._freeze = false;
            this.processing = false;
            throw 'A non-dimmer output can not be dimmed'
        }
    }
}
