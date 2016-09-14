import {Step} from "../basewizard";

export class Confirm extends Step {
    constructor(id, title) {
        super(id, title);
    }

    proceed() {
        return true;
    }

    attached() {
        super.attached();
    }
}
