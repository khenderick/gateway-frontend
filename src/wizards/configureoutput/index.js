import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {Toolbox} from "../../components/toolbox";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Configure} from "./configure"

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureOutputWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new Configure(this.data)
        ];
        this.activeStep = this.steps[0];
    }

    activate(options) {
        let output = options.output;
        this.data.output = output;
        this.data.type = output.isLight ? 'light' : 'relay';
        let components = Toolbox.splitSeconds(output.timer);
        this.data.hours = components.hours;
        this.data.minutes = components.minutes;
        this.data.seconds = components.seconds;
        if (output.timer === 65536) {
            output.timer = 0;
        }
        if (output.name === 'NOT_IN_USE') {
            output.name = '';
        }
        this.data.output._freeze = true;
    }

    attached() {
        super.attached();
    }
}
