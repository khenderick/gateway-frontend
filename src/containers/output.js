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
            moduleType: 'module_type',
            name: 'name',
            type: ['type', (data) => {
                return data === 255 ? 'light' : 'output';
            }],
            isVirtual: ['module_type', (moduleType) => {
                return moduleType === moduleType.toLowerCase();
            }],
            isDimmer: ['module_type', (moduleType) => {
                return moduleType.toUpperCase() === 'D';
            }],
            inUse: ['name', (name) => {
                return name !== 'NOT_IN_USE';
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
        if (on === undefined) {
            this.status = !this.status;
        } else {
            this.status = !!on;
        }
        this.set();
    }

    onToggle(event) {
        this.toggle(event.detail.value);
    }

    dim(value) {
        this._freeze = true;
        this.processing = true;
        if (this.moduleType === 'D') {
            if (value > 0) {
                this.status = true;
                this.dimmer = value;
            } else {
                this.status = false;
                this.dimmer = 0;
            }
            this.set();
        } else {
            this._freeze = false;
            this.processing = false;
            throw new Error('A non-dimmer output can not be dimmed');
        }
    }

    onDim(event) {
        this.dim(event.detail.value);
    }

    indicate() {
        return this.api.flashLeds(0, this.id);
    }
}
