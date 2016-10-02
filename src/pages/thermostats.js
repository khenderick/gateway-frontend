import {computedFrom} from "aurelia-framework";
import {Base} from "../resources/base";
import Shared from "../components/shared";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {Thermostat, GlobalThermostat} from "../containers/thermostat";

export class Thermostats extends Base {
    constructor() {
        super();
        this.api = Shared.get('api');
        this.signaler = Shared.get('signaler');
        this.refresher = new Refresher(() => {
            this.loadThermostats().then(() => {
                this.signaler.signal('reload-thermostats');
            });
        }, 5000);

        this.globalThermostat = undefined;
        this.thermostats = [];
        this.thermostatsLoading = true;
    };

    @computedFrom('thermostats')
    get heatings() {
        let heatings = [];
        for (let thermostat of this.thermostats) {
            if (!thermostat.isRelay && thermostat.output0 !== 255 && thermostat.output1 !== 255) {
                heatings.push(thermostat);
            }
        }
        return heatings;
    };

    @computedFrom('thermostats')
    get relays() {
        let relays = [];
        for (let thermostat of this.thermostats) {
            if (thermostat.isRelay && thermostat.output0 !== 255 && thermostat.output1 !== 255) {
                relays.push(thermostat);
            }
        }
        return relays;
    }

    loadThermostats() {
        return this.api.getThermostats()
            .then((data) => {
                this.globalThermostat = new GlobalThermostat();
                this.globalThermostat.fillData(data, false);
                Toolbox.crossfiller(data.status, this.thermostats, 'id', (id) => {
                    return new Thermostat(id);
                });
                this.thermostats.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.thermostatsLoading = false;
            })
            .catch((error) => {
                if (!this.api.isDeduplicated(error)) {
                    console.error('Could not load Thermostats');
                }
            });
    };

    // Aurelia
    attached() {
        super.attached();
    };

    activate() {
        this.refresher.run();
        this.refresher.start();
    };

    deactivate() {
        this.refresher.stop();
    };
}
