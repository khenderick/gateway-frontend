import { inject, containerless, customElement, BindingEngine } from 'aurelia-framework';
import { AuraToastBody } from './aura-toast-body';

@containerless()
@customElement("atoast-title")
@inject(AuraToastBody, BindingEngine)
export class AuraToastTitle {
    title = '';
    titleListener;
    constructor(auraToastBody, bindingEngine) {
        console.log('sdfsdfds');
        this.auraToastBody = auraToastBody;
        this.bindingEngine = bindingEngine;
    }

    attached() {
        this.setTitle(this.auraToastBody.title);
        this.titleListener = this.bindingEngine.propertyObserver(this.auraToastBody, 'title').subscribe((newValue, oldValue) => {
            this.setTitle(newValue);
        });
    }

    detached() {
        this.titleListener.dispose();
    }

    setTitle(title) {
        if (title != null) {
            this.title = title;
        } else {
            this.title = '';
        }
    }
}
