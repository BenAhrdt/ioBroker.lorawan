/**
 * class to handle lorawan devices in device Manager
 */
class bridgeDevicesClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.icons = {
            deviceLink:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAADAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAAJ2TAADoAwAAnZMAAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAADS+8vrCE8zXAAABBVJREFUWEe1l1+IFXUUxz/fmd3VFYnKh0oUKkjBfJMiX3q4kJikEW0ZKUIQpWso3D2DD0UUPdnMrssubCb6oEi0mlEZZS74IPRvxWLFhCIpKLckKIiU9u7OnB68d7k7uffOXesDwzDnd87v953f7/xmzk9UiaIoDMMQd6+ZmrJ79+4UYNeuXWG+bTYkkaYpcRynADKzu4E+SUuBNB/QgHZ37+Zap0PAZN6hAaG7/wSUZWafAl+kafoWsACoTYFyQTOQpCzLLgAEQbDCW5k6uBqG4dPAA4qi6JK73w8MuftiSQ4E7l7kjdqr9yK+NdokjQPdks4oiqIfgI3ufrhSqazr6Oh4DFg3MTGxOQzDefnoGyQDFra1tb0raTMwXBPQBbyfZdl7klYAy919GGjL93CDODAvCIJHgEeBd4Jqg4Ap4Dd3/9DdY+AycOl/uMarYwmgfgn2njhxYtX58+dbSaaWWblypdauXXtW0lZguDYDACqVSgvqngvT09Nzl5ltMrMH8215qmNM77B6AXPCzDYFQXBO0uuSTprZ4e3btxf+MN2QADPbIukw8GIcx0vcfbWkDZ2dnU/lfWdjzgLM7HFJB4FtcRwPAJ4kydfu/jlwX95/NuYkYOfOnfMlxcArcRzvrdnNbLmk1cCXMyNmp2UB5XK5MwzDRcDNWZaNmtnHZrbMzJZKOg18MjY29nY+bjZaEmBmz4RhOJpl2VXgoqSuakZH7n6Lux+dmpraNDIyUngrFxZgZg9L2g/s6+/v/8Pdt7r7SeAMcE9vb++5JEle2LNnTyUf24jCAoCX3P2NOI4HAZIkOQucltQNHM87F6WwAEmLgG9rz2Z2ZxAEo8DpSqXSP9O7OIUFuPsxSS+b2XozWy/pM+DslStXugYGBlopZGZQWMDk5OSr7n5U0iFJB939WKVS6RoaGprz4OR/RkmSrKqriK7Ljh075ru7Dw4OTuTbCiIzm/4ZKYqiH4ENwEiWZceBv5uUY7U3Lvy9r8OB+dV6YA3wgcxs3N1LkpZVi5EsH/UfE7j7BXf/TtIpmdlrkja6+6kCg6ta/2XAvFwBO1HNqfZmywgEkkruPiyubak1ku6tBjYKrgDrgCXAPqCjzv4c8DPwUZ39egiQu3+TJMnJfGNTzGxbFEUH8vYoig6Y2ba8vRmFt2EdJXf/Pm9094tAKW9vRqNsn6ZcLi8Gbg/DMHL3h7Ise9Ldf6nbCamkO4IgOCJpJE3TGPi1r69vPNfVv2gqwMxWAUeA34GFwJ/VQ0tbLgmnJLUDNwF/AbcCTyRJ8lWuyxk0FRBF0RZ3L6dp+nx1UDWIqyXxVBiGb0rqi+P4UN6pntk6mqanp2dxEAT7gdtaOLyGwOUsy57t7e1tuAxNBdRo5QhO3dG9Gf8AB6O8qswBMWkAAAAASUVORK5CYII=',
            deviceLinkHa:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsAAAA7AAWrWiQkAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAACAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAAL92AQDoAwAAv3YBAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAADWFfpnQ7QNRwAABGNJREFUWEe1l12IVVUUx39rn5lRZiQwiKbBAiML1Lcgoqe6kOloX1AKIT5EFApac+/eM4/Orae5Z7xTEoMNSSASaBZ9Cir4EoUQ9mQGpfTppASa0TjNzD179XDPGc49984940c/ONyz1/5Y/7v2x1lbiHHOBUEQoKqJKZeRkZEIYGhoKMjWLYSIEEURYRhGAGKtvReoisjdQJTt0IZOVd1BfdBxYC7boA2Bqv4GFMVa+xVwKoqi94FuIAmBZDo1ICLivT8LYIxZrdcTOrgWBMELwMPinLugqg8B46raJyIKGFVdzD/qjH8X0zahQ0QmgR0i8o04534CtqjqwdnZ2f6urq5ngf6ZmZmtQRAsyfa+STywrKOj4yMR2QocSgQ8B3zivf9YRFYDD6jqIaAjO8JNosASY8wm4GngiIkrBKgBf6rq56oaApeAC//DMxn7ElL/0Kjq5WPHjr1+5syZpsXknOsOw/Ba1n4jrF27VtavX/+MiBiAJAIAUigUulNlqDvvA44657Zl626E2Mf8DksLWIhHgHuA4VslIk2ugDAMjwDDcbFBxMDAQK9z7mxSHhoaWmGtPZeUqUfwg1KptDFtS5MrgLqIAwuJAP5KvSMiXyfvg4ODjwJ3iMimdJs0TdvMOfda1pbiHLAqFkGtVjuuqkuzjRK89/3GmGHgvWKxuLxarV7JtmkSALyaNbRAgGFjzHkRWR6fJXjvAb4E2L17t5mamtpYqVQGnXNfiMiTwIHsQK2m4K02z49xGwWGvffngSthGK4Mw3Al8FgyyPT09AbginNuTFW7YwFNNEUgDMM3szbqU7MNuC9xHobhgYGBgV6g5fmgqhuDINinqt+LCN770VKptGpubm4y3a5VBJqInc8vwnhRQt3RbPJeq9WUevh7gQ0jIyMHK5XK6UqlctoY82GrxZgrwDm3eSHnY2NjF3t6ep5IlX+5evXqi+Vy+eLU1NSaxA5QqVTe7unp2Ze2sRgBwKn4/G5wnlAulxs+xRMTEzWA8fHxpqkpl8vTWVuugDAMfwXWtXJ+K0gL0L179zappi5i3r5r166lO3fuvOE8IfYx/8ET59zPwFPACe/9Z8C/OelYkjcuOhFNocDSOB9YB3wq1tpJVS2IyP1xMuKzvW4xRlXPquoPInJSrLVviMgWVT25COcS538eWJJJYGfiKe1Mh3gBjIgUVPWQAFhr14nImrhju86zQD+wApgAulL2l4HfgaMpeysEEFX9bnR09Hi2Mhdr7Xbn3P6s3Tm331q7PWvPI3cbtqCgqg3ffOon4nmgkLXn0W61z1MsFvuA3iAInKo+7r3frKp/pHZCJCJ3GWMOi8iJKIpC4GK1Wm0491uRK8Ba+yBwGLgMLAP+ji8tHZlFWBORTuA24B/gduD50dHRbzNDNpArwDm3TVWLURS9EjuVNv2SRVwLguAdEanmnaALDTRPqVTqM8a8C9x5HZfXALjkvX9pz549bachV0DC9VzBSV3d8/gPmqTaKZQ4dssAAAAASUVORK5CYII=',
        };
    }

    /**
     * List all bridge devices
     */
    async listDevices() {
        this.adapter.log[this.adapter.logtypes.deviceManager]?.(`listDevices for bridge devices started`);
        // get Base IP for Bridge
        const baseIp = await this.adapter.getStateAsync(`${this.adapter.namespace}.bridge.devices.bridgeBaseIp`);
        const arrDevices = [];
        for (const [deviceId, deviceValue] of Object.entries(this.adapter.objectStore.bridge.devices)) {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${deviceId}`);
            const res = {
                id: deviceId,
                name: deviceValue.name,
                icon: await this.getIcon(deviceValue),
                manufacturer: 'LoRaWAN-Bridge',
                model: undefined,
                status: await this.getStatus(deviceValue),
                hasDetails: true,
                backgroundColor: 'primary',
            };
            if (this.adapter.objectStore.bridge.receivedDeviceInfos[deviceId]) {
                res.actions = [
                    {
                        id: 'link',
                        icon: `data:image/png;base64,${this.adapter.config.BridgeType === 'HA' ? this.icons.deviceLinkHa : this.icons.deviceLink}`,
                        url: `${baseIp.val}/config/devices/device/${this.adapter.objectStore.bridge.receivedDeviceInfos[deviceId].deviceId}`,
                    },
                ];
            }
            res.customInfo = {
                id: deviceId,
                schema: {
                    type: 'panel',
                    items: {},
                },
            };
            if (deviceValue.entityType.light) {
                const ids = {};
                for (const discovery of deviceValue.discovery) {
                    if (discovery.topic.startsWith('homeassistant/light/')) {
                        if (discovery.ids.onOff) {
                            ids.onOf = discovery.ids.onOff;
                            res.customInfo.schema.items._onOff = {
                                type: 'state',
                                // The full state ID including namespace (foreign = true means it's an absolute ID).
                                oid: ids.onOf,
                                foreign: true,
                                // Render as an interactive switch control.
                                control: 'switch',
                                // Style the text based on the boolean value.
                                trueTextStyle: { color: 'green' },
                                falseTextStyle: { color: 'red' },
                                label: '⏻ An / Aus',
                                trueText: 'ON',
                                falseText: 'OFF',
                            };
                        }
                        if (discovery.ids.brightness) {
                            ids.brightness = discovery.ids.brightness;
                            res.customInfo.schema.items._brightness = {
                                type: 'state',
                                // The full state ID including namespace (foreign = true means it's an absolute ID).
                                oid: ids.brightness,
                                foreign: true,
                                // Render as an interactive switch control.
                                control: 'slider',
                                // Style the text based on the boolean value.
                                trueTextStyle: { color: 'green' },
                                falseTextStyle: { color: 'red' },
                                label: '🔆 Helligkeit',
                                min: 0,
                                max: 100,
                            };
                        }
                        if (discovery.ids.color) {
                            ids.color = discovery.ids.color;
                        }
                        break;
                    }
                }
            }
            // Check all entries in Informations.card
            if (deviceValue.informations?.card) {
                for (const [key, value] of Object.entries(deviceValue.informations?.card)) {
                    if (value.rule.card.possibleUnit && value.object.common.unit) {
                        if (value.rule.card.possibleUnit !== value.object.common.unit) {
                            continue;
                        }
                    }
                    const preLabel = value.rule.card.preLabel ?? '';
                    const label =
                        value.rule.card.label ?? value.object._id.substring(value.object._id.lastIndexOf('.') + 1);
                    res.customInfo.schema.items[`_${key}`] = {
                        type: 'state',
                        oid: value.object._id,
                        foreign: true,
                        control: value.rule.card.control,
                        label: preLabel + label,
                        digits: value.rule.card.digits ?? undefined,
                        falseText: value.rule.card.falseText ?? undefined,
                        trueText: value.rule.card.trueText ?? undefined,
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
            /*if (deviceValue.informations?.absoluteHumidity) {
                this.adapter.log.warn(JSON.stringify(deviceValue.informations?.absoluteHumidity));
                res.customInfo = {
                    id: deviceValue.informations.absoluteHumidity.object._id,
                    schema: {
                        type: 'panel',
                        items: {
                            _test: {
                                type: 'state',
                                oid: deviceValue.informations.absoluteHumidity.object._id,
                                foreign: true,
                                control: 'number',
                                trueTextStyle: { color: 'green' },
                                falseTextStyle: { color: 'red' },
                                label: 'Demo',
                                trueText: 'ON',
                                falseText: 'OFF',
                            },
                        },
                    },
                };
            }*/
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
        status.connection = 'connected';
        if (deviceValue.informations.valueBattery) {
            status.battery = deviceValue.informations.valueBattery.state.val;
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
        if (deviceValue.entityType) {
            if (deviceValue.entityType['clima']) {
                return possibleIcons.thermostat;
            } else if (deviceValue.entityType['light']) {
                return possibleIcons.light;
            } else if (deviceValue.entityType['humidifier']) {
                return possibleIcons.humidity;
            } else if (deviceValue.entityType['lock']) {
                return possibleIcons.lock;
            }
        }
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
     * @param {string} id ID from device
     * @returns {Promise<import('@iobroker/dm-utils').DeviceDetails>} return the right value
     */
    async getDeviceDetails(id) {
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const discoveryItems = {};
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny & {digits?: number}>} */
        const valueItems = {};
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const publishedItems = {};
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const subscribedItems = {};
        const data = {};

        const lastDiscover = new Date(
            this.adapter.objectStore.bridge.devices[id].informations.lastDiscover,
        ).toLocaleString('de-DE', {
            weekday: 'long', // Mo
            year: 'numeric', // 2026
            month: '2-digit', // 01
            day: '2-digit', // 24
            hour: '2-digit', // 14
            minute: '2-digit', // 32
            second: '2-digit', // 10
        });
        discoveryItems['Timestamp_value'] = {
            type: 'staticInfo',
            label: 'LastDiscover',
            size: 16,
            data: lastDiscover,
        };
        discoveryItems['DiscoveriesHeader'] = {
            newLine: true,
            type: 'header',
            text: 'Discoveries',
            size: 3,
        };
        discoveryItems['Discoveries'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        };
        const sortedDiscovery = [...this.adapter.objectStore.bridge.devices[id].discovery].sort(
            (a, b) => b.lastDiscover.ts - a.lastDiscover.ts,
        );
        data.Discoveries = JSON.stringify(sortedDiscovery, null, 2);

        if (this.adapter.objectStore.bridge.devices[id].informations.lastPublish) {
            const lastPublish = new Date(
                this.adapter.objectStore.bridge.devices[id].informations.lastPublish,
            ).toLocaleString('de-DE', {
                weekday: 'long', // Mo
                year: 'numeric', // 2026
                month: '2-digit', // 01
                day: '2-digit', // 24
                hour: '2-digit', // 14
                minute: '2-digit', // 32
                second: '2-digit', // 10
            });
            publishedItems['Timestamp_value'] = {
                type: 'staticInfo',
                label: 'LastPublish',
                size: 16,
                data: lastPublish,
            };
        }
        publishedItems['PublishedIdsHeader'] = {
            newLine: true,
            type: 'header',
            text: 'publishedIds',
            size: 3,
        };
        publishedItems['Published'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        };
        data.Published = JSON.stringify(this.adapter.objectStore.bridge.devices[id].PublishedIds, null, 2);

        if (this.adapter.objectStore.bridge.devices[id].informations.lastSubscribe) {
            const lastSubscribe = new Date(
                this.adapter.objectStore.bridge.devices[id].informations.lastSubscribe,
            ).toLocaleString('de-DE', {
                weekday: 'long', // Mo
                year: 'numeric', // 2026
                month: '2-digit', // 01
                day: '2-digit', // 24
                hour: '2-digit', // 14
                minute: '2-digit', // 32
                second: '2-digit', // 10
            });
            subscribedItems['Timestamp_value'] = {
                type: 'staticInfo',
                label: 'LastSubscribe',
                size: 16,
                data: lastSubscribe,
            };
        }
        subscribedItems['SubscribedTopicsHeader'] = {
            newLine: true,
            type: 'header',
            text: 'subscribedTopics',
            size: 3,
        };
        subscribedItems['Subscribed'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        };
        data.Subscribed = JSON.stringify(this.adapter.objectStore.bridge.devices[id].SubscribedTopics, null, 2);

        valueItems['ValueHeader'] = {
            newLine: true,
            type: 'header',
            text: 'actualDeviceValues',
            size: 3,
        };
        const sortedIds = Object.entries(this.extractStateValues(this.adapter.objectStore.bridge.devices[id].ids)).sort(
            ([keyA], [keyB]) =>
                keyA.localeCompare(keyB, 'de', {
                    numeric: true,
                    sensitivity: 'base',
                }),
        );
        for (const [key] of sortedIds) {
            const commonObject = this.adapter.objectStore.bridge.devices[id].ids[key].object.common;
            const name = this.adapter.objectStore.bridge.devices[id].ids[key].name;
            let longkey = key;
            if (key.startsWith(this.adapter.namespace)) {
                const devices = `.devices.`;
                const idFromDevEui = key.substring(key.indexOf(devices) + devices.length);
                // const dotAfterDevEui = idFromDevEui.indexOf(`.`);
                // longkey = idFromDevEui.substring(dotAfterDevEui + 1); changed 23.03.2026
                longkey = idFromDevEui;
                if (longkey.startsWith(`bridge.`)) {
                    longkey = longkey.substring(longkey.indexOf(`.`) + 1);
                }
            }
            if (!key.endsWith(name)) {
                longkey = `${longkey} (${name})`;
            }
            valueItems[`Value_${key}`] = {
                type: 'state',
                digits: 2,
                label: longkey,
                oid: key,
                foreign: true,
                ...(commonObject.min !== undefined && { min: commonObject.min }),
                ...(commonObject.max !== undefined && { max: commonObject.max }),
                ...(commonObject.step !== undefined && { step: commonObject.step }),
            };
        }
        /*valueItems['values'] = {
            type: 'text',
            readOnly: true,
            minRows: 10,
            maxRows: 40,
        };
        data.values = JSON.stringify(this.extractStateValues(this.adapter.objectStore.bridge.devices[id].ids), null, 2);*/

        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {import('@iobroker/dm-utils').JsonFormSchema} */
        const schema = {
            type: 'tabs',
            tabsStyle: {
                minWidth: 850,
            },
            items: {
                discoveryTab: {
                    type: 'panel',
                    label: 'discovery',
                    items: discoveryItems,
                },
            },
        };
        if (this.adapter.objectStore.bridge.devices[id].PublishedIds) {
            schema.items.publisehdTab = {
                type: 'panel',
                label: 'published',
                items: publishedItems,
            };
        }
        if (this.adapter.objectStore.bridge.devices[id].SubscribedTopics) {
            schema.items.subscribedTab = {
                type: 'panel',
                label: 'subscribed',
                items: subscribedItems,
            };
        }
        schema.items.valueTab = {
            type: 'panel',
            label: 'actualValues',
            items: valueItems,
        };
        // return the schema
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

module.exports = bridgeDevicesClass;
