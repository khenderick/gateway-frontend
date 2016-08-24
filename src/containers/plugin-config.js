export class PluginConfig {
    constructor() {
        this.configurable = false;
        this.config = new Map();
        this.entry = {
            name: undefined,
            description: undefined,
            type: undefined,
            choices: undefined,
            repeat: undefined,
            min: undefined,
            content: undefined,
            value: undefined,
            addSection: undefined,
            canRemoveSection: undefined,
            removeSection: undefined
        };
    }

    setStructure(structure) {
        for (let sentry of structure) {
            this.configurable = true;
            let entry = Object.assign({}, this.entry);

            // Main properties
            entry.value = undefined;
            entry.name = sentry.name;
            entry.description = sentry.description;
            entry.type = sentry.type;
            entry.choices = sentry.choices === undefined ? undefined : sentry.choices.slice();
            entry.repeat = sentry.repeat;
            entry.min = sentry.min || 0;
            entry.content = sentry.content === undefined ? undefined : sentry.content.slice();
            if (entry.type === 'enum') {
                entry.value = entry.choices[0];
            }

            // Recursive
            if (entry.type === 'section') {
                if (entry.repeat === true) {
                    entry.value = [];
                    for (let i = 0; i < entry.min; i++) {
                        let config = new PluginConfig();
                        config.setStructure(entry.content);
                        entry.value.push(config);
                    }
                    entry.addSection = () => {
                        let config = new PluginConfig();
                        config.setStructure(entry.content);
                        entry.value.push(config);
                        entry.canRemoveSection = entry.value.length > entry.min;
                    };
                    entry.removeSection = () => {
                        entry.value.pop();
                        entry.canRemoveSection = entry.value.length > entry.min;
                    };
                    entry.canRemoveSection = entry.value.length > entry.min;
                } else {
                    entry.value = new PluginConfig();
                    entry.value.setStructure(entry.content);
                }
            } else if (entry.type === 'nested_enum') {
                let choices = [];
                let content = {};
                for (let item of entry.choices) {
                    choices.push(item.value);
                    let config = new PluginConfig();
                    config.setStructure(item.content);
                    content[item.value] = config;
                }
                entry.choices = choices;
                entry.content = content;
                entry.value = entry.choices[0];
            }

            // Add to config
            this.config.set(entry.name, entry);
        }
    }

    setConfig(config) {
        for (let name of Object.keys(config)) {
            let entry = this.config.get(name);
            if (['str', 'password', 'enum'].indexOf(entry.type) !== -1) {
                entry.value = config[name];
            } else if (entry.type === 'bool') {
                entry.value = !!config[name];
            } else if (entry.type === 'int') {
                entry.value = parseInt(config[name], 10);
                if (entry.value === undefined) {
                    entry.value = -1;
                }
            } else if (entry.type === 'nested_enum') {
                entry.value = config[name][0];
                entry.content[entry.value].setConfig(config[name][1]);
            } else if (entry.type === 'section') {
                if (entry.repeat) {
                    for (let i = 0; i < config[name].length; i++) {
                        if (i < entry.value.length) {
                            entry.value[i].setConfig(config[name][i]);
                        } else {
                            let newConfig = new PluginConfig();
                            newConfig.setStructure(entry.content);
                            newConfig.setConfig(config[name][i]);
                            entry.value.push(newConfig);
                            entry.canRemoveSection = entry.value.length > entry.min;
                        }
                    }
                    if (entry.value.length > config[name].length) {
                        entry.value = entry.value.slice(0, config[name].length - 1);
                        entry.canRemoveSection = entry.value.length > entry.min;
                    }
                } else {
                    entry.value.setConfig(config[name]);
                }
            }
        }
    }

    getConfig() {
        let config = {};
        for (let [name, entry] of this.config.entries()) {
            if (['str', 'password', 'enum'].indexOf(entry.type) !== -1) {
                config[name] = entry.value || '';
            } else if (entry.type === 'bool') {
                config[name] = !!entry.value;
            } else if (entry.type === 'int') {
                config[name] = parseInt(entry.value, 10);
                if (config[name] === undefined) {
                    config[name] = -1;
                }
            } else if (entry.type === 'nested_enum') {
                config[name] = [entry.value, entry.content[entry.value].getConfig()];
            } else if (entry.type === 'section') {
                if (entry.repeat) {
                    let configs = [];
                    for (let i = 0; i < entry.value.length; i++) {
                        configs.push(entry.value[i].getConfig());
                    }
                    config[name] = configs;
                } else {
                    config[name] = entry.value.getConfig();
                }
            }
        }
        return config;
    }
}
