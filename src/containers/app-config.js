/*
 * Copyright (C) 2016 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
export class AppConfig {
    constructor(appName) {
        this.configurable = false;
        this.config = new Map();
        this.appName = appName;
        this.entry = {
            name: undefined,
            description: undefined,
            i18n: undefined,
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
            entry.appName = this.appName;
            entry.value = undefined;
            entry.name = sentry.name;
            entry.description = sentry.description;
            entry.i18n = sentry.i18n;
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
                        let config = new AppConfig();
                        config.setStructure(entry.content);
                        entry.value.push(config);
                    }
                    entry.addSection = () => {
                        let config = new AppConfig();
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
                    entry.value = new AppConfig();
                    entry.value.setStructure(entry.content);
                }
            } else if (entry.type === 'nested_enum') {
                let choices = [];
                let content = {};
                for (let item of entry.choices) {
                    choices.push(item.value);
                    let config = new AppConfig();
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
            if (['str', 'password', 'enum'].contains(entry.type)) {
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
                            let newConfig = new AppConfig();
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
            if (['str', 'password', 'enum'].contains(entry.type)) {
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
