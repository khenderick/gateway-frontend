import {inject} from "aurelia-framework";
import {Data} from "./data";

@inject(Data)
export class Change {
    constructor(data) {
        this.data = data;
    }
}
