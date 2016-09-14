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
    }

    @computedFrom('activeStep')
    get isLast() {
        return this.activeStep !== undefined && this.activeStep.id === this.steps.length - 1;
    }

    @computedFrom('activeStep')
    get stepComponents() {
        if (this.activeStep === undefined) {
            return [];
        }
        return Object.getOwnPropertyNames(Object.getPrototypeOf(this.activeStep));
    }

    @computedFrom('stepComponents')
    get hasContinue() {
        let components = this.stepComponents;
        if (components.indexOf('next') >= 0) {
            return this.activeStep.next.call;
        }
        return false;
    }

    @computedFrom('stepComponents', 'activeStep', 'activeStep.canContinue')
    get canContinue() {
        let components = this.stepComponents;
        if (components.indexOf('canContinue') >= 0) {
            return this.activeStep.canContinue;
        }
        return {valid: true, reasons: [], fields: new Set()};
    }

    next() {
        if (!this.canContinue.valid) {
            return;
        }
        if (this.isLast) {
            this.controller.ok(this.activeStep.next());
        } else {
            this.activeStep.next()
                .then(() => {
                    this.activeStep = this.steps[this.activeStep.id];
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

    attached() {
        super.attached();
    }
}

export class Step extends Base {
    constructor(id) {
        super();
        this.id = id;
        this.title = '';
        this.i18n = Shared.get('i18n');
    }

    attached() {
        super.attached();
    }
}
