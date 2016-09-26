import {customElement, noView, TargetInstruction, inject} from "aurelia-framework";

@customElement('let')
@noView()
@inject(TargetInstruction)
export class LetElement {
    constructor(instruction) {
        this.bindings = null;
        this.instruction = instruction;
    }

    bind(bindingContext, overrideContext) {
        let bindings = this.bindings = [];
        for (let expression of this.instruction.expressions) {
            let binding = expression.createBinding(overrideContext);
            binding.bind({bindingContext, overrideContext});
            bindings.push(binding);
        }
    }

    unbind() {
        for (let binding of this.bindings) {
            binding.unbind();
        }
        this.bindings = null;
    }
}
