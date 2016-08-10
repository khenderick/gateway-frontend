import {customElement, bindable, bindingMode} from "aurelia-framework";

@bindable({
    name: 'config',
    defaultBindingMode: bindingMode.twoWay
})
@customElement('plugin-config')
export class PluginConfig {
}
