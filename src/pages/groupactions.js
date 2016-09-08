import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {DialogService} from "aurelia-dialog";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {GroupActionFactory} from "../containers/groupaction";
import {GroupActionWizard} from "../wizards/groupaction/index";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, GroupActionFactory, DialogService)
export class GroupActions extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, groupActionFactory, dialogService) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadGroupActions().then(() => {
                signaler.signal('reload-groupactions');
            });
        }, 5000);
        this.groupActionFactory = groupActionFactory;

        this.groupActions = [];
        this.groupActionIDs = [];
        this.groupActionsLoading = true;

        this.dialogService = dialogService;
    };

    @computedFrom('groupActionIDs')
    get newID() {
        for (let i = 0; i < 160; i++) {
            if (this.groupActionIDs.indexOf(i) === -1) {
                return i;
            }
        }
        return undefined;
    }

    loadGroupActions() {
        return this.api.getGroupActionConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                    this.groupActionIDs.push(id);
                    return this.groupActionFactory.makeGroupAction(id);
                });
                this.groupActions.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.groupActionsLoading = false;
            })
            .catch((error) => {
                if (!this.api.deduplicated(error)) {
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
            options.groupAction = this.groupActionFactory.makeGroupAction(newID);
            options.new = true;
        }
        this.dialogService.open({viewModel: GroupActionWizard, model: options}).then(response => {
            if (!response.wasCancelled) {
                let groupAction = response.output;
                this.groupActionIDs.push(groupAction.id);
                this.groupActions.push(groupAction);
                this.groupActions.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
            } else {
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
