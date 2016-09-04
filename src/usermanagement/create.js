import "fetch";
import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";

@inject(API, BindingSignaler, I18N, Element, EventAggregator)
export class Create extends BaseI18N {
    constructor(api, signaler, i18n, element, ea) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadUsers().then(() => {
                this.authorized = true;
                signaler.signal('reload-users');
            }).catch(() => {
                this.users = [];
                this.authorized = false;
            });
        }, 1000);

        this.username = '';
        this.password = '';
        this.password2 = '';
        this.users = [];
        this.authorized = true;
        this.removing = undefined;
    };

    @computedFrom('password', 'password2')
    get noMatch() {
        return this.password !== this.password2;
    }

    loadUsers() {
        return this.api.getUsernames()
            .then((data) => {
                this.users = data.usernames;
            })
    }

    create() {
        if (this.noMatch || !this.authorized) {
            return;
        }
        this.api.createUser(this.username, this.password)
            .then(() => {
                this.users.push(this.username);
                this.failure = false;
                this.username = '';
                this.password = '';
                this.password2 = '';
            })
            .catch(() => {
                this.failure = true;
                this.password = '';
                this.password2 = '';
            });
    }

    startRemoval(username) {
        this.removing = username;
    }

    stopRemoval(username) {
        this.removing = undefined;
    }

    remove(username) {
        if (this.removing !== username) {
            return;
        }
        this.api.removeUser(username)
            .then(() => {
                this.removing = undefined;
            })
            .catch(() => {
                this.removing = undefined;
            });
    }

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    }
}
