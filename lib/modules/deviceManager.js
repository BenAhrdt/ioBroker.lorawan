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
                id: value.object._id,
                name: value.object.common.name,
                icon: 'cistern', //await this.getIcon(value),
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
                        handler: async (_id, context) => await this.handleRenameDevice(_id, context),
                    },
                ],
            };
            if (res.status.connection === 'connected') {
                res.actions.push({
                    id: 'config',
                    icon: 'settings',
                    description: this.adapter.i18nTranslation['Config this device'],
                    handler: async (_id, context) => await this.handleRenameDevice(_id, context),
                });
                res.actions.push({
                    id: 'Info',
                    icon: 'lines',
                    description: this.adapter.i18nTranslation['Info of this device'],
                    handler: async (_id, context) => await this.handleRenameDevice(_id, context),
                });
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
     * @param devicevalue values of device
     */
    async getIcon(devicevalue) {
        if (devicevalue.indicators) {
            if (devicevalue.indicators.isThermostat) {
                return 'thermostat';
            } else if (devicevalue.indicators.isDoor) {
                return 'door';
            } else if (devicevalue.indicators.isWindow) {
                return 'window';
            }
        }
        return 'node'; //`/adapter/${this.adapter.name}/icons/Node.png`; //${value.object.common.icon}`,
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
        const res = await this.adapter.extendForeignObjectAsync(id, obj);
        if (res === null) {
            this.adapter.log.warn(`Can not rename device ${id}: ${JSON.stringify(res)}`);
            return { refresh: false };
        }
        return { refresh: true };
    }

    // Possible strings for icons
}

module.exports = LoRaWANDeviceManagement;
