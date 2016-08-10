import {inject} from "aurelia-framework";
import {BaseObject} from "./baseobject";
import {API} from "../components/api";

@inject(API)
export class GroupActionFactory {
    constructor(api) {
        this.api = api;
    }

    makeGroupAction() {
        return new GroupAction(this.api, ...arguments);
    }
}

export class GroupAction extends BaseObject {
    constructor(api, id) {
        super();
        this._freeze = false;
        this.processing = false;
        this.api = api;
        this.key = 'id';
        this.id = id;
        this.actions = undefined;
        this.name = undefined;
        this.mapping = {
            id: 'id',
            actions: 'actions',
            name: 'name'
        };
    }

    trigger() {
        this.processing = true;
        return this.api.doGroupAction(this.id)
            .then(() => {
                this.processing = false;
            })
            .catch(() => {
                this.processing = false;
                console.error('Could not trigger GroupAction ' + this.name)
            })
    }
}
