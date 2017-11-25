/*
 * Copyright (C) 2016 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";

export class BaseWizard extends Base {
    constructor(controller, ...rest) {
        super(...rest);
        this.controller = controller;
        this.next = this.i18n.tr('generic.next');
        this.steps = [];
        this.activeStep = undefined;
        this.removing = false;
        this.navigating = false;
        Shared.wizards.push(this.controller);
    }

    get skippedSteps() {
        return [];
    }

    @computedFrom('steps', 'skippedSteps')
    get filteredSteps() {
        let steps = [];
        for (let i = 0; i < this.steps.length; i++) {
            if (!this.skippedSteps.contains(i)) {
                steps.push(this.steps[i]);
            }
        }
        return steps;
    }

    get isLast() {
        return this.activeStep !== undefined && this.activeStep === this.filteredSteps[this.filteredSteps.length - 1];
    }

    get isFirst() {
        return this.activeStep !== undefined && this.activeStep === this.filteredSteps[0];
    }

    @computedFrom('activeStep')
    get stepComponents() {
        if (this.activeStep === undefined) {
            return [];
        }
        return Object.getOwnPropertyNames(Object.getPrototypeOf(this.activeStep));
    }

    async loadStep(step) {
        this.navigating = true;
        let components = Object.getOwnPropertyNames(Object.getPrototypeOf(step));
        if (components.contains('prepare') && step.prepare.call) {
            try {
                await step.prepare();
                this.activeStep = step;
            } catch (error) {
                console.error(`Failed preparing next step: ${error.message}`);
            }
            this.navigating = false;
        } else {
            this.activeStep = step;
            this.navigating = false;
        }
    }

    previous() {
        if (!this.isFirst) {
            this.activeStep = this.filteredSteps[this.filteredSteps.indexOf(this.activeStep) - 1]
        }
    }

    @computedFrom('stepComponents', 'activeStep')
    get hasProceed() {
        let components = this.stepComponents;
        if (components.contains('proceed')) {
            return this.activeStep.proceed.call;
        }
        return false;
    }

    @computedFrom('stepComponents', 'activeStep', 'activeStep.canProceed')
    get canProceed() {
        let components = this.stepComponents;
        if (components.contains('canProceed')) {
            return this.activeStep.canProceed;
        }
        return {valid: true, reasons: [], fields: new Set()};
    }

    async proceed() {
        if (!this.canProceed.valid) {
            return;
        }
        if (this.isLast) {
            this.controller.ok(this.activeStep.proceed(true));
        } else {
            await this.activeStep.proceed(false);
            return this.loadStep(this.filteredSteps[this.filteredSteps.indexOf(this.activeStep) + 1]);
        }
    }

    @computedFrom('stepComponents', 'activeStep')
    get hasRemove() {
        let components = this.stepComponents;
        if (components.contains('remove')) {
            return this.activeStep.remove.call;
        }
        return false;
    }

    @computedFrom('stepComponents', 'activeStep', 'activeStep.canRemove')
    get canRemove() {
        let components = this.stepComponents;
        if (components.contains('canRemove')) {
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
        Shared.wizards.remove(this.controller);
        this.controller.cancel();
    }

    attached() {
        super.attached();
    }
}

export class Step extends Base {
    constructor(...rest) {
        super(...rest);
    }

    attached() {
        super.attached();
    }
}
