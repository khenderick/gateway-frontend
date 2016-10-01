import Shared from "../components/shared";
import {BaseObject} from "./baseobject";

export class Input extends BaseObject {
    constructor(id) {
        super();
        this.api = Shared.get('api');
        this.processing = false;
        this.key = 'id';
        this.id = id;
        this.action = undefined;
        this.basicActions = [];
        this.moduleType = undefined;
        this.name = undefined;
        this.recent = false;
        this.pulseCounter = undefined;
        this.type = undefined;
        this.mapping = {
            id: 'id',
            action: 'action',
            basicActions: 'basic_actions',
            moduleType: 'module_type',
            name: 'name',
            isVirtual: ['module_type', (moduleType) => {
                return moduleType === moduleType.toLowerCase();
            }],
            isCan: ['can', (can) => {
                return can === 'C';
            }],
            type: [['action', 'basic_actions'], (action, basicActions) => {
                if (action < 240) {
                    return 'linked';
                }
                if (action === 240) {
                    // @TODO: Add some dynamic types (e.g. a set of following toggles)
                    return 'advanced';
                }
                if (action === 241) {
                    return 'outputsoff';
                }
                if (action === 242) {
                    return 'lightsoff'
                }
                if (action === 255) {
                    if (this.pulseCounter !== undefined) {
                        return 'pulse';
                    }
                    return 'inactive';
                }
                return undefined;
            }]
        };
    }

    save() {
        return this.api.setInputConfiguration(
            this.id,
            this.action,
            this.basicActions.join(','),
            this.name
        )
            .then(() => {
                this._skip = true;
                this._freeze = false;
            });
    }

    indicate() {
        return this.api.flashLeds(1, this.id);
    }
}
