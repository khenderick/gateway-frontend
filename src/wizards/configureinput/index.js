import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureInputWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new General(this.data),
            new Configure(this.data)
        ];
        this.loadStep(this.steps[0]);
    }

    activate(options) {
        this.data.input = options.input;
        this.data.mode = options.input.type;
        this.data.actions = options.input.basicActions;
        this.data.input._freeze = true;
    }

    attached() {
        super.attached();
    }
}
