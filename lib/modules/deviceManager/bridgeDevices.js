/**
 * class to handle lorawan devices in device Manager
 */
class bridgeDevicesClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
    }

    /**
     * List all bridge devices
     */
    async listDevices() {
        const arrDevices = [];
        for (const [deviceId, deviceValue] of Object.entries(this.adapter.objectStore.bridge.devices)) {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${deviceId}`);
            const res = {
                id: deviceId,
                name: deviceValue.name,
                icon: await this.getIcon(deviceValue),
                manufacturer: 'LoRaWAN',
                model: undefined,
                status: { connection: 'connected' },
                hasDetails: false,
                actions: undefined,
            };
            arrDevices.push(res);
        }
        return arrDevices;
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
            } else if (deviceValue.detectedRoles['lock']) {
                return possibleIcons.lock;
            }
        }
        return possibleIcons.hub5; //`/adapter/${this.adapter.name}/icons/Node.png`; //${value.object.common.icon}`,
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
}

module.exports = bridgeDevicesClass;
