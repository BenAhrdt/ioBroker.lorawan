/**
 * class to handle lorawan devices in device Manager
 */
class lorawanDevicesClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
    }

    /**
     * List all LoRaWAN devices
     */
    async listDevices() {
        const arrDevices = [];
        for (const [devEUI, deviceValue] of Object.entries(this.adapter.objectStore.lorawan.devices)) {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${devEUI}`);
            const res = {
                id: devEUI,
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
            if (deviceValue.informations.rssi) {
                status.rssi = deviceValue.informations.rssi.state.val;
            }
            if (deviceValue.informations.batteryPercent) {
                status.battery = deviceValue.informations.batteryPercent.state.val;
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
        /** @type {Record<string, import('@iobroker/dm-utils').ConfigItemAny>} */
        const downlinkItems = {};
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
        if (this.adapter.objectStore.lorawan.devices[id].join?.raw?.json?.state?.lc) {
            const lastJoinedLc = new Date(
                this.adapter.objectStore.lorawan.devices[id].join.raw.json.state.lc,
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
            maxRows: 40,
        };
        const sortedUplinkDecoded = this.sortObjectDeep(this.adapter.objectStore.lorawan.devices[id].uplink.decoded);
        data.uplinkDecoded = JSON.stringify(this.extractStateValues(sortedUplinkDecoded), null, 2);

        if (this.adapter.objectStore.lorawan.devices[id].downlink?.raw?.json?.state?.ts) {
            const lastDownlinkTs = new Date(
                this.adapter.objectStore.lorawan.devices[id].downlink.raw.json.state.ts,
            ).toLocaleString('de-DE', {
                weekday: 'long', // Mo
                year: 'numeric', // 2026
                month: '2-digit', // 01
                day: '2-digit', // 24
                hour: '2-digit', // 14
                minute: '2-digit', // 32
                second: '2-digit', // 10
            });
            downlinkItems['downlinkControlHeader'] = {
                newLine: true,
                type: 'header',
                text: 'Downlink Control',
                size: 3,
            };
            downlinkItems['Timestamp_value'] = {
                type: 'staticInfo',
                label: 'LastDownlink',
                size: 16,
                data: lastDownlinkTs,
            };
        }
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
        // eslint-disable-next-line jsdoc/check-tag-names
        /** @type {import('@iobroker/dm-utils').JsonFormSchema} */
        const schema = {
            type: 'tabs',
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
