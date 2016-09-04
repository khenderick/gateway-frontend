import {DialogController} from "aurelia-dialog";
import {inject, useView} from "aurelia-framework";
import {I18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../../components/api";
import {BaseWizard, Step} from "../basewizard";
import {Data} from "./data";

@useView('../basewizard.html')
@inject(DialogController, Data, API, I18N, Element, EventAggregator)
export class GroupActionWizard extends BaseWizard {
    constructor(controller, data, api, i18n, element, ea) {
        super(controller, i18n, element, ea);
        this.data = data;
        this.api = api;
        this.steps = [
            new Step(0, '', 'wizards/groupaction/change')
        ];
        this.activeStep = this.steps[0];
    }

    finish() {
        return this.api.setGroupActionConfiguration(
            this.data.groupAction.id,
            this.data.groupAction.name,
            this.data.groupAction.actions
        ).then(() => {
            return this.data.groupAction;
        })
    }

    activate(options) {
        super.activate();
        this.data.groupAction = options.groupAction;
        this.data.new = options.new;
        if (this.data.new) {
            this.steps[0].title = this.i18n.tr('wizards.groupaction.create') + ' ' + this.i18n.tr('generic.groupaction');
        } else {
            this.steps[0].title = this.i18n.tr('wizards.groupaction.edit') + ' ' + this.i18n.tr('generic.groupaction');
        }
        this.data.groupAction._freeze = true;
    }
}
