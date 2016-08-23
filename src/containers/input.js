import {inject} from "aurelia-framework";
import {BaseObject} from "./baseobject";
import {API} from "../components/api";

@inject(API)
export class InputFactory {
    constructor(api) {
        this.api = api;
    }

    makeInput() {
        return new Input(this.api, ...arguments);
    }
}

export class Input extends BaseObject {
    constructor(api, id) {
        super();
        this.processing = false;
        this.api = api;
        this.key = 'id';
        this.id = id;
        this.action = undefined;
        this.basicActions = [];
        this.moduleType = undefined;
        this.name = undefined;
        this.recent = false;
        this.mapping = {
            id: 'id',
            action: 'action',
            basicActions: 'basic_actions',
            moduleType: 'module_type',
            name: 'name',
            type: ['action', (data) => {
                if (data < 240) {
                    return 'linked';
                }
                if (data === 255) {
                    return 'inactive';
                }
                return 'advanced';
            }]
        };
    }

    setAdvanced() {
        this._freeze = true;
        this._dirty = true;
        this.action = 240;
        this.type = this.mapping.type[1](this.action);
    }
    setInactive() {
        this._freeze = true;
        this._dirty = true;
        this.action = 255;
        this.type = this.mapping.type[1](this.action);
    }
}
