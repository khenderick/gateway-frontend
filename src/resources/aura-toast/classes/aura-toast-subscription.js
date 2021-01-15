export class AuraToastSubscription {
    id;
    key;
    callback
    constructor(callback, key = null) {
        this.callback = callback;
        this.key = key;
        console.log('AuraToastSubscription');
    }
}
