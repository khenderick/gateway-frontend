/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {Base} from '../../resources/base';
import {Logger} from '../../components/logger';
import {Refresher} from '../../components/refresher';
import {Toolbox} from '../../components/toolbox';
import {EventRule} from '../../containers/eventrule';

@inject(DialogService, Factory.of(EventRule))
export class EventRules extends Base {
    constructor(dialogService, eventruleFactory, ...rest) {
        super(...rest);
        this.dialogService = dialogService;
        this.eventruleFactory = eventruleFactory;
        this.refresher = new Refresher(async () => {
            if (this.installationHasUpdated) {
                this.initVariables();
            }
            await this.loadEventRules();
            this.signaler.signal('reload-eventrules');
        }, 5000);
        this.initVariables();
    }

    initVariables() {
        this.activeEventRule = undefined;
        this.eventRules = [];
        this.eventRulesLoading = true;
    }

    async loadEventRules() {
        try {
            const eventRules = await this.api.getEventRules();
            Toolbox.crossfiller(eventRules.data, this.eventRules, 'id', id => this.eventruleFactory(id));
            this.eventRulesLoading = false;
        } catch (error) {
            Logger.error(`Could not load event rule configurations: ${error.message}`);
        }
    }

    selectEventRule(eventRuleId) {
        this.activeEventRule = this.eventRules.find(eventRule => eventRule.id === eventRuleId);
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
