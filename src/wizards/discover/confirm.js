import {Step} from "../basewizard";

export class Confirm extends Step {
    constructor(title) {
        super(title);
    }

    proceed() {
        return true;
    }

    attached() {
        super.attached();
    }
}
