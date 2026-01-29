'use strict';

const { DeviceManagement } = require('@iobroker/dm-utils');
const lorawanDevicesClass = require('./lorawanDevices');
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
    }

    /**
     * List all LoRaWAN devices
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    async listDevices() {
        const result = await this.lorawanDevices.listDevices();
        return result;
    }

    /**
     *
     * @param deviceValue values of device
     */
    async getStatus(deviceValue) {
        const status = await this.lorawanDevices.getStatus(deviceValue);
        return status;
    }

    /**
     *
     * @param deviceValue values of device
     */
    async getIcon(deviceValue) {
        const icon = await this.lorawanDevices.getIcon(deviceValue);
        return icon;
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
        const result = await this.lorawanDevices.getDeviceDetails(id);
        return result;
    }
}

module.exports = LoRaWANDeviceManagement;
