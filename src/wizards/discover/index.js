import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Confirm} from "./confirm";

@useView('../basewizard.html')
@inject(DialogController)
export class DiscoverWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.steps = [
            new Confirm(0, this.i18n.tr('wizards.discover.title'))
        ];
        this.activeStep = this.steps[0];
    }

    attached() {
        super.attached();
    }
}
