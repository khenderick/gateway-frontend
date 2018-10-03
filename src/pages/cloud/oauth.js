/*
 * Copyright (C) 2018 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {inject, Factory} from "aurelia-framework";
import {DialogService} from "aurelia-dialog";
import {Base} from "../../resources/base";
import {OAuthApplication} from "../../containers/oauth-application";
import {Refresher} from "../../components/refresher";
import {Toolbox} from '../../components/toolbox';
import {ConfigureOAuthApplicationWizard} from "../../wizards/configureoauthapplication";

@inject(DialogService, Factory.of(OAuthApplication))
export class OAuth extends Base {
    constructor(dialogService, oAuthApplicationFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.oAuthApplicationFactory = oAuthApplicationFactory;
        this.refresher = new Refresher(async () => {
            await this.loadApplications();
            this.signaler.signal('reload-applications');
        }, 15000);
        this.initVariables();
    };

    initVariables() {
        this.activeApplication = undefined;
        this.applications = [];
        this.applicationsLoading = true;
        this.working = false;
        this.requestedRemove = false;
    }

    async loadApplications() {
        try {
            let applications = await this.api.getOAuth2Applications();
            Toolbox.crossfiller(applications.data, this.applications, 'id', (id) => {
                return this.oAuthApplicationFactory(id);
            });
            this.applications.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.applicationsLoading = false;
        } catch (error) {
            console.error(`Could not load Applications: ${error.message}`);
        }
    };

    async addApplication() {
        this.dialogService.open({viewModel: ConfigureOAuthApplicationWizard, model: {
                application: this.oAuthApplicationFactory(undefined)
            }}).whenClosed((response) => {
            if (response.wasCancelled) {
                console.info('The AddOAuthApplicationWizard was cancelled');
            } else {
                let application = response.output;
                this.applications.push(application);
                this.applications.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.activeApplication = application;
            }
        });
    }

    async selectApplication(applicationId) {
        let foundApplication = undefined;
        for (let application of this.applications) {
            if (application.id === applicationId) {
                foundApplication = application;
            }
        }
        this.activeApplication = foundApplication;
    }

    async copy(data) {
        try {
            let result = await navigator.permissions.query({name: "clipboard-write"});
            if (result.state === 'granted' || result.state === 'prompt') {
                await navigator.clipboard.writeText(data);
            }
        } catch (error) {
            console.error(`Could not copy data: ${error}`);
        }
    }

    requestRemove() {
        if (this.activeApplication !== undefined) {
            this.requestedRemove = true;
        }
    }

    async confirmRemove() {
        if (this.requestedRemove === true) {
            this.working = true;
            try {
                await this.api.removeOAuth2Application(this.activeApplication.id);
                this.activeApplication = undefined;
                await this.loadApplications();
            } catch (error) {
                console.error(`Could not remove Application: ${error.message}`);
            } finally {
                this.working = false;
                this.requestedRemove = false;
            }
        }
    }

    abortRemove() {
        this.requestedRemove = false;
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
