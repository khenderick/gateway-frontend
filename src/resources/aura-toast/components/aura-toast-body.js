import { containerless, customElement, bindable } from 'aurelia-framework';

@bindable({ name: 'title' })
@bindable({ name: 'content' })
@containerless()
@customElement('atoast-body')
export class AuraToastBody {
    constructor() {}
}
