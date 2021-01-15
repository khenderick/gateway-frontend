import { AuraToastPositions } from "./enums/aura-toast-positions";
import { AuraToastTypes } from "./enums/aura-toast-types";

export class AuraToastService {
    
    settings = {
        duration: 3000,
        extendedDuration: 1000,
        position: AuraToastPositions.topright,
        maxWidth: '400px'
    };
    subscriptions; 
    
    constructor() {
        this.subscriptions = [];
    }

    success(request) {
        this.postMessage(AuraToastTypes.success, request);
    }

    info(request) {
        this.postMessage(AuraToastTypes.info, request);
    }

    warning(request) {
        this.postMessage(AuraToastTypes.warning, request);
    }

    error(request) {
        this.postMessage(AuraToastTypes.error, request);
    }

    postMessage(type, request) {
        if (request.key != null) {
            let sub = this.findByKey(request.key);
            if (sub != null) {
                sub.callback(type, request);
            }
        } else {
            this.subscriptions.forEach((sub) => {
                sub.callback(type, request);
            });
        }
    }
    
    findByKey(key) {
        let subKeys = this.subscriptions.map(m => m.key);
        let index = subKeys.indexOf(key);
        if (index > -1) {
            return this.subscriptions[index];
        }
        return null;
    }

    // Configuration Methods
    configure(settings) {
        this.settings = settings;
    }

    // Subscriptions Methods
    subscribe(sub) {
        let nextId = this.subscriptions.length + 1;
        sub.id = nextId;
        this.subscriptions.push(sub);
        return nextId;
    }

    unsubscribe(id) {
        let subIds = this.subscriptions.map(m => m.id);
        let index = subIds.indexOf(id);
        if (index > -1) {
            this.subscriptions.splice(index, 1);
        }
    }
}
