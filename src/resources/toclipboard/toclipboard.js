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
import {inject, customElement, bindable, bindingMode} from 'aurelia-framework';
import {Logger} from '../../components/logger';

@bindable({
    name: 'object',
    defaultBindingMode: bindingMode.twoWay,
    defaultValue: undefined
})

@bindable({
  name: 'display',
  defaultBindingMode: bindingMode.twoWay,
  defaultValue: undefined
})

@customElement('toclipboard')
@inject(Element)
export class ToClipboard {
    constructor(element) {
        this.element = element;
    }

    async copy2clip(event) {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(this.object);
        } catch (err) {
          Logger.error('Failed to copy: ', err);
        }
        this.sendChange();
      }

      sendChange() {
        let cEvent = new CustomEvent('copied', {
            bubbles: true,
            detail: {
                value: this.object
            }
        });
        console.log('sent event');
        this.element.dispatchEvent(cEvent);
    }
}
