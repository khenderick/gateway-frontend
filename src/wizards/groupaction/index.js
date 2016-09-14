import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Change} from "./change";

@useView('../basewizard.html')
@inject(DialogController)
export class GroupActionWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new Change(0, this.data)
        ];
        this.activeStep = this.steps[0];
    }

    activate(options) {
        this.data.groupAction = options.groupAction;
        this.data.new = options.new;
        if (this.data.new) {
            this.steps[0].title = this.i18n.tr('wizards.groupaction.create') + ' ' + this.i18n.tr('generic.groupaction');
        } else {
            this.steps[0].title = this.i18n.tr('wizards.groupaction.edit') + ' ' + this.i18n.tr('generic.groupaction');
        }
        this.data.groupAction._freeze = true;
    }

    attached() {
        super.attached();
    }
}
