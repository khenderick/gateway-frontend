import {inject, computedFrom} from "aurelia-framework";
import {BindingSignaler} from "aurelia-templating-resources";
import {I18N, BaseI18N} from "aurelia-i18n";
import {EventAggregator} from "aurelia-event-aggregator";
import {API} from "../components/api";
import {Refresher} from "../components/refresher";
import {Toolbox} from "../components/toolbox";
import {ThermostatFactory} from "../containers/thermostat";

@inject(API, BindingSignaler, I18N, Element, EventAggregator, ThermostatFactory)
export class Thermostats extends BaseI18N {
    constructor(api, signaler, i18n, element, ea, thermostatFactory) {
        super(i18n, element, ea);
        this.api = api;
        this.refresher = new Refresher(() => {
            this.loadThermostats().then(() => {
                signaler.signal('reload-thermostats');
            }).catch(() => {
            });
        }, 5000);
        this.thermostatFactory = thermostatFactory;

        this.globalThermostat = undefined;
        this.thermostats = [];
        this.thermostatsLoading = true;
    };

    @computedFrom('thermostats')
    get heatings() {
        let heatings = [];
        for (let thermostat of this.thermostats) {
            if (!thermostat.relay && thermostat.output0 !== 255 && thermostat.output1 !== 255) {
                heatings.push(thermostat);
            }
        }
        return heatings;
    };

    @computedFrom('thermostats')
    get relays() {
        let relays = [];
        for (let thermostat of this.thermostats) {
            if (thermostat.relay && thermostat.output0 !== 255 && thermostat.output1 !== 255) {
                relays.push(thermostat);
            }
        }
        return relays;
    }

    loadThermostats() {
        return this.api.getThermostats()
            .then((data) => {
                this.globalThermostat = this.thermostatFactory.makeGlobalThermostat();
                this.globalThermostat.fillData(data, false);
                Toolbox.crossfiller(data.status, this.thermostats, 'id', (id) => {
                    return this.thermostatFactory.makeThermostat(id);
                });
                this.thermostats.sort((a, b) => {
                    return a.name > b.name ? 1 : -1;
                });
                this.thermostatsLoading = false;
            })
            .catch(() => {
                console.error('Could not load Thermostats');
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
