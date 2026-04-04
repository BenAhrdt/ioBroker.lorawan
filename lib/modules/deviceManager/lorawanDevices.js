const lodash = require('lodash');
/**
 * class to handle lorawan devices in device Manager
 */
class lorawanDevicesClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.icons = {
            deviceLink:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAADAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAAJ2TAADoAwAAnZMAAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAADS+8vrCE8zXAAABBVJREFUWEe1l1+IFXUUxz/fmd3VFYnKh0oUKkjBfJMiX3q4kJikEW0ZKUIQpWso3D2DD0UUPdnMrssubCb6oEi0mlEZZS74IPRvxWLFhCIpKLckKIiU9u7OnB68d7k7uffOXesDwzDnd87v953f7/xmzk9UiaIoDMMQd6+ZmrJ79+4UYNeuXWG+bTYkkaYpcRynADKzu4E+SUuBNB/QgHZ37+Zap0PAZN6hAaG7/wSUZWafAl+kafoWsACoTYFyQTOQpCzLLgAEQbDCW5k6uBqG4dPAA4qi6JK73w8MuftiSQ4E7l7kjdqr9yK+NdokjQPdks4oiqIfgI3ufrhSqazr6Oh4DFg3MTGxOQzDefnoGyQDFra1tb0raTMwXBPQBbyfZdl7klYAy919GGjL93CDODAvCIJHgEeBd4Jqg4Ap4Dd3/9DdY+AycOl/uMarYwmgfgn2njhxYtX58+dbSaaWWblypdauXXtW0lZguDYDACqVSgvqngvT09Nzl5ltMrMH8215qmNM77B6AXPCzDYFQXBO0uuSTprZ4e3btxf+MN2QADPbIukw8GIcx0vcfbWkDZ2dnU/lfWdjzgLM7HFJB4FtcRwPAJ4kydfu/jlwX95/NuYkYOfOnfMlxcArcRzvrdnNbLmk1cCXMyNmp2UB5XK5MwzDRcDNWZaNmtnHZrbMzJZKOg18MjY29nY+bjZaEmBmz4RhOJpl2VXgoqSuakZH7n6Lux+dmpraNDIyUngrFxZgZg9L2g/s6+/v/8Pdt7r7SeAMcE9vb++5JEle2LNnTyUf24jCAoCX3P2NOI4HAZIkOQucltQNHM87F6WwAEmLgG9rz2Z2ZxAEo8DpSqXSP9O7OIUFuPsxSS+b2XozWy/pM+DslStXugYGBlopZGZQWMDk5OSr7n5U0iFJB939WKVS6RoaGprz4OR/RkmSrKqriK7Ljh075ru7Dw4OTuTbCiIzm/4ZKYqiH4ENwEiWZceBv5uUY7U3Lvy9r8OB+dV6YA3wgcxs3N1LkpZVi5EsH/UfE7j7BXf/TtIpmdlrkja6+6kCg6ta/2XAvFwBO1HNqfZmywgEkkruPiyubak1ku6tBjYKrgDrgCXAPqCjzv4c8DPwUZ39egiQu3+TJMnJfGNTzGxbFEUH8vYoig6Y2ba8vRmFt2EdJXf/Pm9094tAKW9vRqNsn6ZcLi8Gbg/DMHL3h7Ise9Ldf6nbCamkO4IgOCJpJE3TGPi1r69vPNfVv2gqwMxWAUeA34GFwJ/VQ0tbLgmnJLUDNwF/AbcCTyRJ8lWuyxk0FRBF0RZ3L6dp+nx1UDWIqyXxVBiGb0rqi+P4UN6pntk6mqanp2dxEAT7gdtaOLyGwOUsy57t7e1tuAxNBdRo5QhO3dG9Gf8AB6O8qswBMWkAAAAASUVORK5CYII=',
            deviceLinkTtn:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAACAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAANl2AQDoAwAA2XYBAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAABZKX6wz+x41AAABB1JREFUWEe1l12IVVUUx3//c+69lopUL5nUS0GF+VKC9PEQXEhEoggqI6wXpdIHae7sgz4Eg/U03DNHlBCLLIiIRvouRBKEPgnCQjCjDykqJ7VIrHS+7tmrhzlnOnO8HzNM/uBy71lrr73WXXvtdfYWGVEUhWEYYma5qCeDg4MpwNatW8OyrhOSSNOUZrOZAsg5dy2QSLoGSMsGXaia2WamJt0NTJYHdCE0s1+AhpxznwKfp2n6KrAQyFOgktEMJMl7fwwgCILlNpfUwfkwDB8GblUURSfMbBWw28yWSTIgMLPZ/KNq9j2bsTkVSSPAZklfKIqiH4F1ZvbKxMTE2lqtdh+wdnx8fH0YhgvK1vPEA4srlcqbktYDw3kA9wPveO/flrQcuMHMhoFKeYZ5YsCCIAjuBu4FXg8yhYAW8LuZvW9mTeAUcOIifEYyXwIoLsGeAwcOrDx69OhcimnOrFixQmvWrDks6QlgOM8AgOr1+sLC80Uh8zG9wy5Y40ajsaosyzGzM5IuL8sBqtXqz4ODgyf7+/vv8N5/v2PHjtO5rq+vr16pVM42m83DM63aBCBpjyQVnJ01szFJY8DHwHrgD+BSM0PSqJmNTU5O7nXOnQaeDcPweFbYMNUnbvTe3wY8MtNbmwCGhoZuAdi2bduSVqv1ofe+L0mSr4pDAJxzbwDfxHH8VK5wzt2e/bzOOfdQHMev5bqsv1xAsQbaUqlUWmVZRtqpdXvvnzazjQMDA7WyrkzPACYnOza5jgEkSfKWpDPnzp3bmMs6teqeAXShJaltAExl4SUz27Bly5alzGcJupCaWccAkiTZL+lIrVbbwEXKQEfnOZJezHbDZWVdznwC6FSc0zSbzU/M7CPgnrIup2MAo6OjbVNWoGcA/HdYGZc0UdbRrg/k7Ny58++BgYFV27dvb7sNFi1a9GRZF8fxZ8DNJdm3wJ1FWZFiBmzXrl3nC8+UHRTpputG5mM6u4qi6KdsjQ56798Dxnocx/Lim/VBtIABl2TngdXAu3LOjZhZXdL12WHEl63+ZwIzO2Zm30k6JOfcM5LWmdmhWThXdv7zwILSAXY8W9JqMcUdCCTVzWxYTL1EVku6KTPsZjwBrAWuBp4H8l4/ATwG/ArsL8jbIUBm9nUcxx+UlT1xzm2KomhvWR5F0V7n3KayvBcd+0AX6mb2Q1loZseBelnei27VPk2j0VgGLA3DMDKzu7z3D5rZb4WdkEq6KgiCfZIOpmnaBE4mSTJSmuoCegbgnFsJ7AP+BBYDf2WXlkqpCFuSqsAS4B/gCuCBOI6/LE05g54BRFH0qJk10jR9PHOqLnZ5EbfCMHxOUtJsNl8uDyrSaaJp+vv7lwVB8AJw5WzegBkhcMp7v3FoaKjrMvQMIGcuV3AKV/de/AtJl8Kf0F0+HwAAAABJRU5ErkJggg==',
            deviceLinkCs:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsEAAA7BAbiRa+0AAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAACAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAANl2AQDoAwAA2XYBAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAABZKX6wz+x41AAABIBJREFUWEe1l1+IVFUcxz+/e2dnWt3KIipFIYKKTCGT/rwFA4mIFpIlhNSLbKlI69xz0QgZNntwmXtvLyUW2oOEuNL/oixF6kFLQnvZhKI/SroqRg/SH2d27/n14Nxl9rAzdxbzA8Nlft/z+53f/O45c35HaBKGoe/7PqqamXIZGhpKATZv3uy7WjtEhDRNqdVqKYAYY+4EEhGZB6SuQwd6VHU9V4LuAMbcAR3wVfV3oCLGmCPAt2ma7gVmAFkJxHGahIiItfYkgOd583U6pYN/fN9/BnhEwjA8q6oPATtUdY6IKOCpaje/qKf57GZsRkFERoH1IvKdhGH4G7BaVd9pNBrLisXiSmBZvV5f4/t+yfW+SizQVygU3heRNcBwlsAq4CNr7YciMh+4R1WHgYIb4SpRoOR53nLgCeBdrykIMA5cVNVPVbUGXADOXoPPaHMuAWh9BTsPHDiweGRkZDqLadosWLBAli5delxEXgCGswoASLlcntHyfUo2bdp0axAE927cuLHoagMDA7eEYfjAli1bbnS1jOYcEzusNYGOGGMeNsZ87vv+F8DeUqn0jTHmlRb99UKhcNBau3V8fPyrIAhenhxharpKIAzD+cBOVT2iqsvjOF5krV0rIiuq1aoXBMFzwF3AijiOV6rqk8C/bpyp6GqVq2q/qh6L4/jVzJYkyffAIoAgCO5X1dNxHJ8BiOP4VyBpjdGO3Ar09/cXgEc9z3vP1TJUdUREHgyCYJur5ZGbwKxZs+YBWGtHXS0jSZLdqrpHRJYbYz4IgmCNO6YduQlYa4vNZ8ezIY7j16y1K1X1hIgExpghd8xU5CYwc+bM0wCFQmG2q7kkSXIqjuNtIlIDlgwMDMx1x7jkJjA4OHgZOK6qq1ytHb7vHwEoFos3uZpLV7vAWvu253lvGGOqwL5Go/FHsVhcCKyz1r7oed5nwIZ6vX68r6/v+rGxsdXAud7e3h/dWC65FeBKaY9aazeo6kJgX7FYPAS8ZK39OkmS88AOICmVSsfGxsYOqepCEdk6ODjYcGO5dFUBmkkAR6vVak+9Xu/dvn37pUyLomgXsKtSqdzh+/7fURRdnOzdnkmHURRFi1s6omuFGGMmDiMJw/AU8Dhw0Fr7CXA5px3L+sauG9EWFLiu2Q8sAT4WY8yoqpZF5O5mM2Jdr/8ZT1VPqupPInJYjDHbRGS1qh7uYnJp9n8WKDkNbL25qHu6eI2eiJRVdVi4cpQuEZH7mo6dnBvAMmAu8BaQ9QQNoB84A3zWYp8KAURVf4ii6EtXzMUYsy4Mw92uPQzD3caYda49j67+BxzKqvqza1TVX4Cya8+j02qfoFKpzAFu930/VNXHrLVPq+q5lp2Qishsz/P2i8jBNE1rwPkkSdqeoBm5CRhjFgP7gT+BPuBS89JScBbhuIj0ADcAfwE3A09FUXTCCTmJ3ATCMHxWVStpmj7fnFQ6+GWLeNz3/TdFJKnVanvcQa20CzRBEARzPM/bBdw2jcurD1yw1q6N47jja8hNIGM6V3Baru55/AcO0+u/WDL6TgAAAABJRU5ErkJggg==',
        };
    }

    /**
     * List all LoRaWAN devices
     */
    async listDevices() {
        this.adapter.log[this.adapter.logtypes.deviceManager]?.(`listDevices for lorawan devices started`);
        const arrDevices = [];
        for (const [devEUI, deviceValue] of Object.entries(this.adapter.objectStore.lorawan.devices)) {
            // get Base IP for Bridge
            const baseIp = await this.adapter.getStateAsync(`${this.adapter.namespace}.info.lnsBaseIp`);
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${devEUI}`);
            const res = {
                id: devEUI,
                identifier: devEUI,
                name: deviceValue.object.common.name,
                icon: await this.getIcon(deviceValue),
                manufacturer: 'LoRaWAN',
                model: deviceValue.informations ? deviceValue.informations.devicetype.state.val : undefined, // - ${value.uplink.remaining.rxInfo[0].rssi.ts}`,
                status: await this.getStatus(deviceValue),
                hasDetails: true,
                backgroundColor: 'secondary',
                actions: [
                    {
                        id: 'rename',
                        icon: 'edit',
                        description: this.adapter.i18nTranslation['Rename this device'],
                        handler: async (_id, context) => await this.handleRenameDevice(_id, context, deviceValue),
                    },
                    {
                        id: 'config',
                        icon: 'settings',
                        description: this.adapter.i18nTranslation['Config this device'],
                        handler: async (_id, context) => await this.handleConfigDevice(_id, context, deviceValue),
                    },
                ],
            };
            res.customInfo = {
                id: devEUI,
                schema: {
                    type: 'panel',
                    items: {},
                },
            };
            // Check all entries in Informations.card
            if (deviceValue.informations?.card) {
                for (const [key, value] of Object.entries(deviceValue.informations?.card)) {
                    let card = structuredClone(value.rule.card);
                    card.name = value.object.common.name;
                    card = lodash.merge(card, value.object.native?.card);
                    if (card.possibleUnit && value.object.common.unit) {
                        if (card.possibleUnit !== value.object.common.unit) {
                            continue;
                        }
                    }
                    const preLabel = card.preLabel ?? '';
                    let label = '';
                    if (card.name) {
                        label = card.name;
                    } else if (card.label) {
                        label = card.label;
                    } else {
                        label = value.object._id.substring(value.object._id.lastIndexOf('.') + 1);
                    }
                    res.customInfo.schema.items[`_${key}`] = {
                        type: 'state',
                        oid: value.object._id,
                        foreign: true,
                        control: card.control,
                        label: preLabel + label,
                        digits: card.digits ?? undefined,
                        falseText: card.falseText ?? undefined,
                        trueText: card.trueText ?? undefined,
                    };
                }
            }
            // Check for enrties
            if (Object.keys(res.customInfo.schema.items).length === 0) {
                delete res.customInfo;
            } else {
                const items = res.customInfo.schema.items;
                const sortedItems = Object.keys(items)
                    .sort((a, b) => a.localeCompare(b))
                    .reduce((acc, key) => {
                        acc[key] = items[key];
                        return acc;
                    }, {});

                res.customInfo.schema.items = sortedItems;
            }
            // Select search in case of origin
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn: {
                    let applicationId = deviceValue.object.native.applicationName;
                    if (applicationId.includes('@')) {
                        applicationId = applicationId.substring(0, applicationId.indexOf('@'));
                    }
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    res.actions.push({
                        id: 'link',
                        icon: `data:image/png;base64,${this.icons.deviceLinkTtn}`,
                        url: `${baseIp.val}/console/applications/${applicationId}/devices/${deviceValue.object.native.deviceId}`,
                    });
                    break;
                }
                case this.adapter.origin.chirpstack:
                    if (deviceValue.uplink.remaining.deviceInfo?.tenantId) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        res.actions.push({
                            id: 'link',
                            icon: `data:image/png;base64,${this.icons.deviceLinkCs}`,
                            url: `${baseIp.val}/#/tenants/${deviceValue.uplink.remaining.deviceInfo.tenantId.state.val}/applications/${deviceValue.uplink.remaining.deviceInfo.applicationId.state.val}/devices/${deviceValue.uplink.remaining.deviceInfo.devEui.state.val}`,
                        });
                    }
                    break;
            }
            arrDevices.push(res);
        }
        return arrDevices;
    }

    /**
     *
     * @param deviceValue values of device
     */
    async getStatus(deviceValue) {
        // Check for logging
        this.adapter.log[this.adapter.logtypes.getStatus]?.(
            `get Status started with value: ${JSON.stringify(deviceValue)}`,
        );
        const status = {};
        if (!deviceValue.object.common.icon || deviceValue.object.common.icon.includes('offline')) {
            status.connection = 'disconnected';
        } else {
            status.connection = 'connected';
            if (deviceValue.informations?.rssi) {
                status.rssi = deviceValue.informations.rssi.state.val;
            }
            if (deviceValue.informations?.valueBattery) {
                status.battery = deviceValue.informations.valueBattery.state.val;
            }
        }
        return status;
    }

    /**
     *
     * @param deviceValue values of device
     */
    async getIcon(deviceValue) {
        const possibleIcons = {
            airCondition: 'airCondition',
            blind: 'blind',
            blindButtons: 'blindButtons',
            button: 'button',
            buttonSensor: 'buttonSensor',
            camera: 'camera',
            chart: 'chart',
            image: 'image',
            dimmer: 'dimmer',
            door: 'door',
            fireAlarm: 'fireAlarm',
            floodAlarm: 'floodAlarm',
            gate: 'gate',
            humidity: 'humidity',
            illuminance: 'illuminance',
            info: 'info',
            light: 'light',
            lock: 'lock',
            location: 'location',
            locationOne: 'locationOne',
            media: 'media',
            motion: 'motion',
            ct: 'ct',
            percentage: 'percentage',
            rgb: 'rgb',
            rgbSingle: 'rgbSingle',
            rgbwSingle: 'rgbwSingle',
            hue: 'hue',
            cie: 'cie',
            slider: 'slider',
            socket: 'socket',
            temperature: 'temperature',
            thermostat: 'thermostat',
            vacuumCleaner: 'vacuumCleaner',
            volume: 'volume',
            volumeGroup: 'volumeGroup',
            window: 'window',
            windowTilt: 'windowTilt',
            weatherCurrent: 'weatherCurrent',
            weatherForecast: 'weatherForecast',
            warning: 'warning',

            unknown: 'unknown',
            instance: 'instance',

            // Special matter types
            invalid: 'invalid',
            hub3: 'hub3',
            node: 'node',
            hub5: 'hub5',
            controller: 'controller',
        };
        if (deviceValue.detectedRoles) {
            if (deviceValue.detectedRoles['level.temperature']) {
                return possibleIcons.thermostat;
            } else if (deviceValue.detectedRoles['sensor.door']) {
                return possibleIcons.door;
            } else if (deviceValue.detectedRoles['sensor.window']) {
                return possibleIcons.window;
            } else if (deviceValue.detectedRoles['sensor.contact']) {
                return `/adapter/${this.adapter.name}/icons/sensor.contact.png`;
            } else if (deviceValue.detectedRoles['sensor.motion']) {
                return possibleIcons.motion;
            } else if (deviceValue.detectedRoles['value.temperature']) {
                if (deviceValue.detectedRoles['value.pressure']) {
                    return possibleIcons.weatherCurrent;
                }
                if (deviceValue.detectedRoles['value.humidity']) {
                    return possibleIcons.humidity;
                }
                return possibleIcons.temperature;

                // Energy
            } else if (deviceValue.detectedRoles['value.energy.produced']) {
                return `/adapter/${this.adapter.name}/icons/produced.png`;
            } else if (deviceValue.detectedRoles['value.energy.consumed']) {
                return `/adapter/${this.adapter.name}/icons/consumed.png`;
            } else if (deviceValue.detectedRoles['value.energy.active']) {
                return `/adapter/${this.adapter.name}/icons/energy.png`;
            } else if (deviceValue.detectedRoles['value.energy.reactive']) {
                return `/adapter/${this.adapter.name}/icons/energy.png`;
            } else if (deviceValue.detectedRoles['value.energy']) {
                return `/adapter/${this.adapter.name}/icons/power.png`;

                // Power
            } else if (deviceValue.detectedRoles['value.power.produced']) {
                return `/adapter/${this.adapter.name}/icons/produced.png`;
            } else if (deviceValue.detectedRoles['value.power.consumed']) {
                return `/adapter/${this.adapter.name}/icons/consumed.png`;
            } else if (deviceValue.detectedRoles['value.power.active']) {
                return `/adapter/${this.adapter.name}/icons/power.png`;
            } else if (deviceValue.detectedRoles['value.power.reactive']) {
                return `/adapter/${this.adapter.name}/icons/power.png`;
            } else if (deviceValue.detectedRoles['value.power']) {
                return `/adapter/${this.adapter.name}/icons/power.png`;
            }

            // Check informations
            if (deviceValue.informations['angle']) {
                return `/adapter/${this.adapter.name}/icons/angle.png`;
            } else if (deviceValue.informations['absoluteHumidity']) {
                return possibleIcons.humidity;
            }
        }
        return `/adapter/${this.adapter.name}/icons/lorawan.png`; //${value.object.common.icon}`,
    }

    /**
     *
     * @param id ID to rename
     * @param context context sendet from Backend
     * @param objectValue value of the device object
     */
    async handleRenameDevice(id, context, objectValue) {
        const result = await context.showForm(
            {
                type: 'panel',
                items: {
                    newName: {
                        type: 'text',
                        trim: false,
                        placeholder: '',
                    },
                },
            },
            {
                data: {
                    newName: objectValue.object.common.name,
                },
                title: this.adapter.i18nTranslation['Enter new name'],
            },
        );
        if (result?.newName === undefined) {
            return { refresh: false };
        }
        const obj = {
            common: {
                name: result.newName,
            },
        };
        const res = await this.adapter.extendObjectAsync(objectValue.object._id, obj);
        if (res === null) {
            this.adapter.log.warn(`Can not rename device ${id}: ${JSON.stringify(res)}`);
            return { refresh: false };
        }
        return { refresh: true };
    }

    /**
     *
     * @param id ID to rename
     * @param context context sendet from Backend
     * @param objectValue value of the device object
     */
    async handleConfigDevice(id, context, objectValue) {
        const result = await context.showForm(
            {
                type: 'panel',
                items: {
                    devicetype: {
                        type: 'text',
                        trim: false,
                        placeholder: '',
                    },
                },
            },
            {
                data: {
                    devicetype: objectValue.configuration.devicetype.state.val,
                },
                title: this.adapter.i18nTranslation['Enter new devicetype'],
            },
        );
        if (result?.devicetype === undefined) {
            return { refresh: false };
        }
        const res = await this.adapter.setStateAsync(
            objectValue.configuration.devicetype.object._id,
            result.devicetype,
        );
        if (res === null) {
            this.adapter.log.warn(`Can not set new devicetype ${id}: ${JSON.stringify(res)}`);
            return { refresh: false };
        }
        return { refresh: true };
    }

    /**
     * @param {string} id ID from device
     * @returns {Promise<import('@iobroker/dm-utils').DeviceDetails>} return the right value
     */
    async getDeviceDetails(id) {
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const uplinkItems = {};
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny & {digits?: number}>} */
        const downlinkItems = {};
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const deviceObjectItems = {};
        const data = {};
        const lastUplinkTs = new Date(
            this.adapter.objectStore.lorawan.devices[id].informations.lastUplink.state.ts,
        ).toLocaleString('de-DE', {
            weekday: 'long', // Mo
            year: 'numeric', // 2026
            month: '2-digit', // 01
            day: '2-digit', // 24
            hour: '2-digit', // 14
            minute: '2-digit', // 32
            second: '2-digit', // 10
        });
        uplinkItems['Timestamp_value'] = {
            type: 'staticInfo',
            label: 'LastUplink',
            size: 16,
            data: lastUplinkTs,
        };
        if (this.adapter.objectStore.lorawan.devices[id].informations.lastJoin?.state.lc) {
            const lastJoinedLc = new Date(
                this.adapter.objectStore.lorawan.devices[id].informations.lastJoin.state.lc,
            ).toLocaleString('de-DE', {
                weekday: 'long', // Mo
                year: 'numeric', // 2026
                month: '2-digit', // 01
                day: '2-digit', // 24
                hour: '2-digit', // 14
                minute: '2-digit', // 32
                second: '2-digit', // 10
            });
            uplinkItems['Join_value'] = {
                type: 'staticInfo',
                label: 'lastJoined',
                size: 16,
                data: lastJoinedLc,
            };
        }
        uplinkItems['uplinkDecodedHeader'] = {
            newLine: true,
            type: 'header',
            text: 'Uplink Decoded',
            size: 3,
        };
        uplinkItems['uplinkDecoded'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 30,
        };
        const sortedUplinkDecoded = this.sortObjectDeep(this.adapter.objectStore.lorawan.devices[id].uplink.decoded);
        data.uplinkDecoded = JSON.stringify(this.extractStateValues(sortedUplinkDecoded), null, 2);

        if (this.adapter.objectStore.lorawan.devices[id].informations.lastDownlink?.state.ts) {
            const lastDownlinkTs = new Date(
                this.adapter.objectStore.lorawan.devices[id].informations.lastDownlink.state.ts,
            ).toLocaleString('de-DE', {
                weekday: 'long', // Mo
                year: 'numeric', // 2026
                month: '2-digit', // 01
                day: '2-digit', // 24
                hour: '2-digit', // 14
                minute: '2-digit', // 32
                second: '2-digit', // 10
            });
            downlinkItems['Timestamp_value'] = {
                type: 'staticInfo',
                label: 'LastDownlink',
                size: 16,
                data: lastDownlinkTs,
            };
        }
        downlinkItems['downlinkControlHeader'] = {
            newLine: true,
            type: 'header',
            text: 'Downlink Control',
            size: 3,
        };
        const sorteddownlinkControl = this.sortObjectDeep(
            this.adapter.objectStore.lorawan.devices[id].downlink.control,
        );
        for (const downlink in this.extractStateValues(sorteddownlinkControl)) {
            const commonObject = this.adapter.objectStore.lorawan.devices[id].downlink.control[downlink].object.common;
            const idPrefix = this.adapter.objectStore.lorawan.devices[id].object._id;
            let oid = `${idPrefix}.downlink.control.${downlink}`;
            oid = this.adapter.removeNamespace(oid);
            downlinkItems[`Downlink_${downlink}`] = {
                type: 'state',
                digits: 2,
                label: downlink,
                oid: oid,
                ...(commonObject.min !== undefined && { min: commonObject.min }),
                ...(commonObject.max !== undefined && { max: commonObject.max }),
                ...(commonObject.step !== undefined && { step: commonObject.step }),
            };
        }
        /*
        downlinkItems['downlinkControl'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        }; 
        const sorteddownlinkControl = this.sortObjectDeep(
            this.adapter.objectStore.lorawan.devices[id].downlink.control,
        );
        data.downlinkControl = JSON.stringify(this.extractStateValues(sorteddownlinkControl), null, 2); */

        let subfolders = {};
        for (const [key, value] of Object.entries(this.adapter.objectStore.lorawan.devices[id].detectedRoles)) {
            if (key === 'state') {
                continue;
            }
            for (const subfolder in value) {
                if (!subfolder.startsWith('uplink') && subfolder !== 'downlink.control') {
                    continue;
                }
                if (!subfolders[subfolder]) {
                    subfolders[subfolder] = {};
                }
                subfolders[subfolder][key] = value[subfolder];
            }
        }
        subfolders = this.sortObjectDeep(subfolders);
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const roleItems = {};
        for (const subfolder in subfolders) {
            roleItems[subfolder] = {
                newLine: true,
                type: 'header',
                text: subfolder,
                size: 3,
            };
            const detectedRoles = Object.entries(subfolders[subfolder])
                .map(([key, value]) => `${key}(${value})`)
                .join('     ');
            roleItems[`${subfolder.replace(/\./g, '_')}Roles`] = {
                type: 'text',
                minRows: 2,
                readOnly: true,
            };
            data[`${subfolder.replace(/\./g, '_')}Roles`] = detectedRoles;
        }

        deviceObjectItems['DeviceObjectHeader'] = {
            newLine: true,
            type: 'header',
            text: 'DeviceObject',
            size: 3,
        };
        deviceObjectItems['DeviceObject'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        };
        data.DeviceObject = JSON.stringify(this.adapter.objectStore.lorawan.devices[id], null, 2);

        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {import('@iobroker/dm-utils').JsonFormSchema} */
        const schema = {
            type: 'tabs',
            tabsStyle: {
                minWidth: 850,
            },
            items: {
                uplinkTab: {
                    type: 'panel',
                    label: 'uplink',
                    items: uplinkItems,
                },
                downlinkTab: {
                    type: 'panel',
                    label: 'downlink',
                    items: downlinkItems,
                },
                roleTab: {
                    type: 'panel',
                    label: 'detectedRoles',
                    items: roleItems,
                },
                deviceTab: {
                    type: 'panel',
                    label: 'deviceObject',
                    items: deviceObjectItems,
                },
            },
        };
        return { id, schema, data };
    }

    /**
     *
     * @param object Object to sort
     */
    sortObjectDeep(object) {
        if (Array.isArray(object)) {
            return object.map(this.sortObjectDeep);
        }

        if (object !== null && typeof object === 'object') {
            return Object.keys(object)
                .sort((a, b) => a.localeCompare(b))
                .reduce((acc, key) => {
                    acc[key] = this.sortObjectDeep(object[key]);
                    return acc;
                }, {});
        }

        return object;
    }

    /**
     *
     * @param node Node to extract
     */
    extractStateValues(node) {
        const result = {};

        if (!node || typeof node !== 'object') {
            return result;
        }

        for (const [key, value] of Object.entries(node)) {
            if (key === 'object') {
                continue;
            }
            if (!value || typeof value !== 'object') {
                continue;
            }

            if (value.object?.type === 'state' && value.state) {
                const val = value.state.val;
                const unit = value.object.common?.unit;

                if (val !== undefined) {
                    result[key] = unit ? `${val} ${unit}` : val;
                }
                continue;
            }

            const sub = this.extractStateValues(value);
            if (Object.keys(sub).length > 0) {
                result[key] = sub;
            }
        }

        return result;
    }
}

module.exports = lorawanDevicesClass;
