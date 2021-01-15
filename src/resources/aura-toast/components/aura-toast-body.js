import { containerless, customElement, bindable } from 'aurelia-framework';

@containerless()
@customElement('atoast-body')
export class AuraToastBody {

    @bindable() title;
    @bindable() content;
    constructor() {}
}
