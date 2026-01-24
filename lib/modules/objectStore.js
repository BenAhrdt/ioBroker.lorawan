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
            'value.battery': { checkIndicator: 'isBatteryDevice', assignToDevice: 'batteryPercent' },
        };
        this.assignToDevice = {
            rssi: true,
            devicetype: true,
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
            const params = {
                startkey: this.adapter.namespace,
                endkey: `${this.adapter.namespace}.\u9999`,
            };

            // Get the States
            const states = await this.adapter.getObjectViewAsync('system', 'state', params);
            for (const state of states.rows) {
                if (
                    !state.id.startsWith(`${this.adapter.namespace}.info`) &&
                    !state.id.startsWith(`${this.adapter.namespace}.bridge`)
                ) {
                    await this.generateObjectStructureFromId(state.id, { payload: { object: state.value } });
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
            const applicationId = parts[0];
            const deviceId = parts[2];
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
                        let assign = false;
                        if (payload.object) {
                            if (Object.hasOwn(this.rolesToCheck, payload.object.common.role)) {
                                if (!deviceObject[deviceId].checks) {
                                    deviceObject[deviceId].checks = {};
                                }
                                if (this.rolesToCheck[payload.object.common.role].checkIndicator) {
                                    deviceObject[deviceId].checks[
                                        this.rolesToCheck[payload.object.common.role].checkIndicator
                                    ] = true;
                                }
                                if (this.rolesToCheck[payload.object.common.role].assignToDevice) {
                                    assign = this.rolesToCheck[payload.object.common.role].assignToDevice;
                                }
                            }
                        }
                        // Get state, if not present
                        if (!node[key].state) {
                            if (node[key].object._id) {
                                const state = await this.adapter.getStateAsync(node[key].object._id);
                                node[key].state = state;
                            }
                        }
                        // Assign to device
                        if (Object.hasOwn(this.assignToDevice, key) || assign) {
                            if (!deviceObject[deviceId].checks) {
                                deviceObject[deviceId].checks = {};
                            }
                            let name = key;
                            if (assign) {
                                if (typeof assign === 'string') {
                                    name = assign;
                                }
                            } else if (typeof this.assignToDevice[key] === 'string') {
                                name = this.assignToDevice[key];
                            }

                            deviceObject[deviceId].checks[name] = node[key];
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
                    if (applicationId === key) {
                        const applicationObject = await this.adapter.getObjectAsync(parts[0]);
                        node.object = applicationObject;
                    }
                    if (deviceId === key) {
                        if (!deviceObject[deviceId]) {
                            deviceObject[deviceId] = node;
                            const devcieObject = await this.adapter.getObjectAsync(
                                `${parts[0]}.${parts[1]}.${parts[2]}`,
                            );
                            node.object = devcieObject;
                        }
                    }
                }
            }
            return applicationObject;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }
}

module.exports = objectStoreClass;
