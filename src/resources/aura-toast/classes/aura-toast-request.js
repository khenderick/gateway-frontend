export class AuraToastRequest {
    content;
    title;
    key;
    constructor(content, title = null, key = null) {
        this.content = content;
        this.title = title;
        this.key = key;
    }
}
