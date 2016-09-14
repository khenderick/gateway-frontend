import Shared from "../components/shared";
import {BaseObject} from "./baseobject";

export class GroupAction extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.actions = '';
        this.name = '';
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
