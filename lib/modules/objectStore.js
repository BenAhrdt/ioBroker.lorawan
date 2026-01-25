'use strict';

/**
 * Objectstore Class
 */
class objectStoreClass {
    /**
     * Initalize Class with Adapter
     *
     * @param adapter Adapter Reference
     */
    constructor(adapter) {
        this.adapter = adapter;

        // Objects
        this.devices = {};
        this.applications = {};
        this.currentIds = {};

        this.rolesToCheck = {
            'value.battery': {
                indicator: { name: 'isBatteryDevice', subfolder: '.uplink.decoded' },
                assignToDeviceInformations: { name: 'batteryPercent', subfolder: '.uplink.decoded' },
            },
            'level.temperature': {
                indicator: { name: 'isThermostat', subfolder: '.downlink.control' },
            },
            'sensor.door': {
                indicator: { name: 'isDoor', subfolder: '.uplink.decoded' },
            },
            'sensor.window': {
                indicator: { name: 'isWindow', subfolder: '.uplink.decoded' },
            },
        };
        this.assignToDeviceInformations = {
            rssi: true,
            devicetype: { name: 'devicetype', subfolder: '.configuration' },
            json: { name: 'lastUplink', subfolder: '.uplink.raw' },
        };
    }

    /**
     *  Funktion to get Devicestructure
     *
     */
    async generateDeviceObjects() {
        const activeFunction = 'objectStore.js - generateDeviceObjects';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Get the States
            const adapterObjects = await this.adapter.getAdapterObjectsAsync();
            for (const adapterObject of Object.values(adapterObjects)) {
                if (
                    !adapterObject._id.startsWith(`${this.adapter.namespace}.info`) &&
                    !adapterObject._id.startsWith(`${this.adapter.namespace}.bridge`)
                ) {
                    await this.generateObjectStructureFromId(adapterObject._id, { payload: { object: adapterObject } });
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id id, for wich the structure is to build
     * @param options eg. payload wich is set to last element in id
     */
    async generateObjectStructureFromId(id, options = {}) {
        const activeFunction = 'objectStore.js - generateObjectStructureFromId';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let { strip = 2, payload } = options;

            // Get global values
            const applicationObject = this.applications;
            const deviceObject = this.devices;
            const idObject = this.currentIds;

            const parts = id.split('.').slice(strip);
            let node = applicationObject;
            const deviceId = parts[2];
            const idWithoutLast = id.substring(0, id.length - parts[parts.length - 1].length - 1);
            for (let i = 0; i < parts.length; i++) {
                const key = parts[i];
                const isLast = i === parts.length - 1;

                if (isLast) {
                    if (payload !== undefined) {
                        if (!node[key]) {
                            node[key] = {};
                            if (!idObject[id]) {
                                idObject[id] = node[key];
                            }
                        }
                        for (const [name, value] of Object.entries(payload)) {
                            node[key][name] = value;
                        }
                        // Assign deviceObject
                        if (deviceId === key) {
                            if (!deviceObject[deviceId]) {
                                deviceObject[deviceId] = node[key];
                            }
                        }
                        let assign = undefined;
                        if (payload.object) {
                            if (Object.hasOwn(this.rolesToCheck, payload.object.common.role)) {
                                if (!deviceObject[deviceId].incators) {
                                    deviceObject[deviceId].incators = {};
                                }
                                if (this.rolesToCheck[payload.object.common.role].indicator) {
                                    if (typeof this.rolesToCheck[payload.object.common.role].indicator === 'string') {
                                        deviceObject[deviceId].incators[
                                            this.rolesToCheck[payload.object.common.role].indicator
                                        ] = true;
                                    } else if (
                                        typeof this.rolesToCheck[payload.object.common.role].indicator === 'object'
                                    ) {
                                        let name = key;
                                        if (
                                            this.rolesToCheck[payload.object.common.role].indicator.subfolder &&
                                            !idWithoutLast.endsWith(
                                                this.rolesToCheck[payload.object.common.role].indicator.subfolder,
                                            )
                                        ) {
                                            continue;
                                        }
                                        if (this.rolesToCheck[payload.object.common.role].indicator.name) {
                                            name = this.rolesToCheck[payload.object.common.role].indicator.name;
                                        }
                                        deviceObject[deviceId].incators[name] = true;
                                    }
                                    deviceObject[deviceId].incators[
                                        this.rolesToCheck[payload.object.common.role].indicator
                                    ] = true;
                                }
                                if (this.rolesToCheck[payload.object.common.role].assignToDeviceInformations) {
                                    assign = this.rolesToCheck[payload.object.common.role].assignToDeviceInformations;
                                }
                            }
                        }
                        // Following only type state
                        if (node[key].object && node[key].object.type === 'state') {
                            // Get state, if not present
                            if (!node[key].state) {
                                if (node[key].object._id) {
                                    const state = await this.adapter.getStateAsync(node[key].object._id);
                                    node[key].state = state;
                                }
                            }
                            // Assign to device
                            if (Object.hasOwn(this.assignToDeviceInformations, key) || assign) {
                                if (!deviceObject[deviceId].incators) {
                                    deviceObject[deviceId].incators = {};
                                }
                                let name = key;
                                if (assign) {
                                    if (typeof assign === 'string') {
                                        name = assign;
                                    } else if (typeof assign === 'object') {
                                        if (assign.subfolder && !idWithoutLast.endsWith(assign.subfolder)) {
                                            continue;
                                        }
                                        if (assign.name) {
                                            name = assign.name;
                                        }
                                    }
                                } else if (typeof this.assignToDeviceInformations[key] === 'string') {
                                    name = this.assignToDeviceInformations[key];
                                } else if (typeof this.assignToDeviceInformations[key] === 'object') {
                                    if (
                                        this.assignToDeviceInformations[key].subfolder &&
                                        !idWithoutLast.endsWith(this.assignToDeviceInformations[key].subfolder)
                                    ) {
                                        continue;
                                    }
                                    if (this.assignToDeviceInformations[key].name) {
                                        name = this.assignToDeviceInformations[key].name;
                                    }
                                }
                                if (!deviceObject[deviceId].informations) {
                                    deviceObject[deviceId].informations = {};
                                }
                                if (!deviceObject[deviceId].informations[name]) {
                                    deviceObject[deviceId].informations[name] = node[key];
                                }
                            }
                        }
                    } else {
                        node[key] ??= {};
                        if (!idObject[id]) {
                            idObject[id] = node[key];
                        }
                    }
                } else {
                    node[key] ??= {};
                    node = node[key];
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }
}

module.exports = objectStoreClass;
