'use strict';

const { DeviceManagement } = require('@iobroker/dm-utils');
const lorawanDevicesClass = require('./lorawanDevices');
const bridgeDevicesClass = require('./bridgeDevices');
const toIobDevicesClass = require('./toIobDevices');
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
        this.lorawanDevices = new lorawanDevicesClass(this.adapter);
        this.bridgeDevices = new bridgeDevicesClass(this.adapter);
        this.toIobDevices = new toIobDevicesClass(this.adapter);
    }

    /**
     * get Instance Info for Device Manager
     */
    async getInstanceInfo() {
        const info = await super.getInstanceInfo();
        if (!info.actions) {
            info.actions = [];
        }
        info.actions.push({
            id: 'configureBus',
            title: `Base Ip for Bridge devices: ${(await this.adapter.getStateAsync(`${this.adapter.namespace}.bridge.devices.bridgeBaseIp`)).val}`,
            icon: 'edit',
            description: 'Set the Base Ip for bride devices',
            handler: context => this.changeBaseIp(context),
        });
        return info;
    }

    /**
     *
     * @param context Context for Instance info
     */
    async changeBaseIp(context) {
        const result = await context.showForm(
            {
                type: 'panel',
                items: {
                    baseIp: {
                        type: 'text',
                        trim: false,
                        placeholder: '',
                    },
                },
            },
            {
                data: {
                    baseIp: (await this.adapter.getStateAsync(`${this.adapter.namespace}.bridge.devices.bridgeBaseIp`))
                        .val,
                },
                title: this.adapter.i18nTranslation['Change Base Ip for Bridge devices'],
                buttons: ['apply', 'cancel'],
            },
        );
        if (result && typeof result.baseIp === 'string') {
            this.adapter.setState(`${this.adapter.namespace}.bridge.devices.bridgeBaseIp`, result.baseIp, true);
        }
        return { refresh: true };
    }

    /**
     * List all LoRaWAN devices
     *
     * @param context Context of loadDevices
     */
    async loadDevices(context) {
        const deviceCount =
            this.adapter.objectStore.lorawan.devices.length +
            this.adapter.objectStore.bridge.devices.length +
            this.adapter.objectStore.toIob.devices.length;
        context.setTotalDevices(deviceCount);
        const lorawanresult = await this.lorawanDevices.listDevices();
        const bridgeresult = await this.bridgeDevices.listDevices();
        const toIobresult = await this.toIobDevices.listDevices();
        const sortedDevices = [...lorawanresult, ...bridgeresult, ...toIobresult].sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        for (const device of sortedDevices) {
            context.addDevice(device);
        }
    }

    /**
     *
     * @param id ID to rename
     * @param context context sendet from Backend
     * @param objectValue value of the device object
     */
    async handleRenameDevice(id, context, objectValue) {
        const result = await this.lorawanDevices.handleRenameDevice(id, context, objectValue);
        return result;
    }

    /**
     *
     * @param id ID to rename
     * @param context context sendet from Backend
     * @param objectValue value of the device object
     */
    async handleConfigDevice(id, context, objectValue) {
        const result = await this.lorawanDevices.handleConfigDevice(id, context, objectValue);
        return result;
    }

    /**
     * @param id ID from device
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    async getDeviceDetails(id) {
        if (this.adapter.objectStore.lorawan.devices[id]) {
            const result = await this.lorawanDevices.getDeviceDetails(id);
            return result;
        }
        // Bridge device
        if (this.adapter.objectStore.bridge.devices[id]) {
            const result = await this.bridgeDevices.getDeviceDetails(id);
            return result;
        }
        // ToIob device
        const result = await this.toIobDevices.getDeviceDetails(id);
        return result;
    }
}

module.exports = LoRaWANDeviceManagement;
