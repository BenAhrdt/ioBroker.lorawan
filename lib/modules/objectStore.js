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
            applications: {},
            devices: {},
            currentIds: {},
            roleAssignToDeviceInformations: {
                'value.battery': [{ name: 'valueBattery', subfolder: 'uplink.decoded' }],
            },
            assignToDeviceInformations: {
                AbsoluteHumidity: [{ name: 'absoluteHumidity' }],
                Angle: [{ name: 'angle' }],
                rssi: [{ name: 'rssi' }],
                devicetype: [{ name: 'devicetype', subfolder: 'configuration' }],
                json: [
                    { name: 'lastJoin', subfolder: 'join.raw' },
                    { name: 'lastUplink', subfolder: 'uplink.raw' },
                    { name: 'lastDownlink', subfolder: 'downlink.raw' },
                ],
            },
        };
        this.bridge = {
            devices: {},
            currentIds: {},
            roleAssignToDeviceInformations: {
                'value.battery': [{ name: 'valueBattery' }],
            },
            assignToDeviceInformations: {
                AbsoluteHumidity: [{ name: 'absoluteHumidity' }],
                angle: [{ name: 'angle' }],
                rssi: [{ name: 'rssi' }],
            },
        };
        this.toIob = {
            devices: {},
            currentIds: {},
            roleAssignToDeviceInformations: {
                'value.battery': [{ name: 'valueBattery' }],
            },
            assignToDeviceInformations: {
                AbsoluteHumidity: [{ name: 'absoluteHumidity' }],
                angle: [{ name: 'angle' }],
                rssi: [{ name: 'rssi' }],
            },
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
                    // ToIob devices
                } else if (adapterObject._id.startsWith(`${this.adapter.namespace}.bridge.devices`)) {
                    await this.initToIobObject(adapterObject._id, { payload: { object: adapterObject } });
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
            const roleAssignToDeviceInformations = this.lorawan.roleAssignToDeviceInformations;
            const assignToDeviceInformations = this.lorawan.assignToDeviceInformations;

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
                                if (Object.hasOwn(roleAssignToDeviceInformations, payload.object.common.role)) {
                                    roleAssign = roleAssignToDeviceInformations[payload.object.common.role];
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
                            if (Object.hasOwn(assignToDeviceInformations, key) || roleAssign) {
                                // Role Assign
                                if (roleAssign) {
                                    this.applyRules(roleAssign, idSubfolder, key, deviceObject, deviceId, idObject, id);
                                }
                                if (Object.hasOwn(assignToDeviceInformations, key)) {
                                    this.applyRules(
                                        assignToDeviceInformations[key],
                                        idSubfolder,
                                        key,
                                        deviceObject,
                                        deviceId,
                                        idObject,
                                        id,
                                    );
                                }
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
            const roleAssignToDeviceInformations = this.lorawan.roleAssignToDeviceInformations;
            const assignToDeviceInformations = this.lorawan.assignToDeviceInformations;

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
                            if (Object.hasOwn(roleAssignToDeviceInformations, payload.object.common.role)) {
                                roleAssign = roleAssignToDeviceInformations[payload.object.common.role];
                            }
                        }
                    }
                }
                // Following only type state
                if (idObject[id].object?.type === 'state') {
                    // Get state, if not present
                    if (!idObject[id].state) {
                        if (idObject[id].object._id) {
                            const state = await this.adapter.getStateAsync(idObject[id].object._id);
                            idObject[id].state = state;
                        }
                    }
                    // Assign to device
                    const key = parts[parts.length - 1];
                    if (Object.hasOwn(assignToDeviceInformations, key) || roleAssign) {
                        // Role Assign
                        if (roleAssign) {
                            this.applyRules(roleAssign, idSubfolder, key, deviceObject, deviceId, idObject, id);
                        }
                        if (Object.hasOwn(assignToDeviceInformations, key)) {
                            this.applyRules(
                                assignToDeviceInformations[key],
                                idSubfolder,
                                key,
                                deviceObject,
                                deviceId,
                                idObject,
                                id,
                            );
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }

    /********************************************************************************************************************************
     * ******************************************************************************************************************************
     * *************************************************************************************************************************** */

    /**
     * @param id id, for wich the structure is to build
     * @param DiscoveryObject Object to discover
     */
    async initBridgeObjectWithDiscover(id, DiscoveryObject) {
        const activeFunction = 'objectStore.js - initBridgeObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const deviceObject = this.bridge.devices;
            const idObject = this.bridge.currentIds;
            const roleAssignToDeviceInformations = this.bridge.roleAssignToDeviceInformations;
            const assignToDeviceInformations = this.bridge.assignToDeviceInformations;
            if (DiscoveryObject.payload) {
                const deviceId = DiscoveryObject.payload.device.identifiers[0];
                const deviceName = DiscoveryObject.payload.device.name;
                this.bridge.devices[deviceId] ??= { name: deviceName };

                // Assign Entity Type
                const topicparts = DiscoveryObject.topic.split('/');
                const entityType = topicparts[1];
                deviceObject[deviceId].entityType = {};
                deviceObject[deviceId].entityType[entityType] =
                    (deviceObject[deviceId].entityType[entityType] ?? 0) + 1;

                deviceObject[deviceId].discovery ??= [];
                deviceObject[deviceId].discovery.push(DiscoveryObject);
                deviceObject[deviceId].informations ??= {};
                deviceObject[deviceId].informations.lastDiscover = deviceObject[deviceId].discovery.reduce((a, b) =>
                    b.lastDiscover.ts > a.lastDiscover.ts ? b : a,
                ).lastDiscover.ts;

                // Assign the subscribed topics, if in object
                const setTopics = this.getSetTopicsFromPayload(DiscoveryObject.payload);
                for (const topic of setTopics) {
                    if (this.adapter.bridge.SubscribedTopics[topic]) {
                        deviceObject[deviceId].SubscribedTopics ??= {};
                        deviceObject[deviceId].SubscribedTopics[topic] ??= this.adapter.bridge.SubscribedTopics[topic];
                    }
                }
                // Iterate the ids
                for (const [key, id] of Object.entries(DiscoveryObject.ids)) {
                    // Assign id to publisehIds, if in object
                    if (this.adapter.bridge.PublishedIds[id]) {
                        deviceObject[deviceId].PublishedIds ??= {};
                        deviceObject[deviceId].PublishedIds[id] ??= this.adapter.bridge.PublishedIds[id];
                    }
                    // check id
                    if (await this.adapter.foreignObjectExists(id)) {
                        const parts = id.split('.').slice(2);
                        const idSubfolder = parts.slice(0, -1).join('.');
                        deviceObject[deviceId].ids ??= {};
                        deviceObject[deviceId].ids[id] ??= {};
                        idObject[id] = deviceObject[deviceId].ids[id];
                        idObject[id].name = idObject[id].name ? `${idObject[id].name}, ${key}` : key;
                        idObject[id].deviceId = deviceId;

                        // Get the role of id
                        const currentObject = await this.adapter.getForeignObjectAsync(id);
                        deviceObject[deviceId].ids[id].object = currentObject;
                        deviceObject[deviceId].detectedRoles ??= {};
                        deviceObject[deviceId].detectedRoles[currentObject.common.role] ??= {};
                        deviceObject[deviceId].detectedRoles[currentObject.common.role][id] ??= true;

                        // Get State of id
                        const currentState = await this.adapter.getForeignStateAsync(id);
                        deviceObject[deviceId].ids[id].state = currentState;

                        // Role Assign
                        let roleAssign = undefined;
                        if (Object.hasOwn(roleAssignToDeviceInformations, currentObject.common.role)) {
                            roleAssign = roleAssignToDeviceInformations[currentObject.common.role];
                        }

                        // Following only type state
                        if (idObject[id].object?.type === 'state') {
                            // Get state, if not present
                            if (!idObject[id].state) {
                                if (idObject[id].object._id) {
                                    const state = await this.adapter.getStateAsync(idObject[id].object._id);
                                    idObject[id].state = state;
                                }
                            }

                            // Assign to device
                            const key = parts[parts.length - 1];
                            if (Object.hasOwn(assignToDeviceInformations, key) || roleAssign) {
                                // Role Assign
                                if (roleAssign) {
                                    this.applyRules(roleAssign, idSubfolder, key, deviceObject, deviceId, idObject, id);
                                }
                                if (Object.hasOwn(assignToDeviceInformations, key)) {
                                    this.applyRules(
                                        assignToDeviceInformations[key],
                                        idSubfolder,
                                        key,
                                        deviceObject,
                                        deviceId,
                                        idObject,
                                        id,
                                    );
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }

    /**
     * @param id id, wich hast to update
     * @param options Object with payload / state
     */
    async updateBridgeObject(id, options = {}) {
        const activeFunction = 'objectStore.js - updateBridgeObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let { strip = 2, payload } = options;
            const deviceObject = this.bridge.devices;
            const idObject = this.bridge.currentIds;
            const roleAssignToDeviceInformations = this.bridge.roleAssignToDeviceInformations;
            const assignToDeviceInformations = this.bridge.assignToDeviceInformations;
            const deviceId = idObject[id].deviceId;
            const parts = id.split('.').slice(strip);
            const idSubfolder = parts.slice(0, -1).join('.');

            // Assign object before
            const objectBefore = structuredClone(idObject[id]);
            if (options?.payload) {
                // Assign payload
                for (const [name, value] of Object.entries(payload)) {
                    idObject[id][name] = value;
                }
                let roleAssign = undefined;
                // Update object
                if (payload.object) {
                    // Just Quere if role is not undefined
                    if (payload.object.common.role !== undefined) {
                        // Quere role !== role before
                        if (payload.object.common.role !== objectBefore?.object.common?.role) {
                            // delete on olde role and add at new role
                            delete deviceObject[deviceId].detectedRoles[objectBefore?.object.common?.role][id];
                            if (deviceObject[deviceId].detectedRoles[objectBefore?.object.common?.role].length === 0) {
                                delete deviceObject[deviceId].detectedRoles[objectBefore?.object.common?.role];
                            }
                            deviceObject[deviceId].detectedRoles[payload.object.common.role] ??= {};
                            deviceObject[deviceId].detectedRoles[payload.object.common.role][id] ??= true;
                            if (Object.hasOwn(roleAssignToDeviceInformations, payload.object.common.role)) {
                                roleAssign = roleAssignToDeviceInformations[payload.object.common.role];
                            }
                        }
                    }
                }

                // Following only type state
                if (idObject[id].object?.type === 'state') {
                    // Get state, if not present
                    if (!idObject[id].state) {
                        if (idObject[id].object._id) {
                            const state = await this.adapter.getStateAsync(idObject[id].object._id);
                            idObject[id].state = state;
                        }
                    }
                    // Assign to device
                    const key = parts[parts.length - 1];
                    if (Object.hasOwn(assignToDeviceInformations, key) || roleAssign) {
                        // Role Assign
                        if (roleAssign) {
                            this.applyRules(roleAssign, idSubfolder, key, deviceObject, deviceId, idObject, id);
                        }
                        if (Object.hasOwn(assignToDeviceInformations, key)) {
                            this.applyRules(
                                assignToDeviceInformations[key],
                                idSubfolder,
                                key,
                                deviceObject,
                                deviceId,
                                idObject,
                                id,
                            );
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }

    /**
     * @param rules Rules to check
     * @param idSubfolder Id of current subfolder
     * @param key Key of state
     * @param deviceObject Object of device
     * @param deviceId Id of device
     * @param idObject Object of ids
     * @param id Id of current state
     */
    applyRules(rules, idSubfolder, key, deviceObject, deviceId, idObject, id) {
        const rule = rules.find(r => !r.subfolder || idSubfolder.endsWith(r.subfolder));
        if (!rule) {
            return;
        }
        const name = rule.name ?? key;

        deviceObject[deviceId].informations ??= {};
        deviceObject[deviceId].informations[name] ??= idObject[id];
    }

    /**
     * @param payload Payload to search for set topics
     */
    getSetTopicsFromPayload(payload) {
        const topics = [];

        for (const value of Object.values(payload)) {
            if (typeof value === 'string' && value.endsWith('/set')) {
                topics.push(value);
            }
        }
        return topics;
    }

    /**
     * @param device Device from wich an id was published
     */
    setPublishForBridge(device) {
        const activeFunction = 'objectStore.js - setPublishForBridge';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const devices = this.bridge.devices;
            const deviceId = device.identifiers[0];
            if (devices[deviceId]?.PublishedIds) {
                devices[deviceId].informations ??= {};
                devices[deviceId].informations.lastPublish = Date.now();
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - device: ${JSON.stringify(device)}`);
        }
    }

    /**
     * @param device Device from wich an id was published
     */
    handleMessageForBridge(device) {
        const activeFunction = 'objectStore.js - handleMessageForBridge';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const devices = this.bridge.devices;
            const deviceId = device.identifiers[0];
            if (devices[deviceId]?.SubscribedTopics) {
                devices[deviceId].informations ??= {};
                devices[deviceId].informations.lastSubscribe = Date.now();
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - device: ${JSON.stringify(device)}`);
        }
    }

    /********************************************************************************************************************************
     * ******************************************************************************************************************************
     * *************************************************************************************************************************** */

    /**
     * @param id id, for wich the structure is to build
     * @param options eg. payload wich is set to last element in id
     */
    async initToIobObject(id, options = {}) {
        const activeFunction = 'objectStore.js - initHaDevicesObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let { strip = 4, payload } = options;

            // Get global values
            const deviceObject = this.toIob.devices;
            const idObject = this.toIob.currentIds;
            const roleAssignToDeviceInformations = this.toIob.roleAssignToDeviceInformations;
            const assignToDeviceInformations = this.toIob.assignToDeviceInformations;

            const parts = id.split('.').slice(strip);
            if (parts.length === 1 && payload?.object?.type === 'state') {
                return;
            }
            let node = deviceObject;
            const deviceId = parts[0];
            const idSubfolder = parts[1];
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
                                if (Object.hasOwn(roleAssignToDeviceInformations, payload.object.common.role)) {
                                    roleAssign = roleAssignToDeviceInformations[payload.object.common.role];
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
                            if (Object.hasOwn(assignToDeviceInformations, key) || roleAssign) {
                                // Role Assign
                                if (roleAssign) {
                                    this.applyRules(roleAssign, idSubfolder, key, deviceObject, deviceId, idObject, id);
                                }
                                if (Object.hasOwn(assignToDeviceInformations, key)) {
                                    this.applyRules(
                                        assignToDeviceInformations[key],
                                        idSubfolder,
                                        key,
                                        deviceObject,
                                        deviceId,
                                        idObject,
                                        id,
                                    );
                                }
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
}

module.exports = objectStoreClass;
