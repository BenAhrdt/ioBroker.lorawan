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
        this.adapter.extendObject(`${this.basefolder}.bridgeBaseIp`, {
            type: 'state',
            common: {
                name: 'Ip from Home Assistant',
                type: 'string',
                role: 'url.blank',
                read: true,
                write: true,
                def: 'http://yourIP:Port',
            },
            native: {},
        });
    }

    // Check Version of message
    /**
     * @param message message from bridge to check Version
     */
    checkVersion(message) {
        const activeFunction = 'bridgeDeviceHandler.js - checkVersion';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        const version = '1.1.1';
        if (!message.version || message.version !== version) {
            this.adapter.log.warn(`You need to use version ${version} of the Home Assistant automation.`);
            return false;
        }
        return true;
    }

    // Generate Structure of incomming Data
    /**
     * @param message message from bridge to generate devices (eg.)
     */
    async setDeviceinfos(message) {
        const activeFunction = 'bridgeDeviceHandler.js - setDeviceIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (message.devices) {
                this.adapter.objectStore.setBridgeDeviceinfos(message);
                // Write in state
                await this.adapter.extendObject(`${this.basefolder}.receivedDeviceInfos`, {
                    type: 'state',
                    common: {
                        name: 'Device Id in Bridged Application',
                        type: 'string',
                        role: 'json',
                        read: true,
                        write: false,
                        def: '{}',
                    },
                    native: {},
                });
                await this.adapter.setState(
                    `${this.basefolder}.receivedDeviceInfos`,
                    JSON.stringify(message.devices),
                    true,
                );
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    // Generate Structure of incomming Data
    /**
     * @param message message from bridge to generate devices (eg.)
     */
    async generateDeviceStructure(message) {
        const activeFunction = 'bridgeDeviceHandler.js - generateDeviceStructure';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Query for Entity
            if (message.entities) {
                const available = {};
                for (const entity of Object.values(message.entities)) {
                    // EntityInfo
                    const entityInfo = this.generateStructure(entity);
                    if (!entityInfo) {
                        this.adapter.log.warn(`No EntityInfo found`);
                        return;
                    }

                    // Device
                    await this.adapter.extendObject(entityInfo.device.id, {
                        type: 'device',
                        common: { name: entity.device.name, statusStates: { onlineId: entityInfo.device.availableId } },
                        native: entity.device,
                    });

                    // Available
                    await this.adapter.extendObject(entityInfo.device.availableId, {
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
                        if (available[entityInfo.device.availableId] === undefined) {
                            if (entity.domain !== 'button' && entity.domain !== 'event' && entity.domain !== 'scene') {
                                available[entityInfo.device.availableId] = entity.available;
                                await this.adapter.setState(
                                    entityInfo.device.availableId,
                                    available[entityInfo.device.availableId],
                                    true,
                                );
                            }
                        } else if (available[entityInfo.device.availableId] === true) {
                            if (
                                entity.domain !== 'button' &&
                                entity.domain !== 'event' &&
                                entity.domain !== 'scene' &&
                                entity.available === false
                            ) {
                                available[entityInfo.device.availableId] = false;
                                await this.adapter.setState(entityInfo.device.availableId, false, true);
                            }
                        }
                    } else {
                        await this.adapter.setState(entityInfo.device.availableId, true, true);
                    }

                    // DeviceLink
                    const baseUrl = await this.adapter.getStateAsync(`${this.basefolder}.bridgeBaseIp`);
                    const url = `${baseUrl.val}:8123/config/devices/device/${entity.device.id}`;
                    await this.adapter.extendObject(entityInfo.device.devicelinkId, {
                        type: 'state',
                        common: {
                            name: 'Link to devicepage',
                            type: 'string',
                            role: 'url.blank',
                            read: true,
                            write: false,
                            def: url,
                        },
                        native: {},
                    });
                    await this.adapter.setState(entityInfo.device.devicelinkId, url, true);

                    // Channel
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
                    for (const state of entityInfo.state) {
                        await this.adapter.extendObject(state.id, {
                            type: 'state',
                            common: {
                                name: state.name,
                                type: state.type,
                                role: state.role,
                                read: state.read,
                                write: state.write,
                                unit: state.unit,
                                min: state.min,
                                max: state.max,
                                step: state.step,
                                states: state.states ? state.states : undefined,
                            },
                            native: { entity: entity, entityInfo: entityInfo, state: state },
                        });
                        let stateValue = state.val;
                        if (state.type === 'boolean') {
                            stateValue = state.val === 'on';
                        } else if (state.type === 'number') {
                            if (state.states && typeof state.val === 'string') {
                                stateValue = state.val;
                            } else {
                                stateValue = Number(state.val);
                            }
                        }
                        if (
                            this.adapter.objectExists(state.id) &&
                            stateValue != null &&
                            stateValue !== 0 &&
                            stateValue != '#000000'
                        ) {
                            await this.adapter.setState(state.id, stateValue, true);
                        }
                    }
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
                            if (entityInfo?.state) {
                                for (const state of entityInfo.state) {
                                    await this.adapter.delObjectAsync(state.id);
                                }
                            }
                            if (!checkDevices[entityInfo?.device.id]) {
                                checkDevices[entityInfo?.device.id] = {};
                            }
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

                            const deviceChannels = await this.adapter.getObjectViewAsync(
                                'system',
                                'channel',
                                deviceParams,
                            );

                            // No Channel found
                            if (deviceChannels.rows.length === 0) {
                                const deviceStates = await this.adapter.getObjectViewAsync(
                                    'system',
                                    'state',
                                    deviceParams,
                                );
                                if (deviceStates.rows.length !== 0) {
                                    for (const state of deviceStates.rows) {
                                        await this.adapter.delObjectAsync(state.id);
                                    }
                                }
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
            device.availableId = `${device.id}.available`;
            device.devicelinkId = `${device.id}.devicelink`;

            const channel = {
                id: `${device.id}.${entity.domain}`,
                name: entity.domain,
            };
            let clearStatename = entity.friendly_name;
            if (clearStatename.startsWith(`${device.name} `)) {
                clearStatename = clearStatename.substring(device.name.length + 1, clearStatename.length);
            }
            let state = [];
            /************************************************************************************************
             * **********************************************************************************************
             * *********************************************************************************************/
            if (entity.domain === 'light') {
                state.push({
                    id: `${channel.id}.on`,
                    name: clearStatename || stateId,
                    type: 'boolean',
                    role: this.detectRole(entity, type),
                    read: true,
                    write: true,
                    val: entity.state,
                });
                if (entity.attributes.brightness !== undefined) {
                    state.push({
                        id: `${channel.id}.brightness`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        read: true,
                        write: true,
                        val: entity.attributes.brightness,
                        isAttribute: true,
                    });
                }
                if (
                    entity.attributes.rgb_color !== undefined &&
                    entity.capabilities.supported_color_modes.includes('rgb')
                ) {
                    const colorObject = {
                        r: 0,
                        g: 0,
                        b: 0,
                    };
                    if (entity.attributes.rgb_color) {
                        colorObject.r = entity.attributes.rgb_color[0];
                        colorObject.g = entity.attributes.rgb_color[1];
                        colorObject.b = entity.attributes.rgb_color[2];
                    }
                    state.push({
                        id: `${channel.id}.color`,
                        name: clearStatename || stateId,
                        type: 'string',
                        role: this.detectRole(entity, type),
                        read: true,
                        write: true,
                        val: this.adapter.bridge?.rgbToHex(colorObject),
                        isAttribute: true,
                    });
                }
                if (
                    entity.attributes.color_temp_kelvin !== undefined &&
                    entity.capabilities.supported_color_modes.includes('color_temp')
                ) {
                    state.push({
                        id: `${channel.id}.colorTempKelvin`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        read: true,
                        write: true,
                        val: entity.attributes.color_temp_kelvin,
                        min: entity.attributes.min_color_temp_kelvin,
                        max: entity.attributes.max_color_temp_kelvin,
                        isAttribute: true,
                    });
                }
                if (entity.attributes.effect !== undefined) {
                    const states = entity.capabilities.effects.states;
                    const currentEffect = entity.attributes.effect;
                    state.push({
                        id: `${channel.id}.effect`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        read: true,
                        write: true,
                        states: entity.capabilities.effects.states ? entity.capabilities.effects.states : undefined,
                        val: this.getKeyOfState(currentEffect, states),
                        isAttribute: true,
                    });
                }
                /************************************************************************************************
                 * **********************************************************************************************
                 * *********************************************************************************************/
            } else if (entity.domain === 'cover') {
                state.push({
                    id: `${channel.id}.command`,
                    name: clearStatename || stateId,
                    type: 'number',
                    role: this.detectRole(entity, type),
                    read: true,
                    write: true,
                    states: entity.capabilities.commands.states ? entity.capabilities.commands.states : undefined,
                    val: entity.capabilities.commands.states
                        ? this.getKeyOfState(entity.state, entity.capabilities.commands.states)
                        : entity.state,
                    isAttribute: true,
                });
                if (entity.attributes.current_position !== undefined) {
                    state.push({
                        id: `${channel.id}.currentPosition`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        read: true,
                        write: false,
                        val: entity.attributes.current_position,
                        isAttribute: true,
                    });
                }
                /************************************************************************************************
                 * **********************************************************************************************
                 * *********************************************************************************************/
            } else if (entity.domain === 'climate') {
                const modes = {};
                for (const value of entity.attributes.hvac_modes) {
                    modes[value] = value;
                }
                state.push({
                    id: `${channel.id}.mode`,
                    name: clearStatename || stateId,
                    type: 'string',
                    role: this.detectRole(entity, type),
                    read: true,
                    write: true,
                    states: modes,
                    val: entity.state,
                    isAttribute: true,
                });
                if (entity.attributes.current_temperature !== undefined) {
                    state.push({
                        id: `${channel.id}.currentTemperature`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        unit: entity.unit_of_measurement || undefined,
                        read: true,
                        write: false,
                        val: entity.attributes.current_temperature,
                        isAttribute: true,
                    });
                }
                if (entity.attributes.temperature !== undefined) {
                    state.push({
                        id: `${channel.id}.temperature`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        unit: entity.unit_of_measurement || undefined,
                        read: true,
                        write: true,
                        min: entity.attributes.min_temp ? entity.attributes.min_temp : undefined,
                        max: entity.attributes.max_temp ? entity.attributes.max_temp : undefined,
                        step: entity.attributes.target_temp_step ? entity.attributes.target_temp_step : undefined,
                        val: entity.attributes.temperature,
                        isAttribute: true,
                    });
                }
                /************************************************************************************************
                 * **********************************************************************************************
                 * *********************************************************************************************/
            } else if (entity.domain === 'humidifier') {
                state.push({
                    id: `${channel.id}.on`,
                    name: clearStatename || stateId,
                    type: 'boolean',
                    role: this.detectRole(entity, type),
                    read: true,
                    write: true,
                    val: entity.state,
                });
                if (entity.attributes.current_humidity !== undefined) {
                    state.push({
                        id: `${channel.id}.currentHumidity`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        unit: entity.unit_of_measurement || undefined,
                        read: true,
                        write: false,
                        val: entity.attributes.current_humidity,
                        isAttribute: true,
                    });
                }
                if (entity.attributes.humidity !== undefined) {
                    state.push({
                        id: `${channel.id}.humidity`,
                        name: clearStatename || stateId,
                        type: 'number',
                        role: this.detectRole(entity, type),
                        unit: entity.unit_of_measurement || undefined,
                        read: true,
                        write: true,
                        min: entity.attributes.min_humidity ? entity.attributes.min_humidity : undefined,
                        max: entity.attributes.max_humidity ? entity.attributes.max_humidity : undefined,
                        val: entity.attributes.humidity,
                        isAttribute: true,
                    });
                }
                /************************************************************************************************
                 * **********************************************************************************************
                 * *********************************************************************************************/
            } else if (entity.domain === 'lock') {
                const commands = {
                    lock: 'lock',
                    unlock: 'unlock',
                };
                if ((entity.attributes.supported_features & 1) !== 0) {
                    commands.open = 'open';
                }
                state.push({
                    id: `${channel.id}.command`,
                    name: clearStatename || stateId,
                    type: 'string',
                    role: this.detectRole(entity, type),
                    read: true,
                    write: true,
                    states: commands,
                    val: entity.state,
                    isAttribute: true,
                });
            } else {
                state.push({
                    id: `${channel.id}.${stateId}`,
                    name: clearStatename || stateId,
                    type: type,
                    role: this.detectRole(entity, type),
                    unit: entity.unit_of_measurement || undefined,
                    read: entity.domain !== 'button',
                    write: this.isWritable(entity.domain),
                    assign: assign ? assign : undefined,
                    val: entity.state,
                });
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
     *
     * @param state Current state
     * @param states States with possible entries
     */
    getKeyOfState(state, states) {
        let commandNumber = null;

        for (const [key, value] of Object.entries(states)) {
            if (value === state) {
                commandNumber = Number(key);
                return commandNumber;
            }
        }
        return state;
    }

    /**
     * @param entity entity wich contains the deired informations
     */
    detectType(entity) {
        const activeFunction = 'bridgeDeviceHandler.js - detectType';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const s = entity.state;

            if (['on', 'off', 'true', 'false'].includes(s) || entity.domain === 'button') {
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
            if (['on', 'off'].includes(s) || entity.domain === 'button') {
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
                'button',
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
            if (entity.domain === 'button') {
                return 'button';
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
                    carbon_dioxide: 'value.co2',
                    pm25: 'value.pm25',
                };

                if (map[entity.device_class]) {
                    return map[entity.device_class];
                }
            }

            // Special detectionfor Air Quality (search in device model)
            if (entity.device.model?.includes('air quality')) {
                return 'value.airquality';
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
            if (idObject.native.state.isAttribute) {
                sendInfo.entity_id = idObject.native.entity.entity_id;
                if (idObject.native.entity.domain === 'light') {
                    // Brightness
                    if (id.endsWith('brightness')) {
                        sendInfo.attribute = 'brightness';
                        sendInfo.value = state.val;

                        // color
                    } else if (id.endsWith('color')) {
                        sendInfo.attribute = 'rgb_color';
                        const colorObject = this.adapter.bridge?.hexToRgb(state.val);
                        sendInfo.value = [colorObject.r, colorObject.g, colorObject.b];

                        // colorTemp
                    } else if (id.endsWith('colorTempKelvin')) {
                        sendInfo.attribute = 'color_temp_kelvin';
                        sendInfo.value = state.val;

                        // effect
                    } else if (id.endsWith('effect')) {
                        sendInfo.attribute = 'effect';
                        const effects = idObject.native.entity.capabilities.effects.states;
                        sendInfo.value = effects[state.val];
                    }
                    /***************************************************************************************
                     * *************************************************************************************
                     * ************************************************************************************/
                } else if (idObject.native.entity.domain === 'cover') {
                    // command
                    if (id.endsWith('command')) {
                        sendInfo.attribute = 'command';
                        const commands = idObject.native.entity.capabilities.commands.states;
                        sendInfo.value = commands[state.val];
                    }
                    /***************************************************************************************
                     * *************************************************************************************
                     * ************************************************************************************/
                } else if (idObject.native.entity.domain === 'climate') {
                    // mode
                    if (id.endsWith('mode')) {
                        sendInfo.attribute = 'mode';
                        sendInfo.value = state.val;

                        // color
                    } else if (id.endsWith('temperature')) {
                        sendInfo.attribute = 'temperature';
                        sendInfo.value = state.val;
                    }
                    /***************************************************************************************
                     * *************************************************************************************
                     * ************************************************************************************/
                } else if (idObject.native.entity.domain === 'humidifier') {
                    // humidity
                    if (id.endsWith('humidity')) {
                        sendInfo.attribute = 'humidity';
                        sendInfo.value = state.val;
                    }
                    /***************************************************************************************
                     * *************************************************************************************
                     * ************************************************************************************/
                } else if (idObject.native.entity.domain === 'lock') {
                    // humidity
                    if (id.endsWith('command')) {
                        sendInfo.attribute = 'command';
                        sendInfo.value = state.val;
                    }
                }
            } else {
                if (idObject.native.entityInfo.state.assign) {
                    sendInfo[idObject.native.entity.entity_id] = idObject.native.entityInfo.state.assign[state.val];
                } else {
                    sendInfo[idObject.native.entity.entity_id] = state.val;
                }
            }
            await this.adapter.bridge.publishId(`${this.adapter.namespace}.bridge.dataFromIob`, sendInfo, {
                retain: false,
            });
            await this.adapter.setState(`${this.adapter.namespace}.bridge.dataFromIob`, JSON.stringify(sendInfo), true);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }
}

module.exports = bridgeDeviceHandlerClass;
