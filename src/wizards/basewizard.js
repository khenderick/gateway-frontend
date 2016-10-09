import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";

export class BaseWizard extends Base {
    constructor(controller) {
        super();
        this.i18n = Shared.get('i18n');
        this.controller = controller;
        this.next = this.i18n.tr('generic.next');
        this.steps = [];
        this.activeStep = undefined;
        this.removing = false;
        this.navigating = false;
        Shared.get('wizards').push(this.controller);
    }

    @computedFrom('activeStep')
    get isLast() {
        return this.activeStep !== undefined && this.activeStep === this.steps[this.steps.length - 1];
    }

    @computedFrom('activeStep')
    get isFirst() {
        return this.activeStep !== undefined && this.activeStep === this.steps[0];
    }

    @computedFrom('activeStep')
    get stepComponents() {
        if (this.activeStep === undefined) {
            return [];
        }
        return Object.getOwnPropertyNames(Object.getPrototypeOf(this.activeStep));
    }

    loadStep(step) {
        this.navigating = true;
        let components = Object.getOwnPropertyNames(Object.getPrototypeOf(step));
        if (components.indexOf('prepare') >= 0 && step.prepare.call) {
            step.prepare()
                .then(() => {
                    this.activeStep = step;
                    this.navigating = false;
                })
                .catch((error) => {
                    console.error('Failed preparing next step');
                    this.navigating = false;
                })
        } else {
            this.activeStep = step;
            this.navigating = false;
        }
    }

    previous() {
        if (!this.isFirst) {
            this.activeStep = this.steps[this.steps.indexOf(this.activeStep) - 1]
        }
    }

    @computedFrom('stepComponents')
    get hasProceed() {
        let components = this.stepComponents;
        if (components.indexOf('proceed') >= 0) {
            return this.activeStep.proceed.call;
        }
        return false;
    }

    @computedFrom('stepComponents', 'activeStep', 'activeStep.canProceed')
    get canProceed() {
        let components = this.stepComponents;
        if (components.indexOf('canProceed') >= 0) {
            return this.activeStep.canProceed;
        }
        return {valid: true, reasons: [], fields: new Set()};
    }

    proceed() {
        if (!this.canProceed.valid) {
            return;
        }
        if (this.isLast) {
            this.controller.ok(this.activeStep.proceed());
        } else {
            this.activeStep.proceed()
                .then(() => {
                    this.loadStep(this.steps[this.steps.indexOf(this.activeStep) + 1]);
                });
        }
    }

    @computedFrom('stepComponents')
    get hasRemove() {
        let components = this.stepComponents;
        if (components.indexOf('remove') >= 0) {
            return this.activeStep.remove.call;
        }
        return false;
    }

    @computedFrom('stepComponents')
    get canRemove() {
        let components = this.stepComponents;
        if (components.indexOf('canRemove') >= 0) {
            return this.activeStep.canRemove;
        }
        return true;
    }

    startRemoval() {
        if (this.canRemove) {
            this.removing = true;
        }
    }

    stopRemoval() {
        this.removing = false;
    }

    remove() {
        if (!this.removing) {
            return;
        }
        this.controller.ok(this.activeStep.remove());
    }

    cancel() {
        Shared.get('wizards').remove(this.controller);
        this.controller.cancel();
    }

    attached() {
        super.attached();
    }
}

export class Step extends Base {
    constructor(title) {
        super();
        this.title = title || '';
        this.i18n = Shared.get('i18n');
    }

    attached() {
        super.attached();
    }
}
