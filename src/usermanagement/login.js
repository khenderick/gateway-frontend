import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";

export class Login extends Base {
    constructor() {
        super();
        this.authentication = Shared.get('authentication');
        this.i18n = Shared.get('i18n');
        this.api = Shared.get('api');
        this.refresher = new Refresher(() => {
            /*
            this.api.getModules({ignoreMM: true})
                .then((data) => {
                    this.maintenanceMode = data === 'maintenance_mode';
                    if (this.maintenanceMode) {
                        this.error = this.i18n.tr('pages.login.inmaintenancemode');
                    } else {
                        this.error = undefined;
                    }
                })
                .catch(() => {
                    this.maintenanceMode = false;
                    this.error = undefined;
                })
             */ // @TODO: Find some call that detects maintenance mode unauthenticated
        }, 5000);
        this.username = '';
        this.password = '';
        this.failure = false;
        this.error = undefined;
        this.maintenanceMode = false;
    };

    login() {
        if (this.maintenanceMode) {
            return;
        }
        this.failure = false;
        this.error = undefined;
        this.authentication.login(this.username, this.password)
            .catch((error) => {
                if (error.message.message === 'invalid_credentials') {
                    this.error = this.i18n.tr('pages.login.invalidcredentials');
                    this.password = '';
                } else {
                    this.error = this.i18n.tr('generic.unknownerror');
                    this.password = '';
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
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    };
}
