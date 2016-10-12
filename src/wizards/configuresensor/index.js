import {inject, useView} from "aurelia-framework";
import {DialogController} from "aurelia-dialog";
import {BaseWizard} from "../basewizard";
import {Data} from "./data";
import {Configure} from "./configure";

@useView('../basewizard.html')
@inject(DialogController)
export class ConfigureSensorWizard extends BaseWizard {
    constructor(controller) {
        super(controller);
        this.data = new Data();
        this.steps = [
            new Configure(this.data)
        ];
        this.loadStep(this.steps[0]);
    }

    activate(options) {
        let sensor = options.sensor;
        this.data.sensor = sensor;
        this.data.offset = parseFloat(sensor.offset);
        this.data.currentOffset = parseFloat(sensor.offset);
        if (sensor.name === 'NOT_IN_USE') {
            sensor.name = '';
        }
        this.data.sensor._freeze = true;
    }

    attached() {
        super.attached();
    }
}
