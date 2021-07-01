/*
 * Copyright (C) 2016 OpenMotics BV
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
import {inject, Factory, computedFrom} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from 'resources/base';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {Logger} from 'components/logger';
import {GroupAction} from 'containers/groupaction';
import {GroupActionWizard} from 'wizards/groupaction/index';

@inject(DialogService, Factory.of(GroupAction))
export class GroupActions extends Base {
    constructor(dialogService, groupActionFactory, ...rest) {
        super(...rest);
        this.groupActionFactory = groupActionFactory;
        this.dialogService = dialogService;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated || this.gatewayHasUpdated) {
                this.initVariables();
            }
            await this.loadGroupActions();
            this.signaler.signal('reload-groupactions');
        }, 5000);
        this.initVariables();
    }

    initVariables() {
        this.groupActions = [];
        this.groupActionIDs = [];
        this.groupActionsLoading = true;
        this.installationHasUpdated = false;
        this.gatewayHasUpdated = false;
    }

    @computedFrom('groupActionIDs')
    get newID() {
        for (let i = 0; i < 160; i++) {
            if (!this.groupActionIDs.contains(i)) {
                return i;
            }
        }
        return undefined;
    }

    @computedFrom('groupActions')
    get actions() {
        let actions = [];
        for (let action of this.groupActions) {
            actions.push(action);
        }
        return actions;
    }

    async loadGroupActions() {
        try {
            let data = await this.api.getGroupActionConfigurations();
            Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                this.groupActionIDs.push(id);
                return this.groupActionFactory(id);
            });
            this.groupActions.sort((a, b) => {
                return a.name > b.name ? 1 : -1;
            });
            this.groupActionsLoading = false;
        } catch (error) {
            Logger.error(`Could not load Group Action Configurations: ${error.message}`);
        }
    }

    showWizard(groupAction) {
        let options = {
            groupAction: groupAction,
            new: false
        };
        if (groupAction === undefined) {
            let newID = this.newID;
            if (newID === undefined) {
                return;
            }
            options.groupAction = this.groupActionFactory(newID);
            options.new = true;
        }
        this.dialogService.open({viewModel: GroupActionWizard, model: options}).whenClosed(async (response) => {
            if (!response.wasCancelled) {
                const result = await response.output;
                const type = result[0];
                const groupAction = result[1];
                if (type === 'new') {
                    await this.loadGroupActions();
                    this.signaler.signal('reload-groupactions');
                } else if (type === 'remove') {
                    await this.loadGroupActions();
                    this.signaler.signal('reload-groupactions');
                }
                groupAction._freeze = false;
                this.groupActions.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
            } else {
                if (options.new === false) {
                    options.groupAction.cancel();
                }
                Logger.info('The GroupActionWizard was cancelled');
            }
        });
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run()
    }

    gatewayUpdated() {
        this.gatewayHasUpdated = true;
        this.refresher.run();
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
