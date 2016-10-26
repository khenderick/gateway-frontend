import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {General} from "./general";
import {Switching} from "./switching";
import {Toolbox} from "../../components/toolbox";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureGlobalThermostatWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new General(this.data),
            new Switching(this.data)
        ];
        this.loadStep(this.steps[0]);
    }

    activate(options) {
        this.data.thermostat = options.thermostat;
        this.data.thermostat._freeze = true;
        let components = Toolbox.splitSeconds(this.data.thermostat.pumpDelay);
        this.data.delay.minutes = components.minutes;
        this.data.delay.seconds = components.seconds;
    }

    attached() {
        super.attached();
    }
}
