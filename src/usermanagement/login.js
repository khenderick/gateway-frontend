import {Base} from "../resources/base";
import Shared from "../components/shared";

export class Login extends Base {
    constructor() {
        super();
        this.authentication = Shared.get('authentication');
        this.i18n = Shared.get('i18n');
        this.username = '';
        this.password = '';
        this.failure = false;
        this.error = undefined;
    };

    login() {
        this.failure = false;
        this.error = undefined;
        this.authentication.login(this.username, this.password)
            .catch((error) => {
                if (error.message.message === 'invalid_credentials') {
                    this.error = this.i18n.tr('pages.login.invalidcredentials');
                } else {
                    this.error = this.i18n.tr('generic.unknownerror');
                    console.error(error);
                }
                this.failure = true;
            });
    };

    attached() {
        super.attached();
    };

    activate() {
        this.password = '';
    };
}
