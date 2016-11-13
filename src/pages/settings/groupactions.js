/*
 * Copyright (C) 2016 OpenMotics BVBA
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
import {Base} from "../../resources/base";
import Shared from "../../components/shared";
import {Refresher} from "../../components/refresher";
import {Toolbox} from "../../components/toolbox";
import {GroupAction} from "../../containers/groupaction";
import {GroupActionWizard} from "../../wizards/groupaction/index";

export class GroupActions extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.dialogService = Shared.get('dialogService');
        this.refresher = new Refresher(() => {
            this.loadGroupActions().then(() => {
                this.signaler.signal('reload-groupactions');
            });
        }, 5000);

        this.groupActions = [];
        this.groupActionIDs = [];
        this.groupActionsLoading = true;
    };

    get newID() {
        for (let i = 0; i < 160; i++) {
            if (this.groupActionIDs.indexOf(i) === -1) {
                return i;
            }
        }
        return undefined;
    }

    get actions() {
        let actions = [];
        for (let action of this.groupActions) {
            actions.push(action);
        }
        return actions;
    }

    loadGroupActions() {
        return this.api.getGroupActionConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                    this.groupActionIDs.push(id);
                    return new GroupAction(id);
                });
                this.groupActions.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.groupActionsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Group Action Configurations');
                }
            });
    };

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
            options.groupAction = new GroupAction(newID);
            options.new = true;
        }
        this.dialogService.open({viewModel: GroupActionWizard, model: options}).then((response) => {
            if (!response.wasCancelled) {
                response.output.then((result) => {
                    let type = result[0];
                    let groupAction = result[1];
                    if (type === 'new') {
                        this.groupActionIDs.push(groupAction.id);
                        this.groupActions.push(groupAction);
                    } else if (type === 'remove') {
                        this.groupActionIDs.remove(groupAction.id);
                        this.groupActions.remove(groupAction);
                    }
                    groupAction._freeze = false;
                    this.groupActions.sort((a, b) => {
                        return a.name > b.name ? 1 : -1;
                    });
                });
            } else {
                if (options.new === false) {
                    options.groupAction.cancel();
                }
                console.info('The GroupActionWizard was cancelled');
            }
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
    };
}
