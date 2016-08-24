import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {GroupActionFactory} from "../containers/groupaction";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, GroupActionFactory)
export class GroupActions extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, groupActionFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadGroupActions().then(() => {
                signaler.signal('reload-groupactions');
            }).catch(() => {
            });
        }, 5000);
        this.groupActionFactory = groupActionFactory;

        this.groupActions = [];
        this.groupActionsLoading = true;
    };

    loadGroupActions() {
        return this.api.getGroupActionConfigurations()
            .then((data) => {
                Toolbox.crossfiller(data.config, this.groupActions, 'id', (id) => {
                    return this.groupActionFactory.makeGroupAction(id);
                });
                this.groupActions.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.groupActionsLoading = false;
            })
            .catch(() => {
            });
    };

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
