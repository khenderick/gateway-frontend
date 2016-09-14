import "fetch";
import {Storage} from "./storage";

export class Authentication {
    constructor(aurelia, router, api, wizards) {
        this.aurelia = aurelia;
        this.router = router;
        this.api = api;
        this.wizards = wizards;
    }

    get isLoggedIn() {
        return this.api.token !== undefined;
    }

    logout() {
        this.api.token = undefined;
        Storage.removeItem('token');
        for (let wizardController of this.wizards) {
            wizardController.cancel();
        }
        return this.aurelia.setRoot('users')
            .then(() => {
                this.router.navigate('login');
            });
    };

    login(username, password) {
        return this.api.login(username, password, {ignore401: true})
            .then((data) => {
                this.api.token = data.token;
                Storage.setItem('token', data.token);
                return this.aurelia.setRoot('index')
                    .then(() => {
                        this.router.navigate(Storage.getItem('last') || 'dashboard');
                    });
            });
    };
}
