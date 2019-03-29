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
import {OAuthGrant} from "../../containers/oauth-grant";
import {Refresher} from "../../components/refresher";
import {Toolbox} from '../../components/toolbox';
import {ConfigureOAuthApplicationWizard} from "../../wizards/configureoauthapplication";

@inject(DialogService, Factory.of(OAuthApplication), Factory.of(OAuthGrant))
export class OAuth extends Base {
    constructor(dialogService, oAuthApplicationFactory, oAuthGrantFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.oAuthApplicationFactory = oAuthApplicationFactory;
        this.oAuthGrantFactory = oAuthGrantFactory;
        this.refresher = new Refresher(async () => {
            this.loadApplications().then(() => {
                this.signaler.signal('reload-applications');
            });
            this.loadApplicationGrants().then(() => {
                this.signaler.signal('reload-application-grants');
            });
        }, 15000);
        this.initVariables();
    }

    initVariables() {
        this.activeApplication = undefined;
        this.applications = [];
        this.applicationsLoading = true;
        this.grants = [];
        this.grantsLoading = true;
        this.removingApplication = false;
        this.revokingGrant = false;
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
    }

    async loadApplicationGrants() {
        try {
            let grants = await this.api.getOAuth2ApplicationGrants();
            Toolbox.crossfiller(grants.data, this.grants, 'id', (id) => {
                return this.oAuthGrantFactory(id);
            });
            this.grants.sort((a, b) => {
                return a.name > b.name ? 1: -1;
            });
            this.grantsLoading = false;
        } catch (error) {
            console.error(`Could not load Application Grants: ${error.message}`);
        }
    }

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

    async removeApplication() {
        if (this.activeApplication === undefined) {
            return;
        }
        this.removingApplication = true;
        try {
            await this.activeApplication.remove();
            this.activeApplication = undefined;
            await this.loadApplications();
        } catch (error) {
            console.error(`Could not remove Application: ${error.message}`);
        } finally {
            this.removingApplication = false;
        }
    }

    async revokeGrant(grant) {
        this.revokingGrant = true;
        try {
            await grant.revoke();
            await this.loadApplicationGrants();
        } catch (error) {
            console.error(`Could not revoke Grant: ${error.message}`);
        } finally {
            this.revokingGrant = false;
        }
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
