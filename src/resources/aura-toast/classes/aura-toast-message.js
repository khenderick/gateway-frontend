export class AuraToastMessage {
    id;
    timeoutId;
    type;
    title;
    content;
    constructor(type, content, title = null) {
        this.type = type;
        this.content = content;
        this.title = title;
    }
}
