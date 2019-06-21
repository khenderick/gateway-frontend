// Copyright 2016 iNuron NV
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Changes:
// * Adapted to Aurelia: Kenneth Henderick <kenneth@ketronic.be>

import {inject, customElement, bindable, bindingMode, computedFrom} from 'aurelia-framework';
import {Toolbox} from '../../components/toolbox';
import {Base} from '../base';

@bindable({
    name: 'items',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'target',
    defaultBindingMode: bindingMode.twoWay
})
@bindable({
    name: 'enabled',
    defaultValue: true
})
@bindable({
    name: 'options',
    defaultValue: {}
})
@customElement('dropdown')
@inject(Element)
export class Dropdown extends Base {
    constructor(element, ...rest) {
        super(...rest);
        this.element = element;
        this.side = undefined;
    }

    bind() {
        this.key = this.options.key;
        this.small = this.options.small || false;
        this.free = this.options.free || false;
        this.maxChars = this.options.maxChars || undefined;
        this.targetSorter = this.options.targetSorter || undefined;
        this.emptyIsLoading = this.options.emptyisloading === undefined ? true : this.options.emptyisloading;
        this.context = this.options.context;
        this.nothingSelectedText = this.i18n.tr(this.options.nothingSelectedText || 'generic.nothingselected');

        if (this.free) {
            if (this.options.defaultfree === undefined) {
                throw new Error('If free values are allowed, a default should be provided');
            }
            if (this.target !== undefined) {
                this._freeValue = this.target;
            } else {
                this._freeValue = this.options.defaultfree;
            }
        }
        this.text = this.options.text;
        if (this.text === undefined) {
            this.text = (item) => {
                return item;
            };
        }
        this.multi = Array.isArray(this.target);
        if (!this.multi && this.target === undefined && this.items.length > 0) {
            let foundDefault = false;
            for (let item of this.items) {
                if (this.options.defaultregex !== undefined) {
                    if (this.text(item, this.context).match(this.options.defaultregex) !== null) {
                        this.target = item;
                        foundDefault = true;
                        break;
                    }
                    continue;
                }
                if (item === undefined) {
                    foundDefault = true;
                    break;
                }
            }
            if (!foundDefault) {
                this.target = this.items[0];
            }
        }
        if (this.free && this.multi) {
            throw new Error('A dropdown cannot be a multiselect and allow free values at the same time.');
        }
        this.useFree = false;
        setTimeout(() => {
            $(this.element.querySelector('[data-toggle="dropdown"]')).dropdown();
        }, 250);
    }

    @computedFrom('_freeValue')
    get freeValue() {
        return this._freeValue;
    }

    set freeValue(value) {
        this.target = value;
        this._freeValue = value;
    }

    @computedFrom('multi', 'target', 'target.length')
    get computedTarget() {
        if (this.multi) {
            return this.target.filter(i => i !== undefined);
        }
        return this.target;
    }

    @computedFrom('multi', 'target', 'target.length', 'maxChars')
    get mainText() {
        if (this.computedTarget.length === 0) {
            return '';
        }
        let sortedTarget = this.computedTarget;
        if (this.targetSorter !== undefined && this.targetSorter.call) {
            sortedTarget = this.targetSorter(sortedTarget, this.context);
        }
        let textEntries = [];
        for (let entry of sortedTarget) {
            textEntries.push(Toolbox.shorten(this.text(entry, this.context), 25));
        }
        return Toolbox.shortenList(textEntries, this.maxChars, this.i18n);
    }

    select(item) {
        if (item === undefined || item.disabled !== true) {
            this.useFree = false;
            this.set(item);
        }
    }

    selectFree() {
        this.useFree = true;
        this.set(this.freeValue);
    }

    set(item) {
        if (this.multi) {
            if (this.target.contains(item, this.key)) {
                this.target.remove(item, this.key);
            } else {
                this.target.push(item);
            }
        } else {
            this.target = item;
            if (this.free && !this.items.contains(this.target) && this.useFree) {
                this._freeValue = item;
            }
        }
        this.sendChange();
    }

    sendChange() {
        let cEvent = new CustomEvent('change', {
            bubbles: true,
            detail: {
                value: this.target
            }
        });
        this.element.dispatchEvent(cEvent);
    }

    // Aurelia
    attached() {
        super.attached();
    }
}
