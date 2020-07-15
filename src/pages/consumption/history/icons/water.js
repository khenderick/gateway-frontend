import {containerless} from "aurelia-framework";

//@containerless
export class Water {
  constructor(color) {
    this.color = color || 'lightgrey';
  }
}
