/**
 * class to handle incomming messages from Bridge
 */
class bridgeDeviceHandlerClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.basefolder = 'bridge.devices';
        this.adapter.extendObject(this.basefolder, {
            type: 'folder',
            common: { name: 'Devices recieved from Bridge' },
            native: {},
        });
        this.adapter.extendObject(`${this.basefolder}.discoveredEntities`, {
            type: 'state',
            common: {
                name: 'Discovered Entities',
                type: 'string',
                role: 'json',
                read: true,
                write: false,
                def: '',
            },
            native: {},
        });
    }

    // Generate Structure of incomming Data
    /**
     * @param message message from bridge to generate devices (eg.)
     */
    async generateDeviceStructure(message) {
        const activeFunction = 'bridgeDeviceHandler.js - generateDeviceStructure';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const version = '1.0.2';
            if (!message.version || message.version !== version) {
                this.adapter.log.warn(`You need to use version ${version} of the Home Assistant automation.`);
                return;
            }
            // Query for Entity
            if (message.entities) {
                const available = {};
                for (const entity of Object.values(message.entities)) {
                    const entityInfo = this.generateStructure(entity);
                    if (!entityInfo) {
                        this.adapter.log.warn(`No EntityInfo found`);
                        return;
                    }
                    const availableId = `${entityInfo.device.id}.available`;
                    await this.adapter.extendObject(entityInfo.device.id, {
                        type: 'device',
                        common: { name: entity.device.name, statusStates: { onlineId: availableId } },
                        native: entity.device,
                    });
                    await this.adapter.extendObject(availableId, {
                        type: 'state',
                        common: {
                            name: 'Device available',
                            type: 'boolean',
                            role: 'indicator.reachable',
                            read: true,
                            write: false,
                            def: true,
                        },
                        native: {},
                    });
                    if (message.discovery) {
                        if (available[availableId] === undefined) {
                            if (entity.domain !== 'button' && entity.domain !== 'event' && entity.domain !== 'scene') {
                                available[availableId] = entity.available;
                                await this.adapter.setState(availableId, available[availableId], true);
                            }
                        } else if (available[availableId] === true) {
                            if (
                                entity.domain !== 'button' &&
                                entity.domain !== 'event' &&
                                entity.domain !== 'scene' &&
                                entity.available === false
                            ) {
                                available[availableId] = false;
                                await this.adapter.setState(availableId, false, true);
                            }
                        }
                    } else {
                        await this.adapter.setState(availableId, true, true);
                    }
                    const channel = entity.entity_id.substring(0, entity.entity_id.indexOf('.'));
                    await this.adapter.extendObject(entityInfo.channel.id, {
                        type: 'channel',
                        common: { name: 'Channel of Entity' },
                        native: {},
                    });
                    let unique_id = entity.unique_id;
                    if (entity.unique_id.startsWith(channel)) {
                        unique_id = unique_id.substring(channel.length + 1, unique_id.length);
                    }
                    unique_id.replace('.', '_');
                    await this.adapter.extendObject(entityInfo.state.id, {
                        type: 'state',
                        common: {
                            name: entityInfo.state.name,
                            type: entityInfo.state.type,
                            role: entityInfo.state.role,
                            read: entityInfo.state.read,
                            write: entityInfo.state.write,
                            unit: entityInfo.state.unit,
                        },
                        native: { entity: entity, entityInfo: entityInfo },
                    });
                    let state = entity.state;
                    if (entityInfo.state.type === 'boolean') {
                        state = entity.state === 'on';
                    } else if (entityInfo.state.type === 'number') {
                        state = Number(entity.state);
                    }
                    await this.adapter.setState(entityInfo.state.id, state, true);
                }
            }
            // Periodic discovery
            if (message.discovery) {
                const id = `${this.basefolder}.discoveredEntities`;

                // Read current data
                const discoveredEntities = await this.adapter.getStateAsync(id);
                const checkDevices = {};
                if (discoveredEntities.val) {
                    const entities = JSON.parse(discoveredEntities.val);
                    for (const entityId of Object.keys(entities)) {
                        if (!Object.keys(message.entities).includes(entityId)) {
                            const entityInfo = this.generateStructure(entities[entityId]);
                            await this.adapter.delObjectAsync(entityInfo?.state.id);
                            checkDevices[entityInfo?.device.id] = {};
                            if (entityInfo?.channel.id) {
                                checkDevices[entityInfo?.device.id][entityInfo?.channel.id] = {};
                            }
                        }
                    }
                    // Check for delete channels and devices
                    for (const deviceId of Object.keys(checkDevices)) {
                        let foundStateInAnyChannel = false;

                        // Check channel
                        for (const channelId of Object.keys(checkDevices[deviceId])) {
                            const channelParams = {
                                startkey: `${channelId}.`,
                                endkey: `${channelId}.\u9999`,
                            };

                            const channelStates = await this.adapter.getObjectViewAsync(
                                'system',
                                'state',
                                channelParams,
                            );

                            if (channelStates.rows.length > 0) {
                                // State found
                                foundStateInAnyChannel = true;
                                continue;
                            }

                            // No state
                            await this.adapter.delObjectAsync(channelId, { recursive: true });
                            this.adapter.log.debug(`Deleted empty channel: ${channelId}`);
                        }

                        // Check device
                        if (!foundStateInAnyChannel) {
                            const deviceParams = {
                                startkey: `${deviceId}.`,
                                endkey: `${deviceId}.\u9999`,
                            };

                            const deviceStates = await this.adapter.getObjectViewAsync('system', 'state', deviceParams);

                            if (deviceStates.rows.length === 0) {
                                await this.adapter.delObjectAsync(deviceId, { recursive: true });
                                this.adapter.log.debug(`Deleted empty device: ${deviceId}`);
                            }
                        }
                    }
                }
                await this.adapter.setState(id, JSON.stringify(message.entities), true);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param entity entity wich contains the desired informations
     */
    generateStructure(entity) {
        const activeFunction = 'bridgeDeviceHandler.js - generateStructure';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (!entity || !entity.entity_id) {
                return null;
            }

            const stateId = this.buildSafeStateId(entity);
            if (!stateId) {
                return null;
            }
            const type = this.detectType(entity);
            const assign = this.detectAssign(entity);

            const device = {
                id: `${this.adapter.namespace}.${this.basefolder}.${entity.device?.id ?? 'unknown_device'}`,
                name: entity.device?.name || 'Unknown Device',
                manufacturer: entity.device?.manufacturer || '',
                model: entity.device?.model || '',
            };

            const channel = {
                id: `${device.id}.${entity.domain}`,
                name: entity.domain,
            };
            let clearStatename = entity.friendly_name;
            if (clearStatename.startsWith(`${device.name} `)) {
                clearStatename = clearStatename.substring(device.name.length + 1, clearStatename.length);
            }
            const state = {
                id: `${channel.id}.${stateId}`,
                name: clearStatename || stateId,
                type: type,
                role: this.detectRole(entity, type),
                unit: entity.unit_of_measurement || undefined,
                read: true,
                write: this.isWritable(entity.domain),
            };
            if (assign) {
                state.assign = assign;
            }

            const meta = {
                entity_id: entity.entity_id,
                unique_id: entity.unique_id,
                device_class: entity.device_class,
                state_class: entity.state_class,
            };
            return {
                device: device,
                channel: channel,
                state: state,
                meta: meta,
            };
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param entity entity wich contains the deired informations
     */
    detectType(entity) {
        const activeFunction = 'bridgeDeviceHandler.js - detectType';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const s = entity.state;

            if (['on', 'off', 'true', 'false'].includes(s)) {
                return 'boolean';
            }
            if (!isNaN(s) && s !== '') {
                return 'number';
            }
            return 'string';
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param entity entity wich contains the deired informations
     */
    detectAssign(entity) {
        const activeFunction = 'bridgeDeviceHandler.js - detectAssign';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const s = entity.state;
            if (['on', 'off'].includes(s)) {
                return { true: 'on', false: 'off' };
            }
            if (['true', 'false'].includes(s)) {
                return { true: 'true', false: 'false' };
            }
            return null;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param domain domain, wich contains the type of entity
     */
    isWritable(domain) {
        const activeFunction = 'bridgeDeviceHandler.js - isWritable';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            return [
                'switch',
                'light',
                'input_boolean',
                'input_number',
                'input_select',
                'climate',
                'cover',
                'lock',
                'text',
            ].includes(domain);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param entity entity wich contains the desired informations
     * @param type type wich contains the type of ioBroker state
     */
    detectRole(entity, type) {
        const activeFunction = 'bridgeDeviceHandler.js - detectRole';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (entity.domain === 'switch') {
                return 'switch';
            }
            if (entity.domain === 'light') {
                return 'light';
            }

            if (entity.device_class) {
                const map = {
                    temperature: 'value.temperature',
                    humidity: 'value.humidity',
                    power: 'value.power',
                    energy: 'value.energy',
                    window: 'sensor.window',
                    door: 'sensor.door',
                    battery: 'value.battery',
                    voltage: 'value.voltage',
                    illuminance: 'value.brightness',
                    occupancy: 'sensor.motion',
                };
                if (map[entity.device_class]) {
                    return map[entity.device_class];
                }
            }

            if (type === 'number') {
                return 'value';
            }
            if (type === 'boolean') {
                return 'indicator';
            }
            return 'state';
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param entity entity wich contains the deired informations
     */
    buildSafeStateId(entity) {
        const activeFunction = 'bridgeDeviceHandler.js - buildSafeStateId';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // 1. Basis: unique_id oder entity_id
            const baseId = entity.unique_id || entity.entity_id;

            if (!baseId) {
                return null;
            }

            // if eg. switch in front => remove
            const parts = baseId.split('.');
            const raw = parts.length > 1 && parts[0] === entity.domain ? parts.slice(1).join('.') : baseId;

            // 3. remove ".
            return raw.replace(/\./g, '_');
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /************************************************************************************
     *
     ************************************************************************************/

    /**
     * @param id id wich is to send
     * @param state state of the id
     */
    async sendData(id, state) {
        const activeFunction = 'bridgeDeviceHandler.js - sendData';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const idObject = await this.adapter.getObjectAsync(id);
            const sendInfo = {};
            if (idObject.native.entityInfo.state.assign) {
                sendInfo[idObject.native.entity.entity_id] = idObject.native.entityInfo.state.assign[state.val];
            } else {
                sendInfo[idObject.native.entity.entity_id] = state.val;
            }
            await this.adapter.bridge.publishId(`${this.adapter.namespace}.bridge.dataFromIob`, sendInfo, {});
            await this.adapter.setState(`${this.adapter.namespace}.bridge.dataFromIob`, JSON.stringify(sendInfo), true);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }
}

module.exports = bridgeDeviceHandlerClass;
