import { inject, containerless, customElement, BindingEngine } from 'aurelia-framework';
import { AuraToastBody } from './aura-toast-body';

@containerless()
@customElement("atoast-content")
@inject(AuraToastBody, BindingEngine)
export class AuraToastContent {
    content = '';
    contentListener = {};
    constructor(auraToastBody, bindingEngine) {
        this.auraToastBody = auraToastBody;
        this.bindingEngine = bindingEngine;
    }

    attached() {
        this.content = this.auraToastBody.content;
        this.contentListener = this.bindingEngine.propertyObserver(this.auraToastBody, 'content').subscribe((newValue, oldValue) => {
            this.content = newValue;
        });
    }

    detached() {
        this.contentListener.dispose();
    }
}
