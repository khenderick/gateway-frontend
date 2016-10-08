import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {Toolbox} from "../../components/toolbox";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureShutterWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new Configure(this.data)
        ];
        this.activeStep = this.steps[0];
    }

    activate(options) {
        let shutter = options.shutter;
        this.data.shutter = shutter;
        if (shutter.timerUp === 65536) {
            shutter.timerUp = 0;
        }
        let components = Toolbox.splitSeconds(shutter.timerUp);
        this.data.timerUp.hours = components.hours;
        this.data.timerUp.minutes = components.minutes;
        this.data.timerUp.seconds = components.seconds;
        if (shutter.timerDown === 65536) {
            shutter.timerDown = 0;
        }
        components = Toolbox.splitSeconds(shutter.timerDown);
        this.data.timerDown.hours = components.hours;
        this.data.timerDown.minutes = components.minutes;
        this.data.timerDown.seconds = components.seconds;
        if (shutter.name === 'NOT_IN_USE') {
            shutter.name = '';
        }
        this.data.shutter._freeze = true;
    }

    attached() {
        super.attached();
    }
}
