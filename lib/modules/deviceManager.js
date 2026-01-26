'use strict';

const { DeviceManagement } = require('@iobroker/dm-utils');

/**
 * DeviceManager Class
 */
class LoRaWANDeviceManagement extends DeviceManagement {
    /**
     * Initialize Class with Adapter
     *
     * @param adapter Adapter Reference
     */
    constructor(adapter) {
        super(adapter);
        this.adapter = adapter;
    }
    /**
     * List all LoRaWAN devices
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    async listDevices() {
        const arrDevices = [];
        for (const [key, value] of Object.entries(this.adapter.objectStore.devices)) {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.listDevices]?.(`List device started for device: ${key}`);
            const res = {
                id: key,
                name: value.object.common.name,
                icon: await this.getIcon(value),
                manufacturer: value.informations
                    ? value.informations.lastUplink
                        ? new Date(value.informations.lastUplink.state.ts).toLocaleString('de-DE', {
                              weekday: 'short', // Mo
                              year: 'numeric', // 2026
                              month: '2-digit', // 01
                              day: '2-digit', // 24
                              hour: '2-digit', // 14
                              minute: '2-digit', // 32
                              second: '2-digit', // 10
                          })
                        : undefined
                    : undefined,
                model: value.informations ? value.informations.devicetype.state.val : undefined, // - ${value.uplink.remaining.rxInfo[0].rssi.ts}`,
                status: await this.getStatus(value),
                hasDetails: false,
                actions: [
                    {
                        id: 'rename',
                        icon: 'edit',
                        description: this.adapter.i18nTranslation['Rename this device'],
                        handler: async (_id, context) => await this.handleRenameDevice(_id, context, value),
                    },
                    {
                        id: 'config',
                        icon: 'settings',
                        description: this.adapter.i18nTranslation['Config this device'],
                        handler: async (_id, context) => await this.handleConfigDevice(_id, context, value),
                    },
                    {
                        id: 'Info',
                        icon: 'lines',
                        description: this.adapter.i18nTranslation['Info of this device'],
                        handler: async (_id, context) => await this.handleInfo(_id, context),
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
        if (deviceValue.object.common.icon.includes('offline')) {
            status.connection = 'disconnected';
        } else {
            status.connection = 'connected';
            if (deviceValue.informations.rssi) {
                status.rssi = deviceValue.informations.rssi.state.val;
            }
            if (deviceValue.informations.batteryPercent) {
                status.battery = deviceValue.informations.batteryPercent.state.val ?? undefined;
            }
        }
        return status;
    }

    /**
     *
     * @param deviceValue values of device
     */
    async getIcon(deviceValue) {
        if (deviceValue.indicators) {
            if (deviceValue.indicators.isThermostat) {
                return 'thermostat';
            } else if (deviceValue.indicators.isDoor) {
                return 'door';
            } else if (deviceValue.indicators.isWindow) {
                return 'window';
            }
        }
        return 'node'; //`/adapter/${this.adapter.name}/icons/Node.png`; //${value.object.common.icon}`,
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
     *
     * @param id ID to rename
     * @param context context sendet from Backend
     */
    async handleInfo(id, context) {
        let deviceInfo = await this.adapter.getStateAsync('info.deviceinformations');
        deviceInfo = JSON.parse(deviceInfo.val);
        await context.showForm(
            {
                type: 'panel',
                items: {
                    deviceinfos: {
                        type: 'text',
                        readOnly: true,
                        noClearButton: true,
                        trim: false,
                        placeholder: '',
                        minRows: 10,
                    },
                },
            },
            {
                data: {
                    deviceinfos: JSON.stringify(
                        deviceInfo[id].uplink.decoded,
                        Object.keys(deviceInfo[id].uplink.decoded).sort(),
                        2,
                    ),
                },
                title: this.adapter.i18nTranslation['Info of this device'],
            },
        );
        return { refresh: true };
    }
}

module.exports = LoRaWANDeviceManagement;
