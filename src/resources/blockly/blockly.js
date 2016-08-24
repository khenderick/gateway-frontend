import {customElement, bindable, bindingMode} from "aurelia-framework";

@bindable({
    name: 'config',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('blockly')
export class BlocklyWrapper {
    constructor() {
        this.workspace = undefined;
    }

    loadBlockly() {
         this.workspace = Blockly.inject(
            'blocklyDiv',
            {toolbox: document.getElementById('toolbox')}
        );
        function myUpdateFunction() {
            document.getElementById('textarea').value = Blockly.JavaScript.workspaceToCode(workspace);
        }
        this.workspace.addChangeListener(myUpdateFunction);
    }

    // Aurelia
    attached() {
        let tryLoad = () => {
            if (window.Blockly !== undefined && Blockly.hasOwnProperty('inject')) {
                this.loadBlockly();
            } else {
                setTimeout(tryLoad, 1000);
            }
        };
        tryLoad();
    };
}
