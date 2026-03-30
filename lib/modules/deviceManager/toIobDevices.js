/**
 * class to handle lorawan devices in device Manager
 */
class toIobDevicesClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.icons = {
            deviceLink:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAADAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAAJ2TAADoAwAAnZMAAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAADS+8vrCE8zXAAABBVJREFUWEe1l1+IFXUUxz/fmd3VFYnKh0oUKkjBfJMiX3q4kJikEW0ZKUIQpWso3D2DD0UUPdnMrssubCb6oEi0mlEZZS74IPRvxWLFhCIpKLckKIiU9u7OnB68d7k7uffOXesDwzDnd87v953f7/xmzk9UiaIoDMMQd6+ZmrJ79+4UYNeuXWG+bTYkkaYpcRynADKzu4E+SUuBNB/QgHZ37+Zap0PAZN6hAaG7/wSUZWafAl+kafoWsACoTYFyQTOQpCzLLgAEQbDCW5k6uBqG4dPAA4qi6JK73w8MuftiSQ4E7l7kjdqr9yK+NdokjQPdks4oiqIfgI3ufrhSqazr6Oh4DFg3MTGxOQzDefnoGyQDFra1tb0raTMwXBPQBbyfZdl7klYAy919GGjL93CDODAvCIJHgEeBd4Jqg4Ap4Dd3/9DdY+AycOl/uMarYwmgfgn2njhxYtX58+dbSaaWWblypdauXXtW0lZguDYDACqVSgvqngvT09Nzl5ltMrMH8215qmNM77B6AXPCzDYFQXBO0uuSTprZ4e3btxf+MN2QADPbIukw8GIcx0vcfbWkDZ2dnU/lfWdjzgLM7HFJB4FtcRwPAJ4kydfu/jlwX95/NuYkYOfOnfMlxcArcRzvrdnNbLmk1cCXMyNmp2UB5XK5MwzDRcDNWZaNmtnHZrbMzJZKOg18MjY29nY+bjZaEmBmz4RhOJpl2VXgoqSuakZH7n6Lux+dmpraNDIyUngrFxZgZg9L2g/s6+/v/8Pdt7r7SeAMcE9vb++5JEle2LNnTyUf24jCAoCX3P2NOI4HAZIkOQucltQNHM87F6WwAEmLgG9rz2Z2ZxAEo8DpSqXSP9O7OIUFuPsxSS+b2XozWy/pM+DslStXugYGBlopZGZQWMDk5OSr7n5U0iFJB939WKVS6RoaGprz4OR/RkmSrKqriK7Ljh075ru7Dw4OTuTbCiIzm/4ZKYqiH4ENwEiWZceBv5uUY7U3Lvy9r8OB+dV6YA3wgcxs3N1LkpZVi5EsH/UfE7j7BXf/TtIpmdlrkja6+6kCg6ta/2XAvFwBO1HNqfZmywgEkkruPiyubak1ku6tBjYKrgDrgCXAPqCjzv4c8DPwUZ39egiQu3+TJMnJfGNTzGxbFEUH8vYoig6Y2ba8vRmFt2EdJXf/Pm9094tAKW9vRqNsn6ZcLi8Gbg/DMHL3h7Ise9Ldf6nbCamkO4IgOCJpJE3TGPi1r69vPNfVv2gqwMxWAUeA34GFwJ/VQ0tbLgmnJLUDNwF/AbcCTyRJ8lWuyxk0FRBF0RZ3L6dp+nx1UDWIqyXxVBiGb0rqi+P4UN6pntk6mqanp2dxEAT7gdtaOLyGwOUsy57t7e1tuAxNBdRo5QhO3dG9Gf8AB6O8qswBMWkAAAAASUVORK5CYII=',
            deviceLinkHa:
                'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsAAAA7AAWrWiQkAAAAZdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCA1LjEuMTGKCBbOAAAAuGVYSWZJSSoACAAAAAUAGgEFAAEAAABKAAAAGwEFAAEAAABSAAAAKAEDAAEAAAACAAAAMQECABEAAABaAAAAaYcEAAEAAABsAAAAAAAAAL92AQDoAwAAv3YBAOgDAABQYWludC5ORVQgNS4xLjExAAADAACQBwAEAAAAMDIzMAGgAwABAAAAAQAAAAWgBAABAAAAlgAAAAAAAAACAAEAAgAEAAAAUjk4AAIABwAEAAAAMDEwMAAAAADWFfpnQ7QNRwAABG1JREFUWEe1l11oHFUUx3/nTpKWpAgVxBiqULEKbd8EEZ80YKVp/QJtQUofRJQWWs3u3OSxWXzK3s2uFgk1WIRShNYqfvbBQl9EKUh9qhVqi5+NKUJrxW1MsnOPDzuTzs5md1Nbf7DszJlz7/nPuWfmnhFirLVBEASoamLqyPj4eAQwOjoaZK+1QkSIogjnXAQgYRjeC5RF5G4gyg5oQ7eq7qY+6SSwkHVoQ6CqvwI5CcPwK+BUFEXvAb1AkgLJDGpARMR7fxbAGLNebyR1cC0IgheAh8Vae1FVHwImVXVARBQwqrqcO+qO/5fjm9AlItPAbhH5Rqy1PwLbVfXw/Pz8UE9Pz7PA0Nzc3I4gCFZkR98kHljV1dX1oYjsAI4kAp4DPvbefyQi64EHVPUI0JWd4SZRYIUxZivwNHDMxBcEqAF/qOpnquqAS8DF/+E3HccSUndoVPXyxMRE4brY5bFx40Y5c+ZMUwFaa3udc9eydoAwDJ8REQOQZIBOVd+KwcHB3qzNWjsAHLfW7sxei1mMlRZwK3kEuAcYayMCsgKGh4f7rbVnk/PR0dE1YRieT/tYa9/P5/Nb0rYszrljwFh82iBieHi4/7rn0hn4M30iIl8nxyMjI48Cd4jI1rTPUjjnDrUSkabpMVPVlVlbgvd+yBgzBryby+VWl8vlK9Sz8lrWN8V5YF0sglqt9kX6YpMAEVkdvxvw3gN8CbBv3z5TrVa3FIvFEWvt5yLyJHAoHvZqeo4WCDBmjLmQNi61BFecc2udc2uBxxLj7OzsZuCKtbaiqr2xgIQ32/x+iH0UGPPeNwhoygCw5LOrqluCIDigqt+LCN77Uj6fX7ewsDDtnHsj6099aXYC9yXBnXOHOhahqs4nx7VaTamnvx/YPD4+frhYLJ4uFounjTEftCvGOPhiEcZF2USDgEqlMtPX1/dE6vznq1evvlgoFGaq1eqGtG+xWHyrr6/vQNqWYK3d1ip4pVKZue65RAYKhULD1jo1NVUDmJycbFqaQqEwm7XFnIrf+S3vPKFJwK3AOfcLsKlTcDICdDn7wd69e1fu2bNnsU/Yv39/tdGjTquNKI6xuHmJtfYn4CnghPf+U+CfDkKSvnHZjWgKBVbG/cAm4BMJw3BaVQdF5P64GfHZUbcYo6pnVfWciJyUMAxfF5HtqnpyGcEl7v88sCLTwM7FS9qdTnELjIgMquoRod4gbBKRDfHAdoPngSFgDTAF9KTsLwO/AcdT9qUQQFT1u1Kp1LAvLIswDHdZaw9m7dbag2EY7sraO/FfHsNBVW3oEai/QS8Ag1l7J9pV+yK5XG4A6A+CwKrq4977bar6e+pJiETkLmPMURE5EUWRA2bK5fJ0ZqomOgoIw/BB4ChwGVgF/BV/tHRlirAmIt3AbcDfwO3A86VS6dvMlA10FGCt3amquSiKXomDSptxSRHXgiB4W0TKnd6GrSZaJJ/PDxhj3gHuvIGP1wC45L1/aWJiou0ydBSQcCOf4KQ+3TvxL8HJ2q3LrikKAAAAAElFTkSuQmCC',
        };
    }

    /**
     * List all bridge devices
     */
    async listDevices() {
        this.adapter.log[this.adapter.logtypes.deviceManager]?.(`listDevices for toIob devices started`);
        // get Base IP for Bridge
        const baseIp = await this.adapter.getStateAsync(`${this.adapter.namespace}.bridge.devices.bridgeBaseIp`);
        const arrDevices = [];
        for (const [deviceId, deviceValue] of Object.entries(this.adapter.objectStore.toIob.devices)) {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${deviceId}`);
            const res = {
                id: deviceId,
                name: deviceValue.object.common.name,
                icon: await this.getIcon(deviceValue),
                manufacturer: 'LoRaWAN-ToIob',
                model: undefined,
                status: await this.getStatus(deviceValue),
                hasDetails: true,
                backgroundColor: '#1F7A7A',
            };
            res.actions = [
                {
                    id: 'link',
                    icon: `data:image/png;base64,${this.adapter.config.BridgeType === 'HA' ? this.icons.deviceLinkHa : this.icons.deviceLink}`,
                    url: `${baseIp.val}/config/devices/device/${deviceId}`,
                },
            ];
            res.customInfo = {
                id: deviceId,
                schema: {
                    type: 'panel',
                    items: {},
                },
            };
            if (deviceValue.light) {
                const ids = {};
                if (deviceValue.light.on) {
                    ids.on = deviceValue.light.on.object._id;
                    res.customInfo.schema.items._on = {
                        type: 'state',
                        // The full state ID including namespace (foreign = true means it's an absolute ID).
                        oid: ids.on,
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
                if (deviceValue.light.brightness) {
                    ids.brightness = deviceValue.light.brightness.object._id;
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
                    let label = '';
                    if (value.rule.card.label) {
                        label = value.rule.card.label;
                    } else if (value.object.common.name) {
                        label = value.object.common.name;
                    } else {
                        label = value.object._id.substring(value.object._id.lastIndexOf('.') + 1);
                    }
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
        if (!deviceValue.available?.state.val) {
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
        if (deviceValue['clima']) {
            return possibleIcons.thermostat;
        } else if (deviceValue['light']) {
            return possibleIcons.light;
        } else if (deviceValue['humidifier']) {
            return possibleIcons.humidity;
        } else if (deviceValue['lock']) {
            return possibleIcons.lock;
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
        }

        // Check informations
        if (deviceValue.informations) {
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
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny & {digits?: number}>} */
        const valueItems = {};
        const data = {};

        valueItems['ValueHeader'] = {
            newLine: true,
            type: 'header',
            text: 'actualDeviceValues',
            size: 3,
        };
        const sortedIds = Object.entries(this.extractStateObjects(this.adapter.objectStore.toIob.devices[id])).sort(
            ([, a], [, b]) =>
                a._id.localeCompare(b._id, 'de', {
                    numeric: true,
                    sensitivity: 'base',
                }),
        );
        for (const [key, value] of sortedIds) {
            const name = value.common.name;
            let longkey = key;
            if (key.startsWith(this.adapter.namespace)) {
                const devices = `.devices.${id}.`;
                const devEuiIndex = key.indexOf(devices) + devices.length;
                longkey = key.substring(devEuiIndex, key.length);
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
                ...(value.common.min !== undefined && { min: value.common.min }),
                ...(value.common.max !== undefined && { max: value.common.max }),
                ...(value.common.step !== undefined && { step: value.common.step }),
            };
        }

        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {import('@iobroker/dm-utils').JsonFormSchema} */
        const schema = {
            type: 'tabs',
            tabsStyle: {
                minWidth: 850,
            },
            items: {
                valueTab: {
                    type: 'panel',
                    label: 'actualValues',
                    items: valueItems,
                },
            },
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
    extractStateObjects(node) {
        const result = {};

        if (!node || typeof node !== 'object') {
            return result;
        }

        // Wenn dieses Objekt selbst ein State ist
        if (node.object?.type === 'state' && typeof node.object._id === 'string') {
            result[node.object._id] = node.object;
            return result;
        }

        // Rekursiv durch alle Properties laufen
        for (const value of Object.values(node)) {
            if (value && typeof value === 'object') {
                Object.assign(result, this.extractStateObjects(value));
            }
        }

        return result;
    }
}

module.exports = toIobDevicesClass;
