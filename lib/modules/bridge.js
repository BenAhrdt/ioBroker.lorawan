const bridgeMqttClientClass = require('./bridgeMqttclient');
const bridgeDeviceHandlerClass = require('./bridgeDeviceHandler');
const schedule = require('node-schedule');
/* 
    Also er published irgendwie nicht den Mode => und es kommt virtual_Mode nicht subcribed....
*/
/**
 * this class handles the bridge to foreign system
 */
class bridgeClass {
    /**
     * @param adapter adapter data (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.InitDone = false; // Activates work
        /*********************************************************************
         * ************** Definition Assigns (externel Module) ***************
         * ******************************************************************/

        this.bridgeMqttClient = new bridgeMqttClientClass(this.adapter, this.adapter.config);
        this.bridgeDeviceHandler = new bridgeDeviceHandlerClass(this.adapter);

        // Structure of actual vaulues in Bridge (till las start of Adapter)
        this.CheckedIds = {};
        this.OldDiscoveredIds = {};
        this.DiscoveredIds = {};
        this.SubscribedTopics = {};
        this.PublishedIds = {};
        this.VitualIds = {};
        this.Notifications = {};
        this.BridgeDiscoveryPrefix = {
            HA: 'homeassistant/',
        };
        this.ForeignBridgeMembers = {};
        this.MinTime = 100; // ms between publish and subscribe same value
        this.DiscoveryCronjob = {};
        this.EndingSet = '/set';
        this.EndingState = '/state';
        this.EndingVirtualClimate = '.virtual_climate';
        this.EndingVirtualHumidifier = '.virtual_humiditier';
        this.EndingVirtualCover = '.virtual_cover';
        this.EndingVirtualLock = '.virtual_lock';
        this.EndingVirtualLight = '.virtual_light';
        this.EndingVirtualMode = '.virtual_mode';
        this.NotificationId = '.notification';
        this.GeneralId = '.general';
        this.OfflineId = '.offline';
        this.OnlineId = '.online';
        this.EndingNotification = '.notification';
        this.ClimateEntityType = 'climate';
        this.HumidifierEntityType = 'humidifier';
        this.LightEntityType = 'light';
        this.DeHumidifierEntityType = 'dehumidifier';
        this.NotificationEntityType = 'device_automation';
        this.CoverEntityType = 'cover';
        this.LockEntityType = 'lock';
        this.MaxValueCount = 5;
        this.Words = {
            notification: 'notification',
            general: 'general',
            offline: 'offline',
            online: 'online',
        };

        this.Notificationlevel = {
            all: 'allNotifications',
            bridgeConnection: 'bridgeConnection',
            newDiscover: 'newDiscover',
            deviceState: 'deviceState',
        };

        // Timeoutput always like german view
        this.Timeoutput = {
            Argument: 'de-DE',
            Format: {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            },
        };
        this.discoveredDevices = {};
        this.oldDiscoveredDevices = {};

        // Unitmapping zur Zuweisung der passenden Unit, wenn diese falsch geschrieben ist
        this.unitMap = {
            '°C': { device_class: 'temperature' },
            '°F': { device_class: 'temperature' },
            K: { device_class: 'temperature' },

            lx: { device_class: 'illuminance' },

            V: { device_class: 'voltage' },
            mV: { device_class: 'voltage' },
            kV: { device_class: 'voltage' },

            A: { device_class: 'current' },
            mA: { device_class: 'current' },

            W: { device_class: 'power' },
            kW: { device_class: 'power' },

            VA: { device_class: 'apparent_power' },
            kVA: { device_class: 'apparent_power' },

            var: { device_class: 'reactive_power' },
            kvar: { device_class: 'reactive_power' },

            Wh: { device_class: 'energy', state_class: 'total_increasing' },
            kWh: { device_class: 'energy', state_class: 'total_increasing' },
            MWh: { device_class: 'energy', state_class: 'total_increasing' },

            'm³': { device_class: 'gas', state_class: 'total_increasing' },
            'ft³': { device_class: 'gas', state_class: 'total_increasing' },

            L: { device_class: 'water', state_class: 'total_increasing' },
            mL: { device_class: 'volume' },
            gal: { device_class: 'volume' },

            'L/min': { device_class: 'volumetric_flow_rate' },
            'L/s': { device_class: 'volumetric_flow_rate' },
            'm³/h': { device_class: 'volumetric_flow_rate' },

            Pa: { device_class: 'pressure' },
            hPa: { device_class: 'pressure' },
            kPa: { device_class: 'pressure' },
            mbar: { device_class: 'pressure' },
            bar: { device_class: 'pressure' },
            psi: { device_class: 'pressure' },

            ppm: { device_class: 'carbon_dioxide' },
            ppb: { device_class: 'volatile_organic_compounds_parts' },
            'µg/m³': { device_class: 'volatile_organic_compounds' },

            'W/m²': { device_class: 'irradiance' },
            mm: { device_class: 'precipitation' },
            'mm/h': { device_class: 'precipitation_intensity' },

            dB: { device_class: 'sound_pressure' },
            dBm: { device_class: 'signal_strength' },

            'm/s': { device_class: 'speed' },
            'km/h': { device_class: 'speed' },
            mph: { device_class: 'speed' },
            kn: { device_class: 'speed' },

            m: { device_class: 'distance' },
            km: { device_class: 'distance' },
            mi: { device_class: 'distance' },
            ft: { device_class: 'distance' },

            g: { device_class: 'weight' },
            kg: { device_class: 'weight' },

            'bit/s': { device_class: 'data_rate' },
            'kbit/s': { device_class: 'data_rate' },
            'Mbit/s': { device_class: 'data_rate' },
            'Gbit/s': { device_class: 'data_rate' },

            B: { device_class: 'data_size' },
            kB: { device_class: 'data_size' },
            MB: { device_class: 'data_size' },
            GB: { device_class: 'data_size' },

            Hz: { device_class: 'frequency' },
            kHz: { device_class: 'frequency' },
            MHz: { device_class: 'frequency' },

            ms: { device_class: 'duration' },
            s: { device_class: 'duration' },
            min: { device_class: 'duration' },
            h: { device_class: 'duration' },
        };
    }

    /*********************************************************************
     * ********************* Message vom der Bridge **********************
     * ******************************************************************/

    /**
     * @param topic topic of the foreign system message
     * @param message message of the foreign system
     */
    async handleMessage(topic, message) {
        const activeFunction = 'bridge.js - handleMessage';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.SubscribedTopics[topic]) {
                // safe old values (10 last values)
                if (this.SubscribedTopics[topic].values) {
                    if (!this.SubscribedTopics[topic].oldValues) {
                        this.SubscribedTopics[topic].oldValues = [];
                    }
                    if (this.SubscribedTopics[topic].oldValues.length >= this.MaxValueCount) {
                        this.SubscribedTopics[topic].oldValues.pop();
                    }
                    this.SubscribedTopics[topic].oldValues.unshift(
                        structuredClone(this.SubscribedTopics[topic].values),
                    );
                }
                if (!this.SubscribedTopics[topic].values) {
                    this.SubscribedTopics[topic].values = {};
                }
                this.SubscribedTopics[topic].values.val = message;
                this.SubscribedTopics[topic].values.ts = Date.now();
                this.SubscribedTopics[topic].values.time = new Date(Date.now()).toLocaleString(
                    this.Timeoutput.Argument,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    this.Timeoutput.Format,
                );
                if (this.SubscribedTopics[topic].id.endsWith(this.EndingVirtualMode)) {
                    this.adapter.log.debug(
                        `The value ${message} is assigned to virtual id: ${this.SubscribedTopics[topic].id}`,
                    );
                    this.VitualIds[this.SubscribedTopics[topic].id] = message;
                    // Return the virtual mode
                    await this.publishId(this.SubscribedTopics[topic].id, message, {});
                    return;
                }

                // Light
                if (this.SubscribedTopics[topic].light) {
                    if (message.state) {
                        message.state = message.state === 'ON' ? true : false;
                        await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].LightIds.onOff, {
                            val: message.state,
                            c: 'from bridge',
                        });
                    }
                    if (message.brightness) {
                        await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].LightIds.brightness, {
                            val: message.brightness,
                            c: 'from bridge',
                        });
                    }
                    if (message.color) {
                        const color = this.rgbToHex(message.color);
                        await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].LightIds.color, {
                            val: color,
                            c: 'from bridge',
                        });
                    }
                    if (message.effect) {
                        const effect =
                            this.SubscribedTopics[topic].effects[message.effect] ??
                            this.SubscribedTopics[topic].effects[0];
                        await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].LightIds.effects, {
                            val: effect,
                            c: 'from bridge',
                        });
                    }
                    return;
                }

                // Cover
                if (this.SubscribedTopics[topic].cover) {
                    if (this.SubscribedTopics[topic].messageAssign) {
                        if (this.SubscribedTopics[topic].messageAssign[message]) {
                            message = this.SubscribedTopics[topic].messageAssign[message];
                        } else {
                            this.adapter.log.warn(
                                `Incomming Message: ${message} at topic: ${topic} can not be found in possible values.`,
                            );
                            return;
                        }
                    }
                }

                // Lock
                if (this.SubscribedTopics[topic].lock) {
                    if (this.SubscribedTopics[topic].messageAssign) {
                        if (this.SubscribedTopics[topic].messageAssign[message]) {
                            message = this.SubscribedTopics[topic].messageAssign[message];
                        } else {
                            this.adapter.log.warn(
                                `Incomming Message: ${message} at topic: ${topic} can not be found in possible values.`,
                            );
                            return;
                        }
                    }
                }

                // Check for namespace and write own, oder foreign state
                if (this.SubscribedTopics[topic].id.startsWith(this.adapter.namespace)) {
                    // Special DataExchange
                    if (this.SubscribedTopics[topic].dataExchange) {
                        if (typeof message === 'object') {
                            // Call the BridgeDeviceHandler
                            await this.bridgeDeviceHandler.generateDeviceStructure(message);
                            // Stringify for set State
                            message = JSON.stringify(message);
                        }
                        await this.adapter.setState(
                            this.SubscribedTopics[topic].id,
                            { val: message, c: 'from bridge' },
                            true,
                        );
                        // All Adapter internal States
                    } else {
                        await this.adapter.setState(this.SubscribedTopics[topic].id, {
                            val: message,
                            c: 'from bridge',
                        });
                    }
                    // Foreign States
                } else {
                    // Assignable Topics => id & val
                    if (this.SubscribedTopics[topic].messageAssign) {
                        await this.adapter.setForeignStateAsync(message.id, { val: message.val, c: 'from bridge' });
                        // Write in the desired id
                    } else {
                        await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].id, {
                            val: message,
                            c: 'from bridge',
                        });
                    }
                }
                await this.adapter.setState(
                    'info.subscribedTopics',
                    { val: JSON.stringify(this.SubscribedTopics), c: 'from bridge' },
                    true,
                );
            } else {
                this.adapter.log.debug(`The received Topic ${topic} is not subscribed`);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param {string} hex value of the color
     */
    hexToRgb(hex) {
        const activeFunction = 'bridge.js - hexToRgb';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            hex = hex.replace('#', '').trim();

            if (hex.length === 3) {
                // Kurzform #FFF → #FFFFFF
                hex = hex
                    .split('')
                    .map(c => c + c)
                    .join('');
            }

            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
            };
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            return {
                r: 255,
                g: 255,
                b: 255,
            };
        }
    }

    /**
     * Converts an RGB color object to a HEX string.
     *
     * @param {object} colorObject - RGB color object
     * @param {number} colorObject.r - Red component (0–255)
     * @param {number} colorObject.g - Green component (0–255)
     * @param {number} colorObject.b - Blue component (0–255)
     * @returns {string} HEX color string (#RRGGBB)
     */
    rgbToHex(colorObject) {
        const activeFunction = 'bridge.js - rgbToHex';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const { r, g, b } = colorObject;

            /**
             * @param {number} c - Blue component (0–255)
             */
            const toHex = c => {
                const hex = c.toString(16);
                return hex.length === 1 ? `0${hex}` : hex;
            };
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            return `#FFFFFF`;
        }
    }

    /**
     * @param id Id of actual element, handled in the bridge
     * @param Stateval Value of the used Id
     * @param options Options for using spezial fuctions
     */
    async work(id, Stateval, options) {
        const activeFunction = 'bridge.js - work';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.bridgeMqttClient.internalConnectionstate) {
                const discovered = await this.discovery(id, options);
                // only publish if no new id is discovered, because the newId will be published 1s later
                if (!discovered || !discovered.newId) {
                    await this.publishId(id, Stateval, {});
                }
            } else {
                this.adapter.log.debug(`work called with id ${id}, but Bridge is not connected yet.`);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ********************* Discover zur Bridge *************************
     * ******************************************************************/

    /**
     * @param id Id, wich is to discover
     * @param options Options for using spezial fuctions
     */
    async discovery(id, options) {
        const activeFunction = 'bridge.js - discovery';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (!this.CheckedIds[id] || (options && options.forceDiscovery)) {
                this.CheckedIds[id] = {};
                this.adapter.log.debug(`discover the id ${id}`);
                return await this.buildDiscovery(id, options);
            }
            this.adapter.log.debug(`${id} allready checked for discovery`);
            return false;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ******************** Discover Notification ************************
     * ******************************************************************/

    /**
     *  Discover Notifications to Bridge
     */
    async discoverGeneralNotification() {
        const activeFunction = 'discoverGeneralNotification';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const notificationId = `${this.adapter.namespace}.${this.Words.notification}${this.GeneralId}`;
            if (!this.Notifications[notificationId]) {
                const discoveryobject = this.getNotificationDiscoveryObject(this.adapter.namespace, this.Words.general);
                this.Notifications[notificationId] = {};
                this.assignIdStructure(
                    this.PublishedIds,
                    notificationId,
                    {
                        usedDeviceId: this.adapter.namespace,
                    },
                    discoveryobject?.topic,
                    discoveryobject?.payload,
                    discoveryobject?.payload.topic,
                    undefined,
                );

                await this.publishDiscovery(notificationId, {
                    topic: discoveryobject?.topic,
                    payload: structuredClone(discoveryobject?.payload),
                    informations: {
                        usedDeviceId: this.adapter.namespace,
                    },
                });
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * **************** Get Notification Discovery Object ****************
     * ******************************************************************/

    /**
     * @param deviceIdentifier deviceidentifiere for the desired device
     * @param notificationType notificationtype for the discoveryobject
     */
    getNotificationDiscoveryObject(deviceIdentifier, notificationType) {
        const activeFunction = 'getNotificationDiscoveryObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const normalizedDeviceIdentifier = this.normalizeString(deviceIdentifier);
            const discoveryobject = {
                topic: `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.NotificationEntityType}/${normalizedDeviceIdentifier}/${this.Words.notification}_${notificationType}/config`.toLowerCase(),
                payload: {
                    automation_type: 'trigger',
                    topic: `${this.bridgeMqttClient.BridgePrefix}${normalizedDeviceIdentifier}/${this.Words.notification}_${notificationType}${this.EndingState}`.toLowerCase(),
                    type: 'notification',
                    subtype: notificationType,
                    device: { identifiers: [normalizedDeviceIdentifier.toLowerCase()], name: deviceIdentifier },
                },
            };
            return discoveryobject;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ********************** Discover Climate ***************************
     * ******************************************************************/

    /**
     *  Discover Configed Climate Entities
     */
    async discoverClimate() {
        const activeFunction = 'discoverClimate';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.adapter.config.ClimateConfig) {
                for (const config of this.adapter.config.ClimateConfig) {
                    if (!(await this.generateClimateIds(config))) {
                        continue;
                    }
                    // All Ids ok
                    // Target
                    const target = {};
                    target.changeInfo = await this.adapter.getChangeInfo(config.climateIds.target);
                    target.DeviceIdentifier = this.getDeviceIdentifier(
                        target.changeInfo,
                        this.adapter.config.DeviceIdentifiers,
                    );
                    target.normalizedDeficeIdentifier = this.normalizeString(target.DeviceIdentifier);
                    target.uniqueString = await this.getUniqueString(config.climateIds.target, target.DeviceIdentifier);
                    target.Topic = `${this.bridgeMqttClient.BridgePrefix}${target.uniqueString?.path}`.toLowerCase();

                    //Min und Max holen
                    const targetObject = await this.adapter.getObjectAsync(config.climateIds.target);
                    if (targetObject.common.min) {
                        target.min = targetObject.common.min;
                    }
                    if (targetObject.common.max) {
                        target.max = targetObject.common.max;
                    }

                    // Act
                    const act = {};
                    act.changeInfo = await this.adapter.getChangeInfo(config.climateIds.act);
                    act.DeviceIdentifier = this.getDeviceIdentifier(
                        act.changeInfo,
                        this.adapter.config.DeviceIdentifiers,
                    );
                    act.normalizedDeficeIndetifier = this.normalizeString(act.DeviceIdentifier);
                    act.uniqueString = await this.getUniqueString(config.climateIds.act, act.DeviceIdentifier);
                    act.Topic = `${this.bridgeMqttClient.BridgePrefix}${act.uniqueString?.path}`.toLowerCase();

                    // Mode
                    const mode = {};
                    mode.changeInfo = await this.adapter.getChangeInfo(config.climateIds.mode);
                    mode.DeviceIdentifier = this.getDeviceIdentifier(
                        mode.changeInfo,
                        this.adapter.config.DeviceIdentifiers,
                    );
                    mode.normalizedDeviceIdentifier = this.normalizeString(mode.DeviceIdentifier);
                    mode.uniqueString = await this.getUniqueString(config.climateIds.mode, mode.DeviceIdentifier);
                    mode.Topic = `${this.bridgeMqttClient.BridgePrefix}${mode.uniqueString?.path}`.toLowerCase();

                    const climateUniqueString = await this.getUniqueString(
                        `${this.adapter.namespace}.${config.ClimateName}`,
                        target.DeviceIdentifier,
                    );
                    const DiscoveryTopic =
                        `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.ClimateEntityType}/${climateUniqueString?.path}/config`.toLowerCase();
                    const indexLastDotTarget = config.climateIds.target.lastIndexOf('.');
                    const Id = config.climateIds.target.substring(0, indexLastDotTarget) + this.EndingVirtualClimate;
                    const DiscoveryPayload = {
                        name: config.ClimateName,
                        unique_id: `${climateUniqueString?.flat}`.toLowerCase(),
                        device: {
                            identifiers: [target.normalizedDeficeIdentifier.toLowerCase()],
                            name: target.DeviceIdentifier,
                        },
                        mode_state_topic: `${mode.Topic}${this.EndingState}`,
                        mode_command_topic: `${mode.Topic}${this.EndingSet}`,
                        temperature_state_topic: `${target.Topic}${this.EndingState}`,
                        temperature_command_topic: `${target.Topic}${this.EndingSet}`,
                        current_temperature_topic: `${act.Topic}${this.EndingState}`,
                        min_temp: target.min ? target.min : 0,
                        max_temp: target.max ? target.max : 40,
                        modes: ['auto', 'heat', 'off'],
                        precision: 0.1,
                        temp_step: 0.1,
                    };

                    // Assign Subscribed Topics
                    // Target
                    this.assignTopicStructure(
                        this.SubscribedTopics,
                        `${target.Topic}${this.EndingSet}`,
                        {
                            applicationName: target.changeInfo.applicationName,
                            usedApplicationName: target.changeInfo.usedApplicationName,
                            deviceId: target.changeInfo.deviceId,
                            usedDeviceId: target.changeInfo.usedDeviceId,
                        },
                        DiscoveryTopic,
                        DiscoveryPayload,
                        config.climateIds.target,
                        undefined,
                    );

                    // Mode
                    this.assignTopicStructure(
                        this.SubscribedTopics,
                        `${mode.Topic}${this.EndingSet}`,
                        {
                            applicationName: mode.changeInfo.applicationName,
                            usedApplicationName: mode.changeInfo.usedApplicationName,
                            deviceId: mode.changeInfo.deviceId,
                            usedDeviceId: mode.changeInfo.usedDeviceId,
                        },
                        DiscoveryTopic,
                        DiscoveryPayload,
                        config.climateIds.mode,
                        undefined,
                    );

                    // Assign published Topics
                    // Target
                    this.assignIdStructure(
                        this.PublishedIds,
                        config.climateIds.target,
                        {
                            applicationName: target.changeInfo.applicationName,
                            usedApplicationName: target.changeInfo.usedApplicationName,
                            deviceId: target.changeInfo.deviceId,
                            usedDeviceId: target.changeInfo.usedDeviceId,
                        },
                        DiscoveryTopic,
                        DiscoveryPayload,
                        `${target.Topic}${this.EndingState}`,
                        undefined,
                    );

                    // Act
                    this.assignIdStructure(
                        this.PublishedIds,
                        config.climateIds.act,
                        {
                            applicationName: act.changeInfo.applicationName,
                            usedApplicationName: act.changeInfo.usedApplicationName,
                            deviceId: act.changeInfo.deviceId,
                            usedDeviceId: act.changeInfo.usedDeviceId,
                        },
                        DiscoveryTopic,
                        DiscoveryPayload,
                        `${act.Topic}${this.EndingState}`,
                        undefined,
                    );

                    // Mode
                    this.assignIdStructure(
                        this.PublishedIds,
                        config.climateIds.mode,
                        {
                            applicationName: mode.changeInfo.applicationName,
                            usedApplicationName: mode.changeInfo.usedApplicationName,
                            deviceId: mode.changeInfo.deviceId,
                            usedDeviceId: mode.changeInfo.usedDeviceId,
                        },
                        DiscoveryTopic,
                        DiscoveryPayload,
                        `${mode.Topic}${this.EndingState}`,
                        undefined,
                    );

                    // State to publish for Mode
                    let modeval = undefined;
                    if (config.climateIds.mode.endsWith(this.EndingVirtualMode)) {
                        modeval = 'auto';
                    }
                    // Publishing the discover message
                    await this.publishDiscovery(Id, {
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                        informations: {
                            target: {
                                applicationName: target.changeInfo.applicationName,
                                usedApplicationName: target.changeInfo.usedApplicationName,
                                deviceId: target.changeInfo.deviceId,
                                usedDeviceId: target.changeInfo.usedDeviceId,
                            },
                            act: {
                                applicationName: act.changeInfo.applicationName,
                                usedApplicationName: act.changeInfo.usedApplicationName,
                                deviceId: act.changeInfo.deviceId,
                                usedDeviceId: act.changeInfo.usedDeviceId,
                            },
                            mode: {
                                applicationName: mode.changeInfo.applicationName,
                                usedApplicationName: mode.changeInfo.usedApplicationName,
                                deviceId: mode.changeInfo.deviceId,
                                usedDeviceId: mode.changeInfo.usedDeviceId,
                            },
                        },
                    });
                    // Delay for publish new entity
                    setTimeout(async () => {
                        await this.publishId(config.climateIds.target, undefined, {});
                        await this.publishId(config.climateIds.act, undefined, {});
                        await this.publishId(config.climateIds.mode, modeval, {});
                    }, 1000);
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ****************** generate Climate Ids ***************************
     * ******************************************************************/

    /**
     * @param config Configuration of the climate entity, wich is to genereate
     */
    async generateClimateIds(config) {
        const activeFunction = 'generateClimateIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const climateIds = { target: '', act: '', mode: '' };
            climateIds.target = `${this.adapter.namespace}.${config.TargetApplication}.devices.${config.TargetDevice}.${config.TargetFolder}.${config.TargetState}`;
            climateIds.act = `${this.adapter.namespace}.${config.ActApplication}.devices.${config.ActDevice}.${config.ActFolder}.${config.ActState}`;
            if (config.ModeApplication === 'NotPresent') {
                climateIds.mode = `${this.adapter.namespace}.${config.TargetApplication}.devices.${config.TargetDevice}.${config.TargetFolder}${this.EndingVirtualMode}`;
            } else {
                climateIds.mode = `${this.adapter.namespace}.${config.ModeApplication}.devices.${config.ModeDevice}.${config.ModeFolder}.${config.ModeState}`;
            }
            for (const id of Object.values(climateIds)) {
                if (!(await this.adapter.objectExists(id)) && !id.endsWith(this.EndingVirtualMode)) {
                    return false;
                }
            }
            if (config.ClimateName === '') {
                return false;
            }
            const indexOfSpace = config.ClimateName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.ClimateName = config.ClimateName.substring(0, indexOfSpace);
            }
            config.climateIds = climateIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ********************* Publish zur Bridge **************************
     * ******************************************************************/

    /**
     * @param id Id, for notification
     * @param message message for notification
     * @param level level, for notification
     */
    async publishNotification(id, message, level) {
        const activeFunction = 'bridge.js - publishNotification';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.adapter.bridge.Notifications[id]) {
                if (this.adapter.config.BridgenotificationActivation.includes(level)) {
                    await this.publishId(id, message, { retain: false });
                } else {
                    this.adapter.log.debug(
                        `the level ${level} is not reached. Actual level: ${this.adapter.config.BridgenotificationActivation}`,
                    );
                }
            } else {
                this.adapter.log.debug(`the id ${id} is not set for Notifications`);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ********************* Publish zur Bridge **************************
     * ******************************************************************/

    /**
     * @param id Id, wich is to discover
     * @param val Value of the used Id
     * @param options options for special values
     */
    async publishId(id, val, options) {
        const activeFunction = 'bridge.js - publishId';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.PublishedIds[id]) {
                if (val === undefined) {
                    const State = await this.adapter.getForeignStateAsync(id);
                    if (State) {
                        val = State.val;
                    }
                }

                // Iterate the state_topics
                for (const element in this.PublishedIds[id].publish) {
                    const topic = element;
                    const publish = this.PublishedIds[id].publish[element];

                    // Light
                    if (publish.light) {
                        val = {};
                        val.state = (await this.adapter.getForeignStateAsync(publish.LightIds.onOff)).val;
                        val.state = val.state === true ? 'ON' : 'OFF';
                        // 16.12. Change: Read and Send always all attributes
                        if (publish.LightIds.brightness) {
                            val.brightness = (await this.adapter.getForeignStateAsync(publish.LightIds.brightness)).val;
                        }
                        if (publish.LightIds.color) {
                            val.color_mode = 'rgb';
                            val.color = this.hexToRgb(
                                (await this.adapter.getForeignStateAsync(publish.LightIds.color)).val,
                            );
                        }
                        if (publish.LightIds.effects) {
                            const effect = (await this.adapter.getForeignStateAsync(publish.LightIds.effects)).val;
                            val.effect = '';
                            if (publish.effects[effect]) {
                                val.effect = publish.effects[effect];
                            }
                        }
                    }

                    // Cover
                    if (publish.cover) {
                        if (publish.messageAssign) {
                            if (publish.messageAssign[val]) {
                                val = publish.messageAssign[val];
                            } else {
                                return;
                            }
                        }
                    }

                    // Lock
                    if (publish.lock) {
                        if (publish.messageAssign) {
                            if (publish.messageAssign[val]) {
                                val = publish.messageAssign[val];
                            } else {
                                return;
                            }
                        }
                    }

                    // safe old values (5 last values)
                    if (publish.values) {
                        if (!publish.oldValues) {
                            publish.oldValues = [];
                        }
                        if (publish.oldValues.length >= this.MaxValueCount) {
                            publish.oldValues.pop();
                        }
                        publish.oldValues.unshift(structuredClone(publish.values));
                    }
                    if (!publish.values) {
                        publish.values = {};
                    }
                    publish.values.val = val;
                    publish.values.ts = Date.now();
                    publish.values.time = new Date(Date.now()).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
                    if (typeof val !== 'string') {
                        val = JSON.stringify(val);
                    }
                    if (!options) {
                        options = { retain: true };
                    } else if (options.retain === undefined) {
                        options.retain = true;
                    }
                    await this.bridgeMqttClient.publish(topic, val, options);
                    await this.adapter.setState('info.publishedIds', JSON.stringify(this.PublishedIds), true);
                }

                /* alt 26.11.2025 
                    if (this.PublishedIds[id].light) {
                        val = {};
                        val.state = (await this.adapter.getForeignStateAsync(this.PublishedIds[id].LightIds.onOff)).val;
                        val.state = val.state === true ? 'ON' : 'OFF';
                        if (this.PublishedIds[id].LightIds.brightness) {
                            val.brightness = (
                                await this.adapter.getForeignStateAsync(this.PublishedIds[id].LightIds.brightness)
                            ).val;
                        }
                        if (this.PublishedIds[id].LightIds.color) {
                            val.color_mode = 'rgb';
                            val.color = this.hexToRgb(
                                (await this.adapter.getForeignStateAsync(this.PublishedIds[id].LightIds.color)).val,
                            );
                        }
                        if (this.PublishedIds[id].LightIds.effects) {
                            const effect = (await this.adapter.getForeignStateAsync(this.PublishedIds[id].LightIds.effects))
                                .val;
                            val.effect = '';
                            if (this.PublishedIds[id].effects[effect]) {
                                val.effect = this.PublishedIds[id].effects[effect];
                            }
                        }
                    }

                    if (this.PublishedIds[id].cover) {
                        if (this.PublishedIds[id].message) {
                            if (this.PublishedIds[id].message[val]) {
                                val = this.PublishedIds[id].message[val];
                            } else {
                                val = '';
                            }
                        }
                    }

                    // safe old values (5 last values)
                    if (this.PublishedIds[id].values) {
                        if (!this.PublishedIds[id].oldValues) {
                            this.PublishedIds[id].oldValues = [];
                        }
                        if (this.PublishedIds[id].oldValues.length >= this.MaxValueCount) {
                            this.PublishedIds[id].oldValues.pop();
                        }
                        this.PublishedIds[id].oldValues.unshift(structuredClone(this.PublishedIds[id].values));
                    }
                    if (!this.PublishedIds[id].values) {
                        this.PublishedIds[id].values = {};
                    }
                    this.PublishedIds[id].values.val = val;
                    this.PublishedIds[id].values.ts = Date.now();
                    this.PublishedIds[id].values.time = new Date(Date.now()).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
                    if (typeof val !== 'string') {
                        val = JSON.stringify(val);
                    }
                    if (!options) {
                        options = { retain: true };
                    } else if (options.retain === undefined) {
                        options.retain = true;
                    }
                    await this.bridgeMqttClient.publish(this.PublishedIds[id].state_topic, val, options);
                    await this.adapter.setState('info.publishedIds', JSON.stringify(this.PublishedIds), true);
            */
            } else {
                this.adapter.log.debug(`Id ${id} is not set for publish.`);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id Id of actual element
     * @param options Options for using spezial fuctions
     */
    async buildDiscovery(id, options) {
        const activeFunction = 'bridge.js - buildDiscovery';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Defaultvalue for discover
            let returnValue = { newDevice: undefined, newId: undefined };

            // Query for decoded Folder
            if (id.includes(`${this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded}.`)) {
                const changeInfo = await this.adapter.getChangeInfo(id);
                const Bridgestate = {
                    discover: false,
                    publish: false,
                    subscribe: false,
                };
                let deviceSuffix = '';

                // Query for Stateconfig
                if (this.adapter.config.BridgeStateConfig) {
                    for (const config of this.adapter.config.BridgeStateConfig) {
                        if (
                            (changeInfo.applicationId === config.Application || config.Application === '*') &&
                            (changeInfo.deviceEUI === config.Device || config.Device === '*') &&
                            (id.includes(`.${config.Folder}.`) || config.Folder === '*') &&
                            (config.State === '*' ||
                                (config.State.endsWith('.') && id.includes(`.decoded.${config.State}`)) ||
                                (!config.State.endsWith('.') && id.endsWith(`.decoded.${config.State}`)))
                        ) {
                            Bridgestate.discover = !config.exclude;
                            Bridgestate.publish = true;
                            deviceSuffix = config.deviceSuffix;
                            if (config.exclude) {
                                this.adapter.log.debug(
                                    `The Id: ${id} matches the exclude of the config: ${JSON.stringify(config)}`,
                                );
                                break;
                            } else {
                                this.adapter.log.debug(
                                    `The Id: ${id} matches the discovery of the config: ${JSON.stringify(config)}`,
                                );
                            }
                        }
                    }
                    if (Bridgestate.discover) {
                        options.deviceSuffix = deviceSuffix;
                        options.Bridgestate = Bridgestate;
                        const DiscoveryObject = await this.getDiscoveryObject(changeInfo, options);
                        if (Bridgestate.publish) {
                            this.assignIdStructure(
                                this.PublishedIds,
                                id,
                                {
                                    applicationName: changeInfo.applicationName,
                                    usedApplicationName: changeInfo.usedApplicationName,
                                    deviceId: changeInfo.deviceId,
                                    usedDeviceId: changeInfo.usedDeviceId,
                                },
                                DiscoveryObject?.topic,
                                DiscoveryObject?.payload,
                                DiscoveryObject?.payload.state_topic,
                                undefined,
                            );
                        }
                        returnValue = await this.publishDiscovery(id, {
                            topic: DiscoveryObject?.topic,
                            payload: structuredClone(DiscoveryObject?.payload),
                            informations: {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            },
                        });
                        // Delay for publish new entity
                        setTimeout(async () => {
                            await this.publishId(id, undefined, {});
                        }, 1000);
                    }
                }

                // Query for Control Folder
            } else if (
                id.includes(`${this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl}.`)
            ) {
                const changeInfo = await this.adapter.getChangeInfo(id);
                const Bridgestate = {
                    discover: false,
                    publish: false,
                    subscribe: false,
                };
                let deviceSuffix = '';
                // Query for Stateconfig
                if (this.adapter.config.BridgeStateConfig) {
                    for (const config of this.adapter.config.BridgeStateConfig) {
                        if (
                            (changeInfo.applicationId === config.Application || config.Application === '*') &&
                            (changeInfo.deviceEUI === config.Device || config.Device === '*') &&
                            (id.includes(`.${config.Folder}.`) || config.Folder === '*') &&
                            (config.State === '*' ||
                                (config.State.endsWith('.') && id.includes(`.control.${config.State}`)) ||
                                (!config.State.endsWith('.') && id.endsWith(`.control.${config.State}`)))
                        ) {
                            Bridgestate.discover = !config.exclude;
                            Bridgestate.publish = config.publish;
                            Bridgestate.subscribe = config.subscribe;
                            if (config.exclude) {
                                break;
                            }
                        }
                    }
                    if (Bridgestate.discover) {
                        options.deviceSuffix = deviceSuffix;
                        options.Bridgestate = Bridgestate;
                        options.Bridgestate = Bridgestate;
                        const DiscoveryObject = await this.getDiscoveryObject(changeInfo, options);
                        if (Bridgestate.publish) {
                            this.assignIdStructure(
                                this.PublishedIds,
                                id,
                                {
                                    applicationName: changeInfo.applicationName,
                                    usedApplicationName: changeInfo.usedApplicationName,
                                    deviceId: changeInfo.deviceId,
                                    usedDeviceId: changeInfo.usedDeviceId,
                                },
                                DiscoveryObject?.topic,
                                DiscoveryObject?.payload,
                                DiscoveryObject?.payload.state_topic,
                                undefined,
                            );
                        }
                        if (Bridgestate.subscribe) {
                            this.assignTopicStructure(
                                this.SubscribedTopics,
                                DiscoveryObject?.payload.command_topic,
                                {
                                    applicationName: changeInfo.applicationName,
                                    usedApplicationName: changeInfo.usedApplicationName,
                                    deviceId: changeInfo.deviceId,
                                    usedDeviceId: changeInfo.usedDeviceId,
                                },
                                DiscoveryObject?.topic,
                                DiscoveryObject?.payload,
                                id,
                                undefined,
                            );
                        }
                        returnValue = await this.publishDiscovery(id, {
                            topic: DiscoveryObject?.topic,
                            payload: structuredClone(DiscoveryObject?.payload),
                            informations: {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            },
                        });
                        // Delay for publish new entity
                        setTimeout(async () => {
                            await this.publishId(id, undefined, {});
                        }, 1000);
                    }
                }
            }
            return returnValue;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * **************** assign Structur of internal memory ***************
     * ******************************************************************/
    /**
     * @param assignObject object to assign
     * @param indexId index of the assignable object
     * @param informations informations about the assign
     * @param topic dicoverytopic of the assign
     * @param payload payload of the assign
     * @param state_topic topic for the  of the assigned state
     * @param options additional options, that can be added
     */
    assignIdStructure(assignObject, indexId, informations, topic, payload, state_topic, options) {
        if (!assignObject[indexId]) {
            assignObject[indexId] = { discovery: [], publish: {} };
        }
        assignObject[indexId].discovery.push({
            topic: topic,
            payload: structuredClone(payload),
        });
        /* alt 26.11.2025
        assignObject[indexId].state_topic = state_topic;
        assignObject[indexId].informations = structuredClone(informations);
        if (options) {
            for (const option in options) {
                assignObject[indexId][option] = options[option];
            }
        }
        */
        if (!assignObject[indexId].publish[state_topic]) {
            assignObject[indexId].publish[state_topic] = {};
            assignObject[indexId].publish[state_topic].informations = structuredClone(informations);
            if (options) {
                for (const option in options) {
                    assignObject[indexId].publish[state_topic][option] = options[option];
                }
            }
        }
    }

    /*********************************************************************
     * **************** assign Structur of internal memory ***************
     * ******************************************************************/
    /**
     * @param assignObject object to assign
     * @param indexTopic index of the assignable object
     * @param informations informations about the assign
     * @param topic dicoverytopic of the assign
     * @param payload payload of the assign
     * @param id id for the assign to the foreign state
     * @param options additional options, that can be added
     */
    assignTopicStructure(assignObject, indexTopic, informations, topic, payload, id, options) {
        if (!assignObject[indexTopic]) {
            assignObject[indexTopic] = { discovery: [] };
        }
        assignObject[indexTopic].discovery.push({
            topic: topic,
            payload: structuredClone(payload),
        });
        this.SubscribedTopics[indexTopic].id = id;
        this.SubscribedTopics[indexTopic].informations = structuredClone(informations);
        if (options) {
            for (const option in options) {
                assignObject[indexTopic][option] = options[option];
            }
        }
    }

    /*********************************************************************
     * ******************** Discovery Objekt bilden **********************
     * ******************************************************************/

    /**
     * @param changeInfo changeInfo of Id
     * @param options Options for using spezial fuctions
     */
    async getDiscoveryObject(changeInfo, options) {
        const activeFunction = 'bridge.js - getDiscoveryObject';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let indexOfStatebegin = -1;
            // Check for state discover outsid the applications
            if (options && options.internal) {
                indexOfStatebegin = changeInfo.id.indexOf(options.internal.folder);
                indexOfStatebegin = options.internal.folder.length + 1;
            } else {
                indexOfStatebegin = changeInfo.id.indexOf(
                    this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded,
                );
                if (indexOfStatebegin === -1) {
                    indexOfStatebegin = changeInfo.id.indexOf(
                        this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl,
                    );
                    indexOfStatebegin +=
                        this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl.length + 1;
                } else {
                    indexOfStatebegin +=
                        this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded.length + 1;
                }
            }
            const StateName = changeInfo.id.substring(indexOfStatebegin, changeInfo.id.length);
            //const normalizedStateName = this.normalizeString(StateName); 08.11.2025 BeSc dont needed anymore with chenge below
            let DeviceIdentifier;
            if (options && options.internal) {
                DeviceIdentifier = options.internal.deviceidentifier;
            } else {
                DeviceIdentifier = this.getDeviceIdentifier(changeInfo, this.adapter.config.DeviceIdentifiers);
            }
            // Add Suffix, if present
            if (options && options.deviceSuffix) {
                DeviceIdentifier += options.deviceSuffix;
            }
            const normalizedDeviceIdentifier = this.normalizeString(DeviceIdentifier);
            const uniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${changeInfo.id}`,
                DeviceIdentifier,
            );
            const Topic = `${this.bridgeMqttClient.BridgePrefix}${uniqueString?.path}`.toLowerCase();

            const EntityType = await this.getEntityType(options);
            const AdditionalAttributes = await this.getStateAttributes(options.common, EntityType);
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${EntityType}/${uniqueString?.path}/config`.toLowerCase();
            const DiscoveryPayload = {
                name: StateName,
                //unique_id: `${normalizedDeviceIdentifier}_${normalizedStateName}`.toLowerCase(), 08.11.2025 BeSc changed into follow line
                unique_id: `${uniqueString?.flat}`.toLowerCase(),
                device: { identifiers: [normalizedDeviceIdentifier.toLowerCase()], name: DeviceIdentifier },
            };
            // Add Topics
            if (options.internal && options.internal.forceUpdate) {
                DiscoveryPayload.force_update = true;
            }
            DiscoveryPayload.state_topic = `${Topic}${this.EndingState}`;
            if (options.Bridgestate.subscribe) {
                DiscoveryPayload.command_topic = `${Topic}${this.EndingSet}`;
            }

            // Assign Attibute to Payload
            for (const Attribute in AdditionalAttributes) {
                DiscoveryPayload[Attribute] = AdditionalAttributes[Attribute];
            }
            return { topic: DiscoveryTopic, payload: DiscoveryPayload };
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ******************** Discovery Objekt bilden **********************
     * ******************************************************************/

    /**
     * @param id Id, wich is used for this discovery
     * @param DiscoveryObject Discoverobject, wicht is to discover
     */
    async publishDiscovery(id, DiscoveryObject) {
        const activeFunction = 'bridge.js - publishDiscovery';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        const returnValue = { newDevice: undefined, newId: undefined };
        try {
            if (!DiscoveryObject.lastDiscover) {
                DiscoveryObject.lastDiscover = {};
            }
            DiscoveryObject.lastDiscover.ts = Date.now();
            DiscoveryObject.lastDiscover.time = new Date(Date.now()).toLocaleString(
                this.Timeoutput.Argument,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                this.Timeoutput.Format,
            );

            /******************************************************
             * ****************************************************
             *************************************************** */
            // check for new device discovered, or new Id discovered
            if (typeof DiscoveryObject.payload !== 'string') {
                // Payload is not empty => discover
                const normalizedDeficeIdentifier = DiscoveryObject.payload.device.identifiers[0];

                // add via Device in case, there is no attribute
                if (!DiscoveryObject.payload.device.via_device) {
                    DiscoveryObject.payload.device.via_device = this.normalizeString(this.adapter.namespace);
                }
                // Add Version
                DiscoveryObject.payload.device.sw_version = this.adapter.version;

                // New Device
                if (!this.discoveredDevices[normalizedDeficeIdentifier]) {
                    this.discoveredDevices[normalizedDeficeIdentifier] = {};
                    if (!this.oldDiscoveredDevices[normalizedDeficeIdentifier]) {
                        // Only messegae with ne fiscovered dewvice, if not in old discovered devices
                        returnValue.newDevice = DiscoveryObject;
                        let device = DiscoveryObject.payload.device.name;
                        let message = `${this.adapter.i18nTranslation['new device discovered']}.\n${this.adapter.i18nTranslation['Device']}: ${device}`;
                        if (DiscoveryObject.informations.usedApplicationName) {
                            const application = DiscoveryObject.informations.usedApplicationName;
                            message += `\n${this.adapter.i18nTranslation['Application']}: ${application}`;
                        }
                        const notificationId = `${this.adapter.namespace}.${this.adapter.bridge.Words.notification}${this.adapter.bridge.GeneralId}`;
                        await this.adapter.bridge?.publishNotification(
                            notificationId,
                            message,
                            this.adapter.bridge?.Notificationlevel.deviceState,
                            false,
                        );
                    }
                }
                // New Id
                if (!this.DiscoveredIds[id]) {
                    returnValue.newId = DiscoveryObject;
                }
            }
            /******************************************************
             * ****************************************************
             *************************************************** */

            this.DiscoveredIds[id] = DiscoveryObject;

            let payload = JSON.stringify(DiscoveryObject.payload);
            if (typeof DiscoveryObject.payload === 'string') {
                payload = DiscoveryObject.payload;
            }
            await this.bridgeMqttClient.publish(DiscoveryObject.topic, payload, {
                retain: true,
            });

            await this.adapter.setState('info.discoveredIds', JSON.stringify(this.DiscoveredIds), true);
            return returnValue;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            return returnValue;
        }
    }

    /*********************************************************************
     * ************************* Entity Type *****************************
     * ******************************************************************/

    /**
     * @param options Options for using spezial fuctions
     */
    async getEntityType(options) {
        const activeFunction = 'bridge.js - getEntityType';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const common = options.common;
            const isWritable = options.Bridgestate.subscribe;
            const type = common.type || '';
            const role = (common.role || '').toLowerCase();
            switch (type) {
                case 'boolean':
                    if (role.includes('button') || role.includes('action')) {
                        return 'button'; // Trigger-only
                    } else if (role.includes('switch')) {
                        return isWritable ? 'switch' : 'binary_sensor';
                    }
                    return isWritable ? 'switch' : 'binary_sensor';

                case 'number':
                    //    if (role.includes('valve')) return 'valve';
                    if (role.includes('value')) {
                        return 'sensor';
                    }
                    return isWritable ? 'number' : 'sensor';

                case 'string':
                    return isWritable ? 'text' : 'sensor';

                case 'mixed':
                    return isWritable ? 'text' : 'sensor';
                case 'array':
                case 'object':
                case 'file':
                    return 'sensor';

                default:
                    return 'sensor';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ********************* Message vom der Bridge **********************
     * ******************************************************************/

    /**
     * @param common common object of state
     * @param entityType Entity of State
     */
    async getStateAttributes(common, entityType) {
        const activeFunction = 'bridge.js - getStateAttributes';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const role = (common?.role || '').toLowerCase();
            const unit = common?.unit || '';
            const type = common?.type || '';
            const attributes = {};

            // Einheit normalisieren
            const normalizedUnit = this.normalizeUnit(unit);
            const normalizedUnitLower = normalizedUnit.toLowerCase();

            if (entityType === 'sensor' || entityType === 'number' || entityType === 'text') {
                if (role.includes('temperature')) {
                    attributes.device_class = 'temperature';
                    attributes.unit_of_measurement = normalizedUnit || '°C';
                } else if (role.includes('humidity')) {
                    attributes.device_class = 'humidity';
                    attributes.unit_of_measurement = normalizedUnit || '%';
                } else if (role.includes('illuminance') || role.includes('brightness')) {
                    attributes.device_class = 'illuminance';
                    attributes.unit_of_measurement = 'lx'; //normalizedUnit || 'lx';
                } else if (role.includes('battery')) {
                    attributes.device_class = 'battery';
                    attributes.entity_category = 'diagnostic';
                    attributes.unit_of_measurement = normalizedUnit || '%';
                } else if (role.includes('voltage')) {
                    attributes.device_class = 'voltage';
                    attributes.entity_category = 'diagnostic';
                    attributes.unit_of_measurement = normalizedUnit || 'V';
                    if (attributes.unit_of_measurement === 'V') {
                        attributes.suggested_display_precision = 2;
                    }
                } else if (role.includes('color')) {
                    attributes.entity_category = 'config';
                } else if (role.includes('level.timer')) {
                    attributes.entity_category = 'config';
                    attributes.unit_of_measurement = normalizedUnit || 'min';
                } else if (role.includes('power') && !normalizedUnitLower.includes('wh')) {
                    // Sonoff mit value.power.consumtion und kWh ausnehmen
                    attributes.device_class = 'power';
                    attributes.unit_of_measurement = normalizedUnit || 'W';
                } else if (
                    role.includes('energy') ||
                    (role.includes('power.consumption') && normalizedUnitLower.includes('wh'))
                ) {
                    attributes.device_class = 'energy';
                    attributes.state_class = 'total_increasing';
                    attributes.unit_of_measurement = normalizedUnit || 'Wh';
                } else if (role.includes('weight')) {
                    // Sonoff mit value.power.consumtion und kWh ausnehmen
                    attributes.device_class = 'weight';
                    attributes.unit_of_measurement = normalizedUnit || 'kg';
                } else {
                    /* Ab hier erfolgt ein unitmapping **
                     ***********************************
                     ***********************************/

                    // Mapping anwenden, wenn bekannt
                    if (normalizedUnit) {
                        attributes.unit_of_measurement = normalizedUnit;

                        if (this.unitMap[normalizedUnit]) {
                            attributes.device_class = this.unitMap[normalizedUnit].device_class;

                            // Falls es in unitMap einen gültigen Eintrag gibt UND noch keine state_class gesetzt wurde
                            if (!attributes.state_class && this.unitMap[normalizedUnit].state_class) {
                                attributes.state_class = this.unitMap[normalizedUnit].state_class;
                            }
                        }
                    }
                }

                // Step zuweisen
                if (entityType === 'number' && attributes.unit_of_measurement !== '%') {
                    attributes.step = 0.1;
                }

                // Min und Max zuweisen
                if (common.min != null) {
                    attributes.min = common.min;
                }
                if (common.max != null) {
                    attributes.max = common.max;
                }

                // Es muss eine Device Class zugewiesen sein und der State darf kein String sein.
                // String ist kein Measurement
                if (!attributes.state_class && type !== 'string') {
                    attributes.state_class = 'measurement';
                }
            }

            if (entityType === 'valve') {
                attributes.unit_of_measurement = normalizedUnit || '%';
            }

            if (entityType === 'switch') {
                attributes.state_on = 'true';
                attributes.state_off = 'false';
                attributes.payload_on = 'true';
                attributes.payload_off = 'false';
            }
            if (entityType === 'button') {
                attributes.state_on = 'true';
                attributes.state_off = 'false';
                attributes.payload_on = 'true';
                attributes.payload_off = 'false';
            }
            if (entityType === 'binary_sensor') {
                if (role.includes('motion')) {
                    attributes.device_class = 'motion';
                } else if (role.includes('window')) {
                    attributes.device_class = 'window';
                } else if (role.includes('door')) {
                    attributes.device_class = 'door';
                } else if (role.includes('gate')) {
                    attributes.device_class = 'door';
                } else if (role.includes('lock')) {
                    attributes.device_class = 'lock';
                } else if (role.includes('garage')) {
                    attributes.device_class = 'garage_door';
                } else if (role.includes('blind') || role.includes('shutter') || role.includes('open')) {
                    attributes.device_class = 'opening';
                } else if (role.includes('smoke')) {
                    attributes.device_class = 'smoke';
                } else if (role.includes('presence')) {
                    attributes.device_class = 'presence';
                } else if (role.includes('moisture') || role.includes('leak')) {
                    attributes.device_class = 'moisture';
                }
                attributes.state_on = 'true';
                attributes.state_off = 'false';
                attributes.payload_on = 'true';
                attributes.payload_off = 'false';
            }
            return attributes;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param rawUnit Unit zu normalize
     */
    normalizeUnit = (rawUnit = '') => {
        let u = (rawUnit || '').trim();

        // häufige Schreibweisen korrigieren
        u = u
            .replace(/^c$/i, '°C')
            .replace(/^°c$/i, '°C')
            .replace(/^degc$/i, '°C')
            .replace(/^°f$/i, '°F')
            .replace(/^k$/i, 'K')

            .replace(/^w$/i, 'W')
            .replace(/^kw$/i, 'kW')
            .replace(/^v$/i, 'V')
            .replace(/^mv$/i, 'mV')
            .replace(/^kv$/i, 'kV')
            .replace(/^a$/i, 'A')
            .replace(/^ma$/i, 'mA')
            .replace(/^hz$/i, 'Hz')
            .replace(/^khz$/i, 'kHz')
            .replace(/^mhz$/i, 'MHz')

            .replace(/^kwh$/i, 'kWh')
            .replace(/^wh$/i, 'Wh')

            .replace(/^va$/i, 'VA')
            .replace(/^var$/i, 'var')

            .replace(/^dbm$/i, 'dBm')
            .replace(/^db$/i, 'dB')

            .replace(/^m\^3$/i, 'm³')
            .replace(/^m3$/i, 'm³')

            .replace(/^ug\/m3$/i, 'µg/m³')
            .replace(/^mcg\/m3$/i, 'µg/m³')
            .replace(/^um\/m3$/i, 'µg/m³')

            .replace(/^l\/min$/i, 'L/min')
            .replace(/^l\/s$/i, 'L/s')

            .replace(/^m\^?3\/h$/i, 'm³/h')

            .replace(/^kmh$/i, 'km/h')
            .replace(/^m\/s$/i, 'm/s')

            .replace(/^g$/i, 'g')
            .replace(/^kg$/i, 'kg')

            .replace(/^pa$/i, 'Pa')
            .replace(/^hpa$/i, 'hPa')
            .replace(/^kpa$/i, 'kPa')
            .replace(/^mbar$/i, 'mbar')
            .replace(/^bar$/i, 'bar')
            .replace(/^psi$/i, 'psi')

            .replace(/^ppm$/i, 'ppm')
            .replace(/^ppb$/i, 'ppb')

            .replace(/^lux$/i, 'lx')

            .replace(/^l$/i, 'L')
            .replace(/^ml$/i, 'mL')

            .replace(/^gal$/i, 'gal')

            .replace(/^ft\^?3$/i, 'ft³')

            .replace(/^w\/m2$/i, 'W/m²')
            .replace(/^w\/m²$/i, 'W/m²')

            .replace(/^[µμ]g\/m3$/i, 'µg/m³');

        return u;
    };

    /**
     * @param changeInfo changeinfo of the state
     * @param DeviceIdentifiers configed deviceidentifier
     */
    getDeviceIdentifier(changeInfo, DeviceIdentifiers) {
        const activeFunction = 'bridge.js - getDeviceIdentifier';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let DeviceIdentifier = '';
            let Separator = '';
            switch (this.adapter.config.separator) {
                case 'no':
                    Separator = '';
                    break;
                case 'space':
                    Separator = ' ';
                    break;
                case 'underline':
                    Separator = '_';
                    break;
                case 'minus':
                    Separator = '-';
                    break;
            }
            for (const element of Object.values(DeviceIdentifiers)) {
                if (DeviceIdentifier !== '') {
                    DeviceIdentifier += Separator;
                }
                switch (element.DeviceIdentifier) {
                    case 'applicationId':
                        DeviceIdentifier += changeInfo.applicationId;
                        break;

                    case 'applicationName':
                        DeviceIdentifier += changeInfo.applicationName;
                        break;

                    case 'usedApplicationName':
                        DeviceIdentifier += changeInfo.usedApplicationName;
                        break;

                    case 'deviceEUI':
                        DeviceIdentifier += changeInfo.deviceEUI;
                        break;

                    case 'deviceId':
                        DeviceIdentifier += changeInfo.deviceId;
                        break;

                    case 'usedDeviceId':
                        DeviceIdentifier += changeInfo.usedDeviceId;
                        break;
                }
            }
            return DeviceIdentifier;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param Inputstring string to replace the vorbidden chars
     */
    normalizeString(Inputstring) {
        const activeFunction = 'bridge.js - normalizeString';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            return Inputstring.replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/Ä/g, 'Ae')
                .replace(/Ö/g, 'Oe')
                .replace(/Ü/g, 'Ue')
                .replace(/ß/g, 'ss')
                .replace(/\./g, '_')
                .replace(/\//g, '_')
                .replace(/ /g, '_')
                .replace(/[()]/g, '_')
                .replace(/[[\]]/g, '_')
                .replace(/[{}]/g, '_')
                .replace(/#/g, '_');
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ***************** Discover all defined State **********************
     * ******************************************************************/

    /**
     * Discover all defined States (maby at Startup)
     *
     * @param options options to special functions
     */
    async checkAllStatesForBridgeWork(options) {
        const activeFunction = 'bridge.js - checkAllStatesForBridgeWork';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // get old Discovered ids
            this.OldDiscoveredIds = JSON.parse((await this.adapter.getStateAsync('info.discoveredIds')).val);
            this.oldDiscoveredDevices = this.generateOldDevices(this.OldDiscoveredIds);
            // Clear object of all subscribed Ids and published Topics
            this.SubscribedTopics = {};
            this.PublishedIds = {};
            this.Notifications = {};

            //this.adapter.log.error(JSON.stringify(this.oldDiscoveredDevices));
            await this.discoverGeneralNotification();

            await this.discoverDataExchange();

            // Get all ids in adapterfolder
            // Generate Infos of all devices and decoded folders
            const adapterObjects = await this.adapter.getAdapterObjectsAsync();
            for (const adapterObject of Object.values(adapterObjects)) {
                if (
                    adapterObject._id.includes(
                        `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded}.`,
                    ) ||
                    adapterObject._id.includes(
                        `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl}.`,
                    )
                ) {
                    if (adapterObject.type === 'state') {
                        const localOptions = {
                            ...(options || {}),
                            common: adapterObject.common,
                        };

                        await this.work(adapterObject._id, undefined, localOptions);
                    }
                }
            }
            await this.discoverClimate();
            await this.getForeignStatesForStandardEntities();
            await this.getForeignClimateConfig();
            await this.getForeignHumidifierConfig();
            await this.getForeignLightConfig();
            await this.getForeignCoverConfig();
            await this.getForeignLockConfig();
            await this.checkDiscoveries();
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*
    async checkAllStatesForBridgeWork(options) {
        const activeFunction = 'bridge.js - checkAllStatesForBridgeWork';
        this.adapter.log.silly(`Function ${activeFunction} started.`);

        try {
            // get old Discovered ids
            this.OldDiscoveredIds = JSON.parse((await this.adapter.getStateAsync('info.discoveredIds')).val);
            this.oldDiscoveredDevices = this.generateOldDevices(this.OldDiscoveredIds);

            // Clear object of all subscribed Ids and published Topics
            this.SubscribedTopics = {};
            this.PublishedIds = {};
            this.Notifications = {};

            await this.discoverGeneralNotification();
            await this.discoverDataExchange();

            const adapterObjects = await this.adapter.getAdapterObjectsAsync();

            const CHUNK_SIZE = (await this.adapter.getStateAsync('bridge.debug.chunk'))?.val || 32;
            let chunk = [];
            for (const adapterObject of Object.values(adapterObjects)) {
                if (adapterObject.type !== 'state') {
                    continue;
                }
                if (
                    !adapterObject._id.includes(
                        `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded}.`,
                    ) &&
                    !adapterObject._id.includes(
                        `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl}.`,
                    )
                ) {
                    continue;
                }

                const localOptions = {
                    ...(options || {}),
                    common: adapterObject.common,
                };

                chunk.push(this.work(adapterObject._id, undefined, localOptions));

                // if chunk full => do
                if (chunk.length >= CHUNK_SIZE) {
                    await Promise.all(chunk);
                    chunk = [];
                }
            }

            // Do until chunk is 0
            if (chunk.length > 0) {
                await Promise.all(chunk);
            }

            // Promise all functions
            await Promise.all([
                this.discoverClimate(),
                this.getForeignStatesForStandardEntities(),
                this.getForeignClimateConfig(),
                this.getForeignHumidifierConfig(),
                this.getForeignLightConfig(),
                this.getForeignCoverConfig(),
                this.getForeignLockConfig(),
            ]);
            await this.checkDiscoveries();
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }
    */

    /**
     * @param oldDiscoveredIds Ids wiche are discovered last time that Adapter runs
     */
    generateOldDevices(oldDiscoveredIds) {
        const activeFunction = 'bridge.js - generateOldDevices';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const oldDevices = {};
            for (const id of Object.values(oldDiscoveredIds)) {
                const normalizedDeviceidentifier = id.payload.device.identifiers[0];
                if (!oldDevices[normalizedDeviceidentifier]) {
                    oldDevices[normalizedDeviceidentifier] = {};
                }
            }
            return oldDevices;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            return {};
        }
    }

    /**
     * Discovery of DataExchange state
     */
    async discoverDataExchange() {
        const options = {};
        let id = `${this.adapter.namespace}.bridge.dataFromIob`;
        let deviceObject = await this.adapter.getForeignObjectAsync(id);
        options.common = deviceObject.common;
        let changeInfo = await this.adapter.getChangeInfo(id);
        options.Bridgestate = {
            discover: true,
            publish: true,
            subscribe: false,
        };
        options.internal = { folder: `bridge`, deviceidentifier: this.adapter.namespace, forceUpdate: true };
        let DiscoveryObject = await this.getDiscoveryObject(changeInfo, options);
        this.assignIdStructure(
            this.PublishedIds,
            id,
            {
                usedDeviceId: this.adapter.namespace,
            },
            DiscoveryObject?.topic,
            DiscoveryObject?.payload,
            DiscoveryObject?.payload.state_topic,
            { dataExchange: true },
        );

        await this.publishDiscovery(id, {
            topic: DiscoveryObject?.topic,
            payload: structuredClone(DiscoveryObject?.payload),
            informations: {
                usedDeviceId: this.adapter.namespace,
            },
        });
        // Delay for publish new entity
        setTimeout(async () => {
            await this.publishId(id, undefined, {});
        }, 1000);

        id = `${this.adapter.namespace}.bridge.dataToIob`;
        deviceObject = await this.adapter.getForeignObjectAsync(id);
        options.common = deviceObject.common;
        changeInfo = await this.adapter.getChangeInfo(id);
        options.Bridgestate = {
            discover: true,
            publish: false,
            subscribe: true,
        };
        options.internal = { folder: `bridge`, deviceidentifier: this.adapter.namespace };
        DiscoveryObject = await this.getDiscoveryObject(changeInfo, options);

        this.assignTopicStructure(
            this.SubscribedTopics,
            DiscoveryObject?.payload.command_topic,
            {
                usedDeviceId: this.adapter.namespace,
            },
            DiscoveryObject?.topic,
            DiscoveryObject?.payload,
            id,
            { dataExchange: true },
        );
        await this.publishDiscovery(id, {
            topic: DiscoveryObject?.topic,
            payload: structuredClone(DiscoveryObject?.payload),
            informations: {
                usedDeviceId: this.adapter.namespace,
            },
        });
        // Delay for publish new entity
        setTimeout(async () => {
            await this.publishId(id, undefined, {});
        }, 1000);
    }

    /**
     * check discovery for old entries
     */
    async checkDiscoveries() {
        const activeFunction = 'bridge.js - checkDiscoveries';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const id in this.OldDiscoveredIds) {
                if (!this.DiscoveredIds[id]) {
                    this.adapter.log.debug(`The discovered id: ${id} will be removed`);
                    this.DiscoveredIds[id] = this.OldDiscoveredIds[id];
                    this.DiscoveredIds[id].payload = '';
                    await this.publishDiscovery(id, this.DiscoveredIds[id]);
                    delete this.DiscoveredIds[id];
                    delete this.OldDiscoveredIds[id];
                    await this.adapter.setState('info.discoveredIds', JSON.stringify(this.DiscoveredIds), true);
                } else {
                    if (this.DiscoveredIds[id].topic !== this.OldDiscoveredIds[id].topic) {
                        this.adapter.log.debug(
                            `The discovered topic: ${this.OldDiscoveredIds[id].topic} will be removed`,
                        );
                        const safeCurrent = this.DiscoveredIds[id];
                        this.DiscoveredIds[id] = this.OldDiscoveredIds[id];
                        this.DiscoveredIds[id].payload = '';
                        await this.publishDiscovery(id, this.DiscoveredIds[id]);
                        this.DiscoveredIds[id] = safeCurrent;
                        await this.publishDiscovery(id, this.DiscoveredIds[id]);
                    }
                }
            }
            //Assign new Discoverd Devices to Old
            this.oldDiscoveredDevices = structuredClone(this.discoveredDevices);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }
    // create schedule Jobs for online and historic values
    /**
     * Build the cronJob
     */
    createScheduleJobs() {
        const activeFunction = 'bridge.js - createScheduleJobs';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            if (this.adapter.config.EnableRefresh) {
                this.DiscoveryCronjob = schedule.scheduleJob(
                    this.adapter.config.RefreshDiscoveryCronJob,
                    this.startScheduledDiscovery.bind(this),
                );
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * Publish the discovered Ids again
     */
    async startScheduledDiscovery() {
        const activeFunction = 'bridge.js - startScheduledDiscovery';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const DiscoveredId in this.DiscoveredIds) {
                await this.publishDiscovery(DiscoveredId, this.DiscoveredIds[DiscoveredId]);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     *  Clear schedule
     */
    clearAllSchedules() {
        const activeFunction = 'bridge.js - clearAllSchedules';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            schedule.cancelJob(this.DiscoveryCronjob);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*****************************************************************
     * *********************** Foreign functions *********************
     * **************************************************************/
    /**
     * get Foreign states for Bridge
     */
    async getForeignClimateConfig() {
        const activeFunction = 'bridge.js - getForeignClimateEntities';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const config of this.adapter.config.ClimateForeignConfig) {
                await this.discoverForeignClimate(config);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     *
     * @param config config of the climate entity
     */
    async discoverForeignClimate(config) {
        const activeFunction = 'bridge.js - discoverForeignClimateEntities';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Assign the Ids (use the codenameing of discoverClimate)
            if (!(await this.generateForeignClimateIds(config))) {
                this.adapter.log.warn(
                    `The Foreign Climate config is not complete, or has error(s): ${config.ClimateName}`,
                );
                return;
            }

            // Target
            const target = {};
            target.DeviceIdentifier = (await this.getParentNameing(config.climateIds.target))?.parentName;
            target.uniqueString = await this.getUniqueString(config.climateIds.target, target.DeviceIdentifier);
            target.Topic = `${this.bridgeMqttClient.BridgePrefix}${target.uniqueString?.path}`.toLowerCase();

            //Min und Max holen
            const targetObject = await this.adapter.getForeignObjectAsync(config.climateIds.target);
            if (targetObject.common.min) {
                target.min = targetObject.common.min;
            }
            if (targetObject.common.max) {
                target.max = targetObject.common.max;
            }

            // Act
            const act = {};
            act.DeviceIdentifier = (await this.getParentNameing(config.climateIds.act))?.parentName;
            act.uniqueString = await this.getUniqueString(config.climateIds.act, act.DeviceIdentifier);
            act.Topic = `${this.bridgeMqttClient.BridgePrefix}${act.uniqueString?.path}`.toLowerCase();

            // Mode
            const mode = {};
            mode.DeviceIdentifier = (await this.getParentNameing(config.climateIds.mode))?.parentName;
            mode.uniqueString = await this.getUniqueString(config.climateIds.mode, mode.DeviceIdentifier);
            mode.Topic = `${this.bridgeMqttClient.BridgePrefix}${mode.uniqueString?.path}`.toLowerCase();

            const climateUniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${config.ClimateName}`,
                target.DeviceIdentifier,
            );
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.ClimateEntityType}/${climateUniqueString?.path}/config`.toLowerCase();
            const indexLastDotTarget = config.climateIds.target.lastIndexOf('.');
            const Id = config.climateIds.target.substring(0, indexLastDotTarget) + this.EndingVirtualClimate;

            const DiscoveryPayload = {
                name: config.ClimateName,
                unique_id: `${climateUniqueString?.flat}`.toLowerCase(),
                device: {
                    identifiers: [this.normalizeString(target.DeviceIdentifier).toLowerCase()],
                    name: target.DeviceIdentifier,
                },
                mode_state_topic: `${mode.Topic}${this.EndingState}`,
                mode_command_topic: `${mode.Topic}${this.EndingSet}`,
                temperature_state_topic: `${target.Topic}${this.EndingState}`,
                temperature_command_topic: `${target.Topic}${this.EndingSet}`,
                current_temperature_topic: `${act.Topic}${this.EndingState}`,
                min_temp: target.min ? target.min : 0,
                max_temp: target.max ? target.max : 40,
                modes: ['auto', 'heat', 'off'],
                precision: 0.1,
                temp_step: 0.1,
            };

            // Assign Subscribed Topics
            // Target
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${target.Topic}${this.EndingSet}`,
                {
                    usedDeviceId: target.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                config.climateIds.target,
                undefined,
            );

            // Mode
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${mode.Topic}${this.EndingSet}`,
                {
                    usedDeviceId: mode.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                config.climateIds.mode,
                undefined,
            );

            // Assign published Topics
            // Target
            this.assignIdStructure(
                this.PublishedIds,
                config.climateIds.target,
                {
                    usedDeviceId: target.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${target.Topic}${this.EndingState}`,
                undefined,
            );

            // Act
            this.assignIdStructure(
                this.PublishedIds,
                config.climateIds.act,
                {
                    usedDeviceId: act.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${act.Topic}${this.EndingState}`,
                undefined,
            );

            // Mode
            this.assignIdStructure(
                this.PublishedIds,
                config.climateIds.mode,
                {
                    usedDeviceId: mode.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${mode.Topic}${this.EndingState}`,
                undefined,
            );

            // State to publish for Mode
            let modeval = undefined;
            if (config.climateIds.mode.endsWith(this.EndingVirtualMode)) {
                modeval = 'auto';
            }
            // Publishing the discover message
            await this.publishDiscovery(Id, {
                topic: DiscoveryTopic,
                payload: structuredClone(DiscoveryPayload),
                informations: {
                    target: {
                        usedDeviceId: target.DeviceIdentifier,
                    },
                    act: {
                        usedDeviceId: act.DeviceIdentifier,
                    },
                    mode: {
                        usedDeviceId: mode.DeviceIdentifier,
                    },
                },
            });
            // Delay for publish new entity
            setTimeout(async () => {
                await this.publishId(config.climateIds.target, undefined, {});
                await this.publishId(config.climateIds.act, undefined, {});
                await this.publishId(config.climateIds.mode, modeval, {});
                // Subscribe state for onStatechange mathode
                await this.adapter.subscribeForeignStatesAsync(config.climateIds.target);
                await this.adapter.subscribeForeignStatesAsync(config.climateIds.act);
                await this.adapter.subscribeForeignStatesAsync(config.climateIds.mode);
            }, 1000);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * *************** generate Foreign Climate Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the climate entity, wich is to genereate
     */
    async generateForeignClimateIds(config) {
        const activeFunction = 'generateForeignClimateIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const climateIds = { target: '', act: '', mode: '' };
            climateIds.target = config.TargetId;
            climateIds.act = config.ActId;
            if (config.VirtualMode) {
                climateIds.mode = `${climateIds.target}${this.EndingVirtualMode}`;
            } else {
                climateIds.mode = config.ModeId;
            }
            for (const id of Object.values(climateIds)) {
                // Just lock to object, if it does not end with Virtual Mode
                if (!id.endsWith(this.EndingVirtualMode)) {
                    if (!(await this.adapter.getForeignObjectAsync(id))) {
                        this.adapter.log.debug(`Id: ${id} does not exsit.`);
                        return false;
                    }
                }
            }
            if (config.ClimateName === '') {
                this.adapter.log.debug(`Climate name is empty`);
                return false;
            }
            const indexOfSpace = config.ClimateName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.ClimateName = config.ClimateName.substring(0, indexOfSpace);
            }
            config.climateIds = climateIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     */
    async getForeignHumidifierConfig() {
        const activeFunction = 'bridge.js - getForeignHumidifierConfig';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const config of this.adapter.config.HumidifierForeignConfig) {
                await this.discoverForeignHumidifier(config);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     *
     * @param config config of the climate entity
     */
    async discoverForeignHumidifier(config) {
        const activeFunction = 'bridge.js - discoverForeignHumidifier';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Assign the Ids (use the codenameing of discoverClimate)
            if (!(await this.generateForeignHumidifierIds(config))) {
                this.adapter.log.warn(
                    `The Foreign Humidifier config is not complete, or has error(s): ${config.ClimateName}`,
                );
                return;
            }

            // On Off
            const onOff = {};
            onOff.DeviceIdentifier = (await this.getParentNameing(config.HumidifierIds.onOff))?.parentName;
            onOff.uniqueString = await this.getUniqueString(config.HumidifierIds.onOff, onOff.DeviceIdentifier);
            onOff.Topic = `${this.bridgeMqttClient.BridgePrefix}${onOff.uniqueString?.path}`.toLowerCase();

            // Target
            const target = {};
            target.DeviceIdentifier = (await this.getParentNameing(config.HumidifierIds.target))?.parentName;
            target.uniqueString = await this.getUniqueString(config.HumidifierIds.target, target.DeviceIdentifier);
            target.Topic = `${this.bridgeMqttClient.BridgePrefix}${target.uniqueString?.path}`.toLowerCase();

            //Min und Max holen
            const targetObject = await this.adapter.getForeignObjectAsync(config.HumidifierIds.target);
            if (targetObject.common.min) {
                target.min = targetObject.common.min;
            }
            if (targetObject.common.max) {
                target.max = targetObject.common.max;
            }

            // Act
            const act = {};
            act.DeviceIdentifier = (await this.getParentNameing(config.HumidifierIds.act))?.parentName;
            act.uniqueString = await this.getUniqueString(config.HumidifierIds.act, act.DeviceIdentifier);
            act.Topic = `${this.bridgeMqttClient.BridgePrefix}${act.uniqueString?.path}`.toLowerCase();

            const humidifierUniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${config.HumidifierName}`,
                onOff.DeviceIdentifier,
            );
            const entityType = config.Humidifier ? this.HumidifierEntityType : this.DeHumidifierEntityType;
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.HumidifierEntityType}/${humidifierUniqueString?.path}/config`.toLowerCase();
            const indexLastDotOnOff = config.HumidifierIds.onOff.lastIndexOf('.');
            const Id = config.HumidifierIds.onOff.substring(0, indexLastDotOnOff) + this.EndingVirtualHumidifier;

            const DiscoveryPayload = {
                name: config.HumidifierName,
                unique_id: `${humidifierUniqueString?.flat}`.toLowerCase(),
                device: {
                    identifiers: [this.normalizeString(onOff.DeviceIdentifier).toLowerCase()],
                    name: onOff.DeviceIdentifier,
                },
                device_class: `${entityType}`,
                state_topic: `${onOff.Topic}${this.EndingState}`,
                command_topic: `${onOff.Topic}${this.EndingSet}`,
                state_on: 'true',
                state_off: 'false',
                payload_on: 'true',
                payload_off: 'false',
                min_humidity: target.min ? target.min : 0,
                max_humidity: target.max ? target.max : 100,
                target_humidity_state_topic: `${target.Topic}${this.EndingState}`,
                target_humidity_command_topic: `${target.Topic}${this.EndingSet}`,
            };
            if (config.WithAct) {
                DiscoveryPayload.current_humidity_topic = `${act.Topic}${this.EndingState}`;
            }
            // Assign Subscribed Topics
            // On Off
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${onOff.Topic}${this.EndingSet}`,
                {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                config.HumidifierIds.onOff,
                undefined,
            );

            // Target
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${target.Topic}${this.EndingSet}`,
                {
                    usedDeviceId: target.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                config.HumidifierIds.target,
                undefined,
            );

            // Assign published Topics
            // On Off
            this.assignIdStructure(
                this.PublishedIds,
                config.HumidifierIds.onOff,
                {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${onOff.Topic}${this.EndingState}`,
                undefined,
            );

            // Target
            this.assignIdStructure(
                this.PublishedIds,
                config.HumidifierIds.target,
                {
                    usedDeviceId: target.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${target.Topic}${this.EndingState}`,
                undefined,
            );

            // Act
            this.assignIdStructure(
                this.PublishedIds,
                config.HumidifierIds.act,
                {
                    usedDeviceId: act.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${act.Topic}${this.EndingState}`,
                undefined,
            );
            const informations = {
                onOff: {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
                target: {
                    usedDeviceId: target.DeviceIdentifier,
                },
            };
            if (config.WithAct) {
                informations.act = { usedDeviceId: act.DeviceIdentifier };
            }
            // Publishing the discover message
            await this.publishDiscovery(Id, {
                topic: DiscoveryTopic,
                payload: structuredClone(DiscoveryPayload),
                informations: informations,
            });
            // Delay for publish new entity
            setTimeout(async () => {
                await this.publishId(config.HumidifierIds.onOff, undefined, {});
                await this.publishId(config.HumidifierIds.target, undefined, {});
                if (config.WithAct) {
                    await this.publishId(config.HumidifierIds.act, undefined, {});
                }
                // Subscribe state for onStatechange mathode
                await this.adapter.subscribeForeignStatesAsync(config.HumidifierIds.onOff);
                await this.adapter.subscribeForeignStatesAsync(config.HumidifierIds.target);
                if (config.WithAct) {
                    await this.adapter.subscribeForeignStatesAsync(config.HumidifierIds.act);
                }
            }, 1000);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * *************** generate Foreign Humidifier Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the climate entity, wich is to genereate
     */
    async generateForeignHumidifierIds(config) {
        const activeFunction = 'generateForeignHumidifierIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const HumidifierIds = { onOff: '', target: '', act: '' };
            HumidifierIds.onOff = config.OnOffId;
            HumidifierIds.target = config.TargetId;
            HumidifierIds.act = config.ActId;
            for (const id of Object.values(HumidifierIds)) {
                if (!(await this.adapter.getForeignObjectAsync(id))) {
                    this.adapter.log.debug(`Id: ${id} does not exsit.`);
                    return false;
                }
            }
            if (config.HumidifierName === '') {
                this.adapter.log.debug(`Humidifier name is empty`);
                return false;
            }
            const indexOfSpace = config.HumidifierName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.HumidifierName = config.HumidifierName.substring(0, indexOfSpace);
            }
            config.HumidifierIds = HumidifierIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     */
    async getForeignLightConfig() {
        const activeFunction = 'bridge.js - getForeignLightConfig';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const config of this.adapter.config.LightForeignConfig) {
                await this.discoverForeignLight(config);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     *
     * @param config config of the climate entity
     */
    async discoverForeignLight(config) {
        const activeFunction = 'bridge.js - discoverForeignLight';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Assign the Ids (use the codenameing of discoverClimate)
            if (!(await this.generateForeignLightIds(config))) {
                this.adapter.log.warn(
                    `The Foreign Light config is not complete, or has error(s): ${config.ClimateName}`,
                );
                return;
            }

            // On Off
            const onOff = {};
            onOff.DeviceIdentifier = (await this.getParentNameing(config.LightIds.onOff))?.parentName;

            const lightUniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${config.LightName}`,
                onOff.DeviceIdentifier,
            );

            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.LightEntityType}/${lightUniqueString?.path}/config`.toLowerCase();
            const indexLastDotOnOff = config.LightIds.onOff.lastIndexOf('.');
            const Id = config.LightIds.onOff.substring(0, indexLastDotOnOff) + this.EndingVirtualLight;

            // Generate Light Topic
            const lightTopic = `${this.bridgeMqttClient.BridgePrefix}${lightUniqueString?.path}`.toLowerCase();

            const DiscoveryPayload = {
                name: config.LightName,
                unique_id: `${lightUniqueString?.flat}`.toLowerCase(),
                schema: 'json',
                command_topic: `${lightTopic}${this.EndingSet}`,
                state_topic: `${lightTopic}${this.EndingState}`,
                payload_on: 'ON',
                payload_off: 'OFF',
                device: {
                    identifiers: [this.normalizeString(onOff.DeviceIdentifier).toLowerCase()],
                    name: onOff.DeviceIdentifier,
                },
            };
            if (config.LightBrightness) {
                DiscoveryPayload.brightness = true;
                // Read Brightness Object to get Max Value
                const brightnessObject = await this.adapter.getForeignObjectAsync(config.LightIds.brightness);
                if (brightnessObject.common.max) {
                    DiscoveryPayload.brightness_scale = brightnessObject.common.max;
                } else {
                    DiscoveryPayload.brightness_scale = 100;
                }
            }
            if (config.LightColor) {
                DiscoveryPayload.supported_color_modes = ['rgb'];
            }
            const effectSet = {};
            let effectState = {};
            if (config.LightEffects) {
                const effectObject = await this.adapter.getForeignObjectAsync(config.LightIds.effects);
                const effect_list = [];
                const isNumber = effectObject.common.type && effectObject.common.type === 'number' ? true : false;
                if (effectObject.common.states) {
                    effectState = effectObject.common.states;
                    for (const effect in effectObject.common.states) {
                        if (isNumber) {
                            effectSet[effectObject.common.states[effect]] = Number(effect);
                        } else {
                            effectSet[effectObject.common.states[effect]] = effect;
                        }
                        effect_list.push(effectObject.common.states[effect]);
                    }
                }
                DiscoveryPayload.effect = true;
                DiscoveryPayload.effect_list = effect_list;
            }

            // Assign Subscribed Topic
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${lightTopic}${this.EndingSet}`,
                {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                Id,
                { light: true, LightIds: config.LightIds, effects: effectSet },
            );

            // Define Additional Object for Published Ids
            const additionalObject = { light: true, LightIds: config.LightIds, effects: effectState };

            // Assign published Ids
            this.assignIdStructure(
                this.PublishedIds,
                config.LightIds.onOff,
                {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                `${lightTopic}${this.EndingState}`,
                additionalObject,
            );

            if (config.LightBrightness) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.LightIds.brightness,
                    {
                        usedDeviceId: onOff.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${lightTopic}${this.EndingState}`,
                    additionalObject,
                );
            }

            if (config.LightColor) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.LightIds.color,
                    {
                        usedDeviceId: onOff.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${lightTopic}${this.EndingState}`,
                    additionalObject,
                );
            }

            if (config.LightEffects) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.LightIds.effects,
                    {
                        usedDeviceId: onOff.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${lightTopic}${this.EndingState}`,
                    additionalObject,
                );
            }

            const informations = {
                onOff: {
                    usedDeviceId: onOff.DeviceIdentifier,
                },
            };

            // Publishing the discover message
            await this.publishDiscovery(Id, {
                topic: DiscoveryTopic,
                payload: structuredClone(DiscoveryPayload),
                informations: informations,
            });
            // Delay for publish new entity
            setTimeout(async () => {
                await this.publishId(config.LightIds.onOff, undefined, {});
                if (config.LightBrightness) {
                    await this.publishId(config.LightIds.brightness, undefined, {});
                }
                if (config.LightColors) {
                    await this.publishId(config.LightIds.color, undefined, {});
                }
                if (config.LightEffects) {
                    await this.publishId(config.LightIds.effects, undefined, {});
                }
                // Subscribe state for onStatechange mathode
                await this.adapter.subscribeForeignStatesAsync(config.LightIds.onOff);
                if (config.LightBrightness) {
                    await this.adapter.subscribeForeignStatesAsync(config.LightIds.brightness);
                }
                if (config.LightColor) {
                    await this.adapter.subscribeForeignStatesAsync(config.LightIds.color);
                }
                if (config.LightEffects) {
                    await this.adapter.subscribeForeignStatesAsync(config.LightIds.effects);
                }
            }, 1000);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * *************** generate Foreign Light Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the climate entity, wich is to genereate
     */
    async generateForeignLightIds(config) {
        const activeFunction = 'generateForeignLightIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const LightIds = { onOff: '' };
            LightIds.onOff = config.OnOffId;
            if (config.LightBrightness) {
                LightIds.brightness = config.BrightnessId;
            }
            if (config.LightColor) {
                LightIds.color = config.ColorId;
            }
            if (config.LightEffects) {
                LightIds.effects = config.EffectsId;
            }
            for (const id of Object.values(LightIds)) {
                if (!(await this.adapter.getForeignObjectAsync(id))) {
                    this.adapter.log.debug(`Id: ${id} does not exsit.`);
                    return false;
                }
            }
            if (config.LightName === '') {
                this.adapter.log.debug(`Light name is empty`);
                return false;
            }
            const indexOfSpace = config.LightName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.LightName = config.LightName.substring(0, indexOfSpace);
            }
            config.LightIds = LightIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     */
    async getForeignStatesForStandardEntities() {
        const activeFunction = 'bridge.js - getForeignStatesForStandardEntities';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const idBridgefunction = this.adapter.config.BridgeEnum;
            if (idBridgefunction !== '' && idBridgefunction !== '*') {
                await this.adapter.subscribeForeignObjectsAsync(idBridgefunction);
                const bridgeElements = await this.adapter.getForeignObjectAsync(idBridgefunction);
                if (bridgeElements) {
                    for (const member of bridgeElements.common.members) {
                        if (!member.startsWith(this.adapter.namespace)) {
                            await this.discoverForeignRange(member);
                        } else {
                            this.adapter.log.warn(
                                `The bridge enum is set within adapternamespace. please remove form id: ${member}`,
                            );
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     */
    async getForeignCoverConfig() {
        const activeFunction = 'bridge.js - getForeignCoverConfig';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const config of this.adapter.config.CoverForeignConfig) {
                await this.discoverForeignCover(config);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     *
     * @param config config of the cover entity
     */
    async discoverForeignCover(config) {
        const activeFunction = 'bridge.js - discoverForeignCover';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Assign the Ids (use the codenameing of discoverClimate)
            if (!(await this.generateForeignCoverIds(config))) {
                this.adapter.log.warn(
                    `The Foreign Cover config is not complete, or has error(s): ${config.ClimateName}`,
                );
                return;
            }

            const Cover = {};
            const setAssign = {};
            // Open
            if (config.CoverIds.open) {
                Cover.open = {};
                setAssign.OPEN = { id: config.CoverIds.open, val: true };
                Cover.open.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.open))?.parentName;
            }

            // Close
            if (config.CoverIds.close) {
                Cover.close = {};
                setAssign.CLOSE = { id: config.CoverIds.close, val: true };
                Cover.close.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.close))?.parentName;
            }

            // Stop
            if (config.CoverIds.stop) {
                Cover.stop = {};
                setAssign.STOP = { id: config.CoverIds.stop, val: true };
                Cover.stop.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.stop))?.parentName;
            }

            // Command
            if (config.CoverIds.command) {
                Cover.command = {};
                setAssign.OPEN = { id: config.CoverIds.command, val: 'OPEN' };
                setAssign.CLOSE = { id: config.CoverIds.command, val: 'CLOSE' };
                setAssign.STOP = { id: config.CoverIds.command, val: 'STOP' };
                Cover.command.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.command))?.parentName;
            }

            // Number
            if (config.CoverIds.number) {
                Cover.number = {};
                const numberObject = await this.adapter.getForeignObjectAsync(config.CoverIds.number);
                if (numberObject.common.states) {
                    for (const [key, value] of Object.entries(numberObject.common.states)) {
                        this.adapter.log.warn(`Key: ${key}`);
                        this.adapter.log.warn(`value: ${value}`);
                        if (value.startsWith('OPEN')) {
                            this.adapter.log.warn(`Erkannt: ${value}`);
                            setAssign.OPEN = { id: config.CoverIds.number, val: Number(key) };
                            continue;
                        }
                        if (value.startsWith('STOP')) {
                            setAssign.STOP = { id: config.CoverIds.number, val: Number(key) };
                            continue;
                        }
                        if (value.startsWith('CLOSE')) {
                            setAssign.CLOSE = { id: config.CoverIds.number, val: Number(key) };
                            continue;
                        }
                    }
                } else {
                    setAssign.OPEN = { id: config.CoverIds.number, val: 1 };
                    setAssign.STOP = { id: config.CoverIds.number, val: 2 };
                    setAssign.CLOSE = { id: config.CoverIds.number, val: 3 };
                }
                Cover.number.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.number))?.parentName;
            }

            // Position
            if (config.CoverIds.position) {
                Cover.position = {};
                Cover.position.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.position))?.parentName;
                Cover.position.uniqueString = await this.getUniqueString(
                    config.CoverIds.position,
                    Cover.position.DeviceIdentifier,
                );
                Cover.position.Topic =
                    `${this.bridgeMqttClient.BridgePrefix}${Cover.position.uniqueString?.path}`.toLowerCase();
            }

            // Tilt
            if (config.CoverIds.tilt) {
                Cover.tilt = {};
                Cover.tilt.DeviceIdentifier = (await this.getParentNameing(config.CoverIds.tilt))?.parentName;
                Cover.tilt.uniqueString = await this.getUniqueString(config.CoverIds.tilt, Cover.tilt.DeviceIdentifier);
                Cover.tilt.Topic =
                    `${this.bridgeMqttClient.BridgePrefix}${Cover.tilt.uniqueString?.path}`.toLowerCase();
            }

            // Open Signal
            if (config.CoverIds.openSignal) {
                Cover.openSignal = {};
                Cover.openSignal.DeviceIdentifier = (
                    await this.getParentNameing(config.CoverIds.openSignal)
                )?.parentName;
            }

            // Closed Signal
            if (config.CoverIds.closedSignal) {
                Cover.closedSignal = {};
                Cover.closedSignal.DeviceIdentifier = (
                    await this.getParentNameing(config.CoverIds.closedSignal)
                )?.parentName;
            }

            // Assign deviceIdentifier
            let deviceIdentifier = '';
            let generalId = '';
            if (Cover.open) {
                deviceIdentifier = Cover.open.DeviceIdentifier;
                generalId = config.CoverIds.open;
            } else if (Cover.command) {
                deviceIdentifier = Cover.command.DeviceIdentifier;
                generalId = config.CoverIds.command;
            } else if (Cover.number) {
                deviceIdentifier = Cover.number.DeviceIdentifier;
                generalId = config.CoverIds.number;
            } else if (Cover.position) {
                deviceIdentifier = Cover.position.DeviceIdentifier;
                generalId = config.CoverIds.position;
            }

            // unique string
            const coverUniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${config.CoverName}`,
                deviceIdentifier,
            );
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.CoverEntityType}/${coverUniqueString?.path}/config`.toLowerCase();
            const indexLastDotOnOff = generalId.lastIndexOf('.');
            const Id = generalId.substring(0, indexLastDotOnOff) + this.EndingVirtualCover;

            // Generate Light Topic
            const coverTopic = `${this.bridgeMqttClient.BridgePrefix}${coverUniqueString?.path}`.toLowerCase();

            const DiscoveryPayload = {
                name: config.CoverName,
                unique_id: `${coverUniqueString?.flat}`.toLowerCase(),
                device_class: config.CoverDeviceClass,
                device: {
                    identifiers: [this.normalizeString(deviceIdentifier).toLowerCase()],
                    name: deviceIdentifier,
                },
            };
            if (config.CoverIds.open || config.CoverIds.command || config.CoverIds.number) {
                DiscoveryPayload.command_topic = `${coverTopic}${this.EndingSet}`;
            }
            if (config.CoverIds.position) {
                DiscoveryPayload.set_position_topic = `${Cover.position.Topic}${this.EndingSet}`;
                DiscoveryPayload.position_topic = `${Cover.position.Topic}${this.EndingState}`;
            }
            if (config.CoverIds.tilt) {
                DiscoveryPayload.tilt_command_topic = `${Cover.tilt.Topic}${this.EndingSet}`;
                DiscoveryPayload.tilt_status_topic = `${Cover.tilt.Topic}${this.EndingState}`;
                // Read Tilt Object to get Max Value
                const tiltObject = await this.adapter.getForeignObjectAsync(config.CoverIds.tilt);
                if (tiltObject.common.max) {
                    DiscoveryPayload.tilt_max = tiltObject.common.max;
                } else {
                    DiscoveryPayload.brightness_scale = 100;
                }
                if (tiltObject.common.min) {
                    DiscoveryPayload.tilt_max = tiltObject.common.min;
                } else {
                    DiscoveryPayload.brightness_scale = 0;
                }
            }
            if (config.CoverIds.openSignal || config.CoverIds.closedSignal) {
                DiscoveryPayload.state_topic = `${coverTopic}${this.EndingState}`;
            }

            // Assign Subscribed Topics
            // Incomming set
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${coverTopic}${this.EndingSet}`,
                {
                    usedDeviceId: deviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                Id,
                { cover: true, messageAssign: setAssign },
            );

            // Position
            if (config.CoverIds.position) {
                this.assignTopicStructure(
                    this.SubscribedTopics,
                    `${Cover.position.Topic}${this.EndingSet}`,
                    {
                        usedDeviceId: Cover.position.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    config.CoverIds.position,
                    { cover: true, position: true },
                );
            }

            // Tilt
            if (config.CoverIds.tilt) {
                this.assignTopicStructure(
                    this.SubscribedTopics,
                    `${Cover.tilt.Topic}${this.EndingSet}`,
                    {
                        usedDeviceId: Cover.tilt.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    config.CoverIds.tilt,
                    { cover: true, tilt: true },
                );
            }

            // Assign Published Ids
            // Position
            if (config.CoverIds.position) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.CoverIds.position,
                    {
                        usedDeviceId: Cover.position.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${Cover.position.Topic}${this.EndingState}`,
                    { cover: true, position: true },
                );
            }

            // Tilt
            if (config.CoverIds.tilt) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.CoverIds.tilt,
                    {
                        usedDeviceId: Cover.tilt.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${Cover.tilt.Topic}${this.EndingState}`,
                    { cover: true, tilt: true },
                );
            }

            // Open limit switch
            if (config.CoverIds.openSignal) {
                const openKey = String(config.CoverOpenSignalTrue);
                const closingKey = String(!config.CoverOpenSignalTrue);
                this.assignIdStructure(
                    this.PublishedIds,
                    config.CoverIds.openSignal,
                    {
                        usedDeviceId: Cover.openSignal.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${coverTopic}${this.EndingState}`,
                    { cover: true, messageAssign: { [openKey]: 'open', [closingKey]: 'closing' } },
                );
            }

            // Closed limit switch
            if (config.CoverIds.closedSignal) {
                const closedKey = String(config.CoverClosedSignalTrue);
                const openingKey = String(!config.CoverClosedSignalTrue);
                this.assignIdStructure(
                    this.PublishedIds,
                    config.CoverIds.closedSignal,
                    {
                        usedDeviceId: Cover.closedSignal.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${coverTopic}${this.EndingState}`,
                    {
                        cover: true,
                        messageAssign: { [closedKey]: 'closed', [openingKey]: 'opening' },
                    },
                );
            }

            const informations = {
                cover: {
                    usedDeviceId: deviceIdentifier,
                },
            };

            // Publishing the discover message
            await this.publishDiscovery(Id, {
                topic: DiscoveryTopic,
                payload: structuredClone(DiscoveryPayload),
                informations: informations,
            });
            // Delay for publish new entity
            setTimeout(async () => {
                // Subscribe state for onStatechange mathode
                if (config.CoverIds.position) {
                    await this.publishId(config.CoverIds.position, undefined, {});
                    await this.adapter.subscribeForeignStatesAsync(config.CoverIds.position);
                }
                if (config.CoverIds.tilt) {
                    await this.publishId(config.CoverIds.tilt, undefined, {});
                    await this.adapter.subscribeForeignStatesAsync(config.CoverIds.tilt);
                }
                if (config.CoverIds.openSignal) {
                    await this.publishId(config.CoverIds.openSignal, undefined, {});
                    await this.adapter.subscribeForeignStatesAsync(config.CoverIds.openSignal);
                }
                if (config.CoverIds.closedSignal) {
                    await this.publishId(config.CoverIds.closedSignal, undefined, {});
                    await this.adapter.subscribeForeignStatesAsync(config.CoverIds.closedSignal);
                }
            }, 1000);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * *************** generate Foreign Cover Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the cover entity, wich is to genereate
     */
    async generateForeignCoverIds(config) {
        const activeFunction = 'generateForeignCoverIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const CoverIds = {};
            if (config.CoverSeparate === 'string') {
                CoverIds.command = config.CommandId;
            }
            if (config.CoverSeparate === 'number') {
                CoverIds.number = config.NumberId;
            }
            if (config.CoverSeparate === 'separate') {
                CoverIds.open = config.OpenId;
                CoverIds.close = config.CloseId;
                if (config.CoverStop) {
                    CoverIds.stop = config.StopId;
                }
            }
            if (config.CoverPosition) {
                CoverIds.position = config.PositionId;
            }
            if (config.CoverTilt) {
                CoverIds.tilt = config.TiltId;
            }
            if (config.CoverOpenSignal) {
                CoverIds.openSignal = config.OpenSignalId;
            }
            if (config.CoverClosedSignal) {
                CoverIds.closedSignal = config.ClosedSignalId;
            }
            for (const id of Object.values(CoverIds)) {
                if (!(await this.adapter.getForeignObjectAsync(id))) {
                    this.adapter.log.debug(`Id: ${id} does not exsit.`);
                    return false;
                }
            }
            if (config.CoverName === '') {
                this.adapter.log.debug(`Cover name is empty`);
                return false;
            }
            const indexOfSpace = config.CoverName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.CoverName = config.CoverName.substring(0, indexOfSpace);
            }
            config.CoverIds = CoverIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     */
    async getForeignLockConfig() {
        const activeFunction = 'bridge.js - getForeignLockConfig';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            for (const config of this.adapter.config.LockForeignConfig) {
                await this.discoverForeignLock(config);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * get Foreign states for Bridge
     *
     * @param config config of the Lock entity
     */
    async discoverForeignLock(config) {
        const activeFunction = 'bridge.js - discoverForeignLock';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Assign the Ids (use the codenameing of discoverClimate)
            if (!(await this.generateForeignLockIds(config))) {
                this.adapter.log.warn(`The Foreign Cover config is not complete, or has error(s): ${config.LockName}`);
                return;
            }

            const Lock = {};
            const setAssign = {};
            // lock
            if (config.LockIds.lock) {
                Lock.lock = {};
                setAssign.LOCK = { id: config.LockIds.lock, val: true };
                Lock.lock.DeviceIdentifier = (await this.getParentNameing(config.LockIds.lock))?.parentName;
            }

            // unlock
            if (config.LockIds.unlock) {
                Lock.unlock = {};
                setAssign.UNLOCK = { id: config.LockIds.unlock, val: true };
            }

            // open
            if (config.LockIds.open) {
                Lock.open = {};
                setAssign.OPEN = { id: config.LockIds.open, val: true };
            }

            // Command
            if (config.LockIds.command) {
                Lock.command = {};
                setAssign.LOCK = { id: config.LockIds.command, val: 'lock' };
                setAssign.UNLOCK = { id: config.LockIds.command, val: 'unlock' };
                setAssign.OPEN = { id: config.LockIds.command, val: config.commandForOpen };
                Lock.command.DeviceIdentifier = (await this.getParentNameing(config.LockIds.command))?.parentName;
            }

            // State
            if (config.LockIds.state) {
                Lock.state = {};
                Lock.state.DeviceIdentifier = (await this.getParentNameing(config.LockIds.state))?.parentName;
            }

            // Assign deviceIdentifier
            let deviceIdentifier = '';
            let generalId = '';
            if (Lock.lock) {
                deviceIdentifier = Lock.lock.DeviceIdentifier;
                generalId = config.LockIds.open;
            } else if (Lock.command) {
                deviceIdentifier = Lock.command.DeviceIdentifier;
                generalId = config.LockIds.command;
            }

            // unique string
            const lockUniqueString = await this.getUniqueString(
                `${this.adapter.namespace}.${config.LockName}`,
                deviceIdentifier,
            );
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.LockEntityType}/${lockUniqueString?.path}/config`.toLowerCase();
            const indexLastDotOnOff = generalId.lastIndexOf('.');
            const Id = generalId.substring(0, indexLastDotOnOff) + this.EndingVirtualLock;

            // Generate Light Topic
            const lockTopic = `${this.bridgeMqttClient.BridgePrefix}${lockUniqueString?.path}`.toLowerCase();

            const DiscoveryPayload = {
                name: config.LockName,
                unique_id: `${lockUniqueString?.flat}`.toLowerCase(),
                payload_open: 'OPEN',
                device: {
                    identifiers: [this.normalizeString(deviceIdentifier).toLowerCase()],
                    name: deviceIdentifier,
                },
            };
            DiscoveryPayload.command_topic = `${lockTopic}${this.EndingSet}`;
            if (config.LockIds.state) {
                DiscoveryPayload.state_topic = `${lockTopic}${this.EndingState}`;
            }

            // Assign Subscribed Topics
            // Incomming set
            this.assignTopicStructure(
                this.SubscribedTopics,
                `${lockTopic}${this.EndingSet}`,
                {
                    usedDeviceId: deviceIdentifier,
                },
                DiscoveryTopic,
                DiscoveryPayload,
                Id,
                { lock: true, messageAssign: setAssign },
            );

            // Assign Published Ids
            // sending state
            if (config.LockIds.state) {
                this.assignIdStructure(
                    this.PublishedIds,
                    config.LockIds.state,
                    {
                        usedDeviceId: Lock.state.DeviceIdentifier,
                    },
                    DiscoveryTopic,
                    DiscoveryPayload,
                    `${lockTopic}${this.EndingState}`,
                    { lock: true, messageAssign: { locked: 'LOCKED', unlocked: 'UNLOCKED' } },
                );
            }

            const informations = {
                lock: {
                    usedDeviceId: deviceIdentifier,
                },
            };

            // Publishing the discover message
            await this.publishDiscovery(Id, {
                topic: DiscoveryTopic,
                payload: structuredClone(DiscoveryPayload),
                informations: informations,
            });
            // Delay for publish new entity
            setTimeout(async () => {
                // Subscribe state for onStatechange mathode
                if (config.LockIds.state) {
                    await this.publishId(config.LockIds.state, undefined, {});
                    await this.adapter.subscribeForeignStatesAsync(config.LockIds.state);
                }
            }, 1000);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * *************** generate Foreign Lock Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the Lock entity, wich is to genereate
     */
    async generateForeignLockIds(config) {
        const activeFunction = 'generateForeignLockIds';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const LockIds = {};
            if (config.LockSeparate === 'string') {
                LockIds.command = config.CommandId;
            }
            if (config.LockSeparate === 'separate') {
                LockIds.lock = config.LockId;
                LockIds.unlock = config.UnlockId;
                if (config.LockOpen) {
                    LockIds.open = config.OpenId;
                }
            }
            if (config.LockSeparateState) {
                LockIds.state = config.StateId;
            }
            for (const id of Object.values(LockIds)) {
                if (!(await this.adapter.getForeignObjectAsync(id))) {
                    this.adapter.log.debug(`Id: ${id} does not exsit.`);
                    return false;
                }
            }
            if (config.LockName === '') {
                this.adapter.log.debug(`Cover name is empty`);
                return false;
            }
            const indexOfSpace = config.LockName.indexOf(' -- ');
            if (indexOfSpace > 0) {
                config.LockName = config.LockName.substring(0, indexOfSpace);
            }
            config.LockIds = LockIds;
            return true;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id id to discover foreign state
     * @param clear clear the ids from internal memory
     */
    async discoverForeignRange(id, clear = false) {
        const activeFunction = 'bridge.js - discoverForeignRange';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const params = {
                startkey: id,
                endkey: `${id}.\u9999`,
            };
            if (!clear) {
                this.ForeignBridgeMembers[id] = id;
            } else {
                delete this.ForeignBridgeMembers[id];
            }
            const states = await this.adapter.getObjectViewAsync('system', 'state', params);
            for (const state of states.rows) {
                if (!clear) {
                    const common = state.value.common;
                    await this.discoverForeignStandardEntity(state.id, { common: common });
                } else {
                    if (
                        this.DiscoveredIds[state.id] &&
                        this.DiscoveredIds[state.id].payload &&
                        this.DiscoveredIds[state.id].payload.command_topic
                    ) {
                        delete this.SubscribedTopics[this.DiscoveredIds[state.id].payload.command_topic];
                    }
                    delete this.PublishedIds[state.id];
                    this.DiscoveredIds[state.id].payload = '';
                    await this.adapter.unsubscribeForeignStatesAsync(state.id);
                    await this.publishDiscovery(state.id, this.DiscoveredIds[state.id]);
                    delete this.DiscoveredIds[state.id];
                    await this.adapter.setState('info.discoveredIds', JSON.stringify(this.DiscoveredIds), true);
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id} - clear: ${clear}`);
        }
    }

    /**
     * @param id id to get ParentNameing
     */
    async getParentNameing(id) {
        const activeFunction = 'bridge.js - getParentNameing';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            let parentId = '';
            let parentName = '';
            const parentDevice = await this.getParentDevice(id);
            if (typeof parentDevice !== 'object') {
                this.adapter.log.debug(`Parentdevice: ${parentDevice}`);
                const parentChannel = await this.getParentChannel(id);
                if (typeof parentChannel !== 'object') {
                    if (parentChannel === undefined) {
                        const indexOfFistDot = id.indexOf('.');
                        const indexOfSecondDot = id.indexOf('.', indexOfFistDot);
                        parentId = id.substring(0, indexOfSecondDot);
                    } else {
                        parentId = parentChannel;
                    }
                    parentName = parentId;
                } else {
                    this.adapter.log.debug(`Parentchannel: ${JSON.stringify(parentChannel)}`);
                    parentId = parentChannel._id;
                    if (typeof parentChannel.common.name === 'string') {
                        parentName = parentChannel.common.name;
                    } else {
                        parentName = parentChannel.common.name.de;
                    }
                    if (parentName === '') {
                        parentName = parentId;
                    }
                }
            } else {
                this.adapter.log.debug(`Parentdevice: ${JSON.stringify(parentDevice)}`);
                parentId = parentDevice._id;
                if (typeof parentDevice.common.name === 'string') {
                    parentName = parentDevice.common.name;
                } else {
                    parentName = parentDevice.common.name.de;
                }
            }
            if (parentName === '') {
                this.adapter.log.warn(`The id: ${parentId} has empty Name`);
            }
            return { parentId: parentId, parentName: parentName };
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - id: ${id}`);
        }
    }

    /**
     * @param id id to discover foreign state
     * @param options options of foreign state
     */
    async discoverForeignStandardEntity(id, options) {
        const activeFunction = 'bridge.js - discoverForeignStandardEntity';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const state = await this.adapter.getForeignStateAsync(id);

            const parentNameing = await this.getParentNameing(id);
            const deviceIdentifier = parentNameing?.parentName;
            const statename = id.substring((parentNameing?.parentId?.length ?? 0) + 1, id.length);
            this.adapter.log.debug(`Assigned - deviceIdentifier: ${deviceIdentifier} - statename: ${statename}`);
            options.Bridgestate = {
                publish: true,
                subscribe: options.common.write,
            };
            //const normalizedStateName = this.normalizeString(statename);
            const normalizedDeviceIdentifier = this.normalizeString(deviceIdentifier);
            const uniqueString = await this.getUniqueString(id, deviceIdentifier);
            /*const topic =
                `${this.bridgeMqttClient.BridgePrefix}${normalizedDeviceIdentifier}/${normalizedStateName}`.toLowerCase();*/
            const topic = `${this.bridgeMqttClient.BridgePrefix}${uniqueString?.path}`.toLowerCase();
            const EntityType = await this.getEntityType(options);
            const AdditionalAttributes = await this.getStateAttributes(options.common, EntityType);
            /*const discoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${EntityType}/${normalizedDeviceIdentifier}/${normalizedStateName}/config`.toLowerCase();*/
            const discoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${EntityType}/${uniqueString?.path}/config`.toLowerCase();
            const discoveryPayload = {
                name: statename,
                unique_id: `${uniqueString?.flat}`.toLowerCase(),
                device: { identifiers: [normalizedDeviceIdentifier.toLowerCase()], name: deviceIdentifier },
            };
            // Add Topics
            discoveryPayload.state_topic = `${topic}${this.EndingState}`;
            if (options.Bridgestate.subscribe) {
                discoveryPayload.command_topic = `${topic}${this.EndingSet}`;
            }

            // Assign Attibute to Payload
            for (const Attribute in AdditionalAttributes) {
                discoveryPayload[Attribute] = AdditionalAttributes[Attribute];
            }

            if (options.Bridgestate.publish) {
                this.assignIdStructure(
                    this.PublishedIds,
                    id,
                    {
                        usedDeviceId: deviceIdentifier,
                    },
                    discoveryTopic,
                    discoveryPayload,
                    discoveryPayload.state_topic,
                    undefined,
                );
            }
            if (options.Bridgestate.subscribe) {
                this.assignTopicStructure(
                    this.SubscribedTopics,
                    discoveryPayload.command_topic,
                    {
                        usedDeviceId: deviceIdentifier,
                    },
                    discoveryTopic,
                    discoveryPayload,
                    id,
                    undefined,
                );
            }
            await this.publishDiscovery(id, {
                topic: discoveryTopic,
                payload: structuredClone(discoveryPayload),
                informations: {
                    usedDeviceId: deviceIdentifier,
                },
            });
            // Delay for publish new entity
            setTimeout(async () => {
                await this.publishId(id, state.val, {});
            }, 1000);
            // Subscribe state for onStatechange mathode
            await this.adapter.subscribeForeignStatesAsync(id);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id id of the state
     * @param deviceidentifier identifier to device
     */
    async getUniqueString(id, deviceidentifier) {
        const activeFunction = 'bridge.js - getUniqueString';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const unique = {
                flat: `${this.normalizeString(deviceidentifier)}_${this.normalizeString(id)}`,
                path: `${this.normalizeString(deviceidentifier)}/${this.normalizeString(id)}`,
            };
            return unique;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id id to get parent Channel
     */
    async getParentDevice(id) {
        const activeFunction = 'bridge.js - getParentDevice';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const firstIdexOfDot = id.indexOf('.');
            const lastIdexOfDot = id.lastIndexOf('.');
            if (lastIdexOfDot > firstIdexOfDot + 3) {
                id = id.substring(0, lastIdexOfDot);
                const obj = await this.adapter.getForeignObjectAsync(id);
                if (!obj) {
                    return undefined;
                }
                if (obj?.type === 'device') {
                    return obj;
                }
                return await this.getParentDevice(id);
            }
            return id.substring(0, lastIdexOfDot);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id id to get parent Channel
     */
    async getParentChannel(id) {
        const activeFunction = 'bridge.js - getParentChannel';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const firstIdexOfDot = id.indexOf('.');
            const lastIdexOfDot = id.lastIndexOf('.');
            if (lastIdexOfDot > firstIdexOfDot + 3) {
                id = id.substring(0, lastIdexOfDot);
                const obj = await this.adapter.getForeignObjectAsync(id);
                if (!obj) {
                    return undefined;
                }
                if (obj?.type === 'channel') {
                    return obj;
                }
                return await this.getParentChannel(id);
            }
            return id.substring(0, lastIdexOfDot);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }
}
module.exports = bridgeClass;
