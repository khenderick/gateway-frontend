import {Base} from "../resources/base";
import Shared from "../components/shared";

export class Logout extends Base {
    constructor() {
        super();
        this.authentication = Shared.get('authentication');
    };

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.authentication.logout();
    };
}
