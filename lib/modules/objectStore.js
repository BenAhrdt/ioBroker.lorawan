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
        this.lorawan = {
            devices: {},
            applications: {},
            currentIds: {},
        };

        this.roleAssignToDeviceInformations = {
            'value.battery': { name: 'batteryPercent', subfolder: 'uplink.decoded' },
        };

        this.assignToDeviceInformations = {
            rssi: { name: 'rssi' },
            devicetype: { name: 'devicetype', subfolder: 'configuration' },
            json: { name: 'lastUplink', subfolder: 'uplink.raw' },
        };
    }

    /**
     *  Funktion to get Devicestructure
     *
     */
    async generateStoreObjects() {
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
                    await this.initLoraWanObject(adapterObject._id, { payload: { object: adapterObject } });
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
    async initLoraWanObject(id, options = {}) {
        const activeFunction = 'objectStore.js - initLoraWanObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let { strip = 2, payload } = options;

            // Get global values
            const applicationObject = this.lorawan.applications;
            const deviceObject = this.lorawan.devices;
            const idObject = this.lorawan.currentIds;

            const parts = id.split('.').slice(strip);
            let node = applicationObject;
            const deviceId = parts[2];
            const indexOfDeviceId = id.indexOf(deviceId);
            let idSubfolder = '';
            if (parts.length > 3) {
                idSubfolder = id.substring(
                    indexOfDeviceId + deviceId.length + 1,
                    id.length - parts[parts.length - 1].length - 1,
                );
            }
            for (let i = 0; i < parts.length; i++) {
                const key = parts[i];
                const isLast = i === parts.length - 1;

                if (isLast) {
                    if (payload !== undefined) {
                        // Assign object, if not present
                        node[key] ??= {};
                        idObject[id] ??= node[key];
                        // Assign payload entries
                        for (const [name, value] of Object.entries(payload)) {
                            node[key][name] = value;
                        }
                        // Assign deviceObject
                        if (deviceId === key) {
                            deviceObject[deviceId] ??= node[key];
                        }
                        let roleAssign = undefined;
                        if (payload.object) {
                            // Just Quere if role is not undefined
                            if (payload.object.common.role !== undefined) {
                                deviceObject[deviceId].detectedRoles ??= {};
                                deviceObject[deviceId].detectedRoles[payload.object.common.role] ??= {};
                                deviceObject[deviceId].detectedRoles[payload.object.common.role][idSubfolder] =
                                    (deviceObject[deviceId].detectedRoles[payload.object.common.role][idSubfolder] ??
                                        0) + 1;
                                if (Object.hasOwn(this.roleAssignToDeviceInformations, payload.object.common.role)) {
                                    roleAssign = this.roleAssignToDeviceInformations[payload.object.common.role];
                                }
                            }
                        }

                        // Following only type state
                        if (node[key].object?.type === 'state') {
                            // Get state, if not present
                            if (!node[key].state) {
                                if (node[key].object._id) {
                                    const state = await this.adapter.getStateAsync(node[key].object._id);
                                    node[key].state = state;
                                }
                            }
                            // Assign to device
                            if (Object.hasOwn(this.assignToDeviceInformations, key) || roleAssign) {
                                let name = key;
                                if (roleAssign) {
                                    if (roleAssign.subfolder && !idSubfolder.endsWith(roleAssign.subfolder)) {
                                        continue;
                                    } else if (roleAssign.name) {
                                        name = roleAssign.name;
                                    }
                                    // Assign, according to key
                                } else {
                                    if (
                                        this.assignToDeviceInformations[key].subfolder &&
                                        !idSubfolder.endsWith(this.assignToDeviceInformations[key].subfolder)
                                    ) {
                                        continue;
                                    } else if (this.assignToDeviceInformations[key].name) {
                                        name = this.assignToDeviceInformations[key].name;
                                    }
                                }
                                deviceObject[deviceId].informations ??= {};
                                deviceObject[deviceId].informations[name] ??= node[key];
                            }
                        }
                    } else {
                        node[key] ??= {};
                        idObject[id] ??= node[key];
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

    /**
     * @param id id, for wich the structure is to build
     * @param options eg. payload wich is set to last element in id
     */
    async updateLoraWanObject(id, options = {}) {
        const activeFunction = 'objectStore.js - updateLoraWanObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let { strip = 2, payload } = options;

            // Get global values
            const deviceObject = this.lorawan.devices;
            const idObject = this.lorawan.currentIds;

            // Check for object exists. No => init
            if (!idObject[id]) {
                await this.initLoraWanObject(id, options);
                return;
            }
            const parts = id.split('.').slice(strip);
            const deviceId = parts[2];
            const indexOfDeviceId = id.indexOf(deviceId);
            let idSubfolder = '';
            if (parts.length > 3) {
                idSubfolder = id.substring(
                    indexOfDeviceId + deviceId.length + 1,
                    id.length - parts[parts.length - 1].length - 1,
                );
            }

            //
            const objectBefore = structuredClone(idObject[id]);
            if (payload !== undefined) {
                // Assign payload
                for (const [name, value] of Object.entries(payload)) {
                    idObject[id][name] = value;
                }
                let roleAssign = undefined;
                // Assign Payload
                if (payload.object) {
                    // Just Quere if role is not undefined
                    if (payload.object.common.role !== undefined) {
                        // Quere role !== role before
                        if (payload.object.common.role !== objectBefore?.object.common?.role) {
                            // Count up new roles
                            deviceObject[deviceId].detectedRoles ??= {};
                            deviceObject[deviceId].detectedRoles[payload.object.common.role] ??= {};
                            deviceObject[deviceId].detectedRoles[payload.object.common.role][idSubfolder] =
                                (deviceObject[deviceId].detectedRoles[payload.object.common.role][idSubfolder] ?? 0) +
                                1;

                            // Count down / delete old role
                            // alte Rolle runterzählen
                            if (
                                objectBefore?.object?.common?.role !== undefined &&
                                deviceObject[deviceId].detectedRoles[objectBefore.object.common.role]?.[idSubfolder] !==
                                    undefined
                            ) {
                                deviceObject[deviceId].detectedRoles[objectBefore.object.common.role][idSubfolder]--;

                                if (
                                    deviceObject[deviceId].detectedRoles[objectBefore.object.common.role][
                                        idSubfolder
                                    ] <= 0
                                ) {
                                    delete deviceObject[deviceId].detectedRoles[objectBefore.object.common.role][
                                        idSubfolder
                                    ];
                                }

                                if (
                                    Object.keys(deviceObject[deviceId].detectedRoles[objectBefore.object.common.role])
                                        .length === 0
                                ) {
                                    delete deviceObject[deviceId].detectedRoles[objectBefore.object.common.role];
                                }
                            }
                            if (Object.hasOwn(this.roleAssignToDeviceInformations, payload.object.common.role)) {
                                roleAssign = this.roleAssignToDeviceInformations[payload.object.common.role];
                            }
                        }
                    }
                }
                // Following only type state
                if (idObject[id].object?.type === 'state') {
                    // Get state, if not present
                    if (idObject[id].state) {
                        if (idObject[id].object._id) {
                            const state = await this.adapter.getStateAsync(idObject[id].object._id);
                            idObject[id].state = state;
                        }
                    }
                    // Assign to device
                    const key = parts[parts.length - 1];
                    if (Object.hasOwn(this.assignToDeviceInformations, key) || roleAssign) {
                        let name = parts[parts.length - 1];
                        if (roleAssign) {
                            if (roleAssign.subfolder && !idSubfolder.endsWith(roleAssign.subfolder)) {
                                return;
                            } else if (roleAssign.name) {
                                name = roleAssign.name;
                            }
                            // Assign, according to key
                        } else {
                            if (
                                this.assignToDeviceInformations[key].subfolder &&
                                !idSubfolder.endsWith(this.assignToDeviceInformations[key].subfolder)
                            ) {
                                return;
                            } else if (this.assignToDeviceInformations[key].name) {
                                name = this.assignToDeviceInformations[key].name;
                            }
                        }
                        deviceObject[deviceId].informations ??= {};
                        deviceObject[deviceId].informations[name] ??= idObject[id];
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }
}

module.exports = objectStoreClass;
