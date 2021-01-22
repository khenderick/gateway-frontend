export class AuraToastRequest {
    constructor(content, title = null, key = null) {
        this.content = content;
        this.title = title;
        this.key = key;
    }
}
