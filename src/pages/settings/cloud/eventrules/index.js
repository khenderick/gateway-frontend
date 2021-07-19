/*
 * Copyright (C) 2019 OpenMotics BV
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
import {inject, Factory} from 'aurelia-framework';
import {DialogService} from 'aurelia-dialog';
import {Base} from 'resources/base';
import {Logger} from 'components/logger';
import {Refresher} from 'components/refresher';
import {Toolbox} from 'components/toolbox';
import {EventRule} from 'containers/eventrule';
import {Output} from 'containers/cloud/output';
import {ConfigureEventruleWizard} from 'wizards/configureeventrule/index'

@inject(DialogService, Factory.of(EventRule), Factory.of(Output))
export class EventRules extends Base {
    constructor(dialogService, eventruleFactory, outputFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.eventruleFactory = eventruleFactory;
        this.outputFactory = outputFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.getRooms();
            await this.loadOutputs();
            await this.loadEventRules();
            this.signaler.signal('reload-eventrules');
        }, 60000);
        this.initVariables();
    }

    initVariables() {
        this.activeEventRule = undefined;
        this.rooms = [];
        this.eventRules = [];
        this.eventRulesLoading = true;
        this.triggers = {
            output: [],
        };
        this.triggersMap = {
            output: {},
        };
        this.triggersLoading = true;
        this.installationHasUpdated = false;
        this.working = false;
    }

    _sortEventRules(eventRules) {
        return eventRules.sort((a, b) => a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1);
    }

    async getRooms() {
        try {
            const { data } = await this.api.getRooms();
            this.rooms = data;
        } catch (error) {
            Logger.error(`Could not load Rooms: ${error.message}`);
        }
    }

    async loadOutputs() {
        try {
            const { data } = await this.api.getOutputs();
            Toolbox.crossfiller(data, this.triggers.output, 'id', id => {
                let output = this.outputFactory(id);
                this.triggersMap.output[id] = output;
                return output;
            });
            this.triggers.output.forEach(output => {
                if (output.room === undefined) {
                    output.roomName = '';
                }
                const { name: roomName } = this.rooms.find(({ id }) => id === output.room) || { name: '' };
                output.roomName = roomName;
            });
            this.triggers.output.sort((a, b) => a.id > b.id ? 1 : -1);
            this.triggersLoading = false;
        } catch (error) {
            Logger.error(`Could not load Outputs: ${error.message}`);
        }
    }

    async loadEventRules() {
        try {
            const eventRules = await this.api.getEventRules();
            Toolbox.crossfiller(eventRules.data, this.eventRules, 'id', id => this.eventruleFactory(id));
            this.eventRules.forEach(eventRule => {
                const trigger = this.triggersMap[eventRule.triggerType][eventRule.triggerId];
                if (trigger.roomName !== '') {
                    eventRule.triggerName = ` ${trigger.name} (${trigger.roomName})`;
                } else {
                    eventRule.triggerName = trigger.name;
                }
            });
            this._sortEventRules(this.eventRules);
            this.eventRulesLoading = false;
        } catch (error) {
            Logger.error(`Could not load EventRules: ${error.message}`);
        }
    }

    selectEventRule(eventRuleId) {
        this.activeEventRule = this.eventRules.find(eventRule => eventRule.id === eventRuleId);
    }

    add() {
        this.addOrEdit(undefined);
    }

    edit(eventRule) {
        if (eventRule === undefined) return;
        this.addOrEdit(eventRule);
    }

    addOrEdit(eventRule) {
        this.dialogService.open(
            {
                viewModel: ConfigureEventruleWizard,
                model: {
                    eventRule: eventRule,
                    trigger: eventRule && this.triggersMap[eventRule.triggerType][eventRule.triggerId],
                    triggers: this.triggers,
                },
            }
        ).whenClosed(response => {
            if (response.wasCancelled) {
                if (eventRule) eventRule.cancel();
                Logger.info('The ConfigureEventruleWizard was cancelled');
            } else if (!eventRule && response.output) {
                this.eventRules.push(response.output);
                this._sortEventRules(this.eventRules);
                this.signaler.signal('reload-eventrules');
                this.refresher.run();
            }
        });
    }

    async removeEventRule(eventRule) {
        this.working = true;
        try {
            await this.activeEventRule.remove();
            this.activeEventRule = undefined;
            await this.refresher.run();
        } catch (error) {
            Logger.error(`Could not remove EventRule: ${error.message}`);
        }
        this.working = false;
    }

    installationUpdated() {
        this.installationHasUpdated = true;
        this.refresher.run();
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
    }

    deactivate() {
        this.refresher.stop();
    }
}
