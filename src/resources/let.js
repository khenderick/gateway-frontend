/*
 * Copyright (C) 2019 OpenMotics BVBA
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
