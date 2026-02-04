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
     * List all LoRaWAN devices
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    async listDevices() {
        const lorawanresult = await this.lorawanDevices.listDevices();
        const bridgeresult = await this.bridgeDevices.listDevices();
        const toIobresult = await this.toIobDevices.listDevices();
        return [...lorawanresult, ...bridgeresult, ...toIobresult].sort((a, b) => a.name.localeCompare(b.name));
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
