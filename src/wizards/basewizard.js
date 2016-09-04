import {computedFrom} from "aurelia-framework";

export class BaseWizard {
    constructor(controller, i18n, element, ea) {
        this.i18n = i18n;
        this.element = element;
        this.ea = ea;
        this.controller = controller;
        this.next = this.i18n.tr('generic.next');
        this.steps = [];
        ea.subscribe('i18n:locale:changed', () => {
            this.i18n.updateTranslations(this.element);
        });
    }

    @computedFrom('activeStep')
    get isLast() {
        return this.activeStep.id === this.steps.length - 1;
    }

    continue() {
        if (this.isLast) {
            // @TODO: Move finish call to the step itself
            this.finish().then((result) => { this.controller.ok(result); });
        } else {
            // @TODO: Some logic to call function on the step itself
            this.activeStep = this.steps[this.activeStep.id];
        }
    }

    activate(options) {
        this.i18n.updateTranslations(this.element);
    }
}

export class Step {
    id = 0;
    title = '';
    path = '';

    constructor(id, title, path) {
        this.id = id;
        this.title = title;
        this.path = path;
    }
}
