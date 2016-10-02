import {BaseObject} from "./baseobject";

export class PulseCounter extends BaseObject {
    constructor(id) {
        super();
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.name = undefined;
        this.input = undefined;
        this.action = undefined;
        this.mapping = {
            id: 'id',
            action: 'action',
            input: 'input',
            name: 'name'
        };
    }
}
