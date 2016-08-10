export class Refresher {
    constructor(callback, interval) {
        this.callback = callback;
        this.interval = interval;
        this.timeout = undefined;
    }

    start() {
        if (this.timeout === undefined) {
            this.timeout = setInterval(this.callback, this.interval);
        }
    }

    stop() {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
            this.timeout = undefined;
        }
    }

    run() {
        this.callback();
    }
}
