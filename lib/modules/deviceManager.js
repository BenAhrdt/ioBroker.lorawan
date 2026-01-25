'use strict';

const { DeviceManagement } = require('@iobroker/dm-utils');

/**
 * Devicemanager Class
 */
class LoRaWANDeviceManagement extends DeviceManagement {
    /**
     * Initalize Class with Adapter
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
                manufacturer: value.checks
                    ? value.checks.lastUplink
                        ? new Date(value.checks.lastUplink.state.ts).toLocaleString('de-DE', {
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
                model: value.checks ? value.checks.devicetype.state.val : undefined, // - ${value.uplink.remaining.rxInfo[0].rssi.ts}`,
                status: await this.getStatus(value),
                hasDetails: undefined,
                actions: [
                    {
                        id: 'rename',
                        icon: 'fa-solid fa-pen',
                        description: this.adapter.i18nTranslation['Rename this device'],
                        handler: undefined, //async (_id, context) => await this.handleRenameDevice(_id, context),
                    },
                ],
            };
            if (res.status.connection === 'connected') {
                res.actions.push({
                    id: 'config',
                    icon: 'settings',
                    description: this.adapter.i18nTranslation['Config this device'],
                    handler: undefined, //async (_id, context) => await this.handleRenameDevice(_id, context),
                });
                res.actions.push({
                    id: 'Info',
                    icon: 'lines',
                    description: this.adapter.i18nTranslation['Info of this device'],
                    handler: undefined, //async (_id, context) => await this.handleRenameDevice(_id, context),
                });
            }
            arrDevices.push(res);
        }
        return arrDevices;
    }

    /**
     *
     * @param devicevalue values of device
     */
    async getStatus(devicevalue) {
        // Check for logging
        this.adapter.log[this.adapter.logtypes.getStatus]?.(
            `get Status started with value: ${JSON.stringify(devicevalue)}`,
        );
        const status = {};
        if (devicevalue.object.common.icon.includes('offline')) {
            status.connection = 'disconnected';
        } else {
            status.connection = 'connected';
            if (devicevalue.checks.rssi) {
                status.rssi = devicevalue.checks.rssi.state.val;
            }
            if (devicevalue.checks.batteryPercent) {
                status.battery = devicevalue.checks.batteryPercent.state.val ?? undefined;
            }
        }
        return status;
    }

    /**
     *
     * @param devicevalue values of device
     */
    async getIcon(devicevalue) {
        if (devicevalue.checks) {
            if (devicevalue.checks.isThermostat) {
                return 'thermostat';
            } else if (devicevalue.checks.isWindow) {
                return 'window';
            } else if (devicevalue.checks.isDoor) {
                return 'door';
            }
        }
        return `/adapter/${this.adapter.name}/icons/Node.png`; //${value.object.common.icon}`,
    }

    /**
     *
     * @param id id to rename
     * @param context context sendet from Backend
     */
    async handleRenameDevice(id, context) {
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
                    newName: '',
                },
                title: {
                    en: 'Enter new name',
                    de: 'Neuen Namen eingeben',
                    ru: 'Введите новое имя',
                    pt: 'Digite um novo nome',
                    nl: 'Voer een nieuwe naam in',
                    fr: 'Entrez un nouveau nom',
                    it: 'Inserisci un nuovo nome',
                    es: 'Ingrese un nuevo nombre',
                    pl: 'Wpisz nowe imię',
                    'zh-cn': '输入新名称',
                    uk: "Введіть нове ім'я",
                },
            },
        );
        if (result?.newName === undefined || result?.newName === '') {
            return { refresh: false };
        }
        const obj = {
            common: {
                name: result.newName,
            },
        };
        const res = await this.adapter.extendObjectAsync(id, obj);
        if (res === null) {
            this.adapter.log.warn(`Can not rename device ${id}: ${JSON.stringify(res)}`);
            return { refresh: false };
        }
        return { refresh: true };
    }
}

module.exports = LoRaWANDeviceManagement;
