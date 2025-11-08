const bridgeMqttClientClass = require('./bridgeMqttclient');
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
            SH: 'smarthome/',
        };
        this.ForeignBridgeMembers = {};
        this.MinTime = 100; // ms between publish and subscribe same value
        this.DiscoveryCronjob = {};
        this.EndingSet = '/set';
        this.EndingState = '/state';
        this.EndingVirtualClimate = '.virtual_climate';
        this.EndingVirtualHumidifier = '.virtual_humiditier';
        this.EndingVirtualMode = '.virtual_mode';
        this.NotificationId = '.notification';
        this.GeneralId = '.general';
        this.OfflineId = '.offline';
        this.OnlineId = '.online';
        this.EndingNotification = '.notification';
        this.ClimateEntityType = 'climate';
        this.HumidifierEntityType = 'humidifier';
        this.DeHumidifierEntityType = 'dehumidifier';
        this.NotificationEntityType = 'device_automation';
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
                // Check for namespace and write own, oder foreign state
                if (this.SubscribedTopics[topic].id.startsWith(this.adapter.namespace)) {
                    await this.adapter.setState(this.SubscribedTopics[topic].id, message);
                } else {
                    await this.adapter.setForeignStateAsync(this.SubscribedTopics[topic].id, message);
                }
                await this.adapter.setState('info.subscribedTopics', JSON.stringify(this.SubscribedTopics), true);
            } else {
                this.adapter.log.debug(`The received Topic ${topic} is not subscribed`);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param id Id of actual element, handled in the bridge
     * @param Stateval Value of the used Id
     * @param options Options for using spezial fuctions
     */
    async work(id, Stateval, options) {
        const activeFunction = 'bridge.js - work';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            if (this.PublishedIds[id]) {
                if (val === undefined) {
                    const State = await this.adapter.getForeignStateAsync(id);
                    if (State) {
                        val = State.val;
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
                // Query for Stateconfig
                if (this.adapter.config.BridgeStateConfig) {
                    for (const config of this.adapter.config.BridgeStateConfig) {
                        if (
                            (changeInfo.applicationId === config.Application || config.Application === '*') &&
                            (changeInfo.deviceEUI === config.Device || config.Device === '*') &&
                            (id.includes(`.${config.Folder}.`) || config.Folder === '*') &&
                            (id.endsWith(`.decoded.${config.State}`) || config.State === '*')
                        ) {
                            Bridgestate.discover = !config.exclude;
                            Bridgestate.publish = true;
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
                // Query for Stateconfig
                if (this.adapter.config.BridgeStateConfig) {
                    for (const config of this.adapter.config.BridgeStateConfig) {
                        if (
                            (changeInfo.applicationId === config.Application || config.Application === '*') &&
                            (changeInfo.deviceEUI === config.Device || config.Device === '*') &&
                            (id.includes(`.${config.Folder}.`) || config.Folder === '*') &&
                            (id.endsWith(`.control.${config.State}`) || config.State === '*')
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
     */
    assignIdStructure(assignObject, indexId, informations, topic, payload, state_topic) {
        if (!assignObject[indexId]) {
            assignObject[indexId] = { discovery: [] };
        }
        assignObject[indexId].discovery.push({
            topic: topic,
            payload: structuredClone(payload),
        });
        assignObject[indexId].state_topic = state_topic;
        assignObject[indexId].informations = structuredClone(informations);
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
     */
    assignTopicStructure(assignObject, indexTopic, informations, topic, payload, id) {
        if (!assignObject[indexTopic]) {
            assignObject[indexTopic] = { discovery: [] };
        }
        assignObject[indexTopic].discovery.push({
            topic: topic,
            payload: structuredClone(payload),
        });
        this.SubscribedTopics[indexTopic].id = id;
        this.SubscribedTopics[indexTopic].informations = structuredClone(informations);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            let indexOfStatebegin = changeInfo.id.indexOf(
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
            const StateName = changeInfo.id.substring(indexOfStatebegin, changeInfo.id.length);
            //const normalizedStateName = this.normalizeString(StateName); 08.11.2025 BeSc dont needed anymore with chenge below
            const DeviceIdentifier = this.getDeviceIdentifier(changeInfo, this.adapter.config.DeviceIdentifiers);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
                // New Device
                if (!this.discoveredDevices[normalizedDeficeIdentifier]) {
                    this.discoveredDevices[normalizedDeficeIdentifier] = {};
                    if (!this.oldDiscoveredDevices[normalizedDeficeIdentifier]) {
                        // Only messegae with ne fiscovered dewvice, if not in old discovered devices
                        returnValue.newDevice = DiscoveryObject;
                        let device = 'unknown';
                        if (DiscoveryObject.informations.usedDeviceId) {
                            device = DiscoveryObject.informations.usedDeviceId;
                        } else if (
                            DiscoveryObject.informations.target &&
                            DiscoveryObject.informations.target.usedDeviceId
                        ) {
                            device = DiscoveryObject.informations.target.usedDeviceId;
                        }
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            const role = (common?.role || '').toLowerCase();
            const unit = common?.unit || '';
            const type = common?.type || '';
            const attributes = {};

            // Einheit normalisieren
            const normalizedUnit = this.normalizeUnit(unit);
            const normalizedUnitLower = normalizedUnit.toLowerCase();

            if (entityType === 'sensor' || entityType === 'number') {
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
                } else if (role.includes('window') || role.includes('door')) {
                    attributes.device_class = 'door';
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
                .replace(/[{}]/g, '_');
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            // get old Discovered ids
            this.OldDiscoveredIds = JSON.parse((await this.adapter.getStateAsync('info.discoveredIds')).val);
            this.oldDiscoveredDevices = this.generateOldDevices(this.OldDiscoveredIds);
            //this.adapter.log.error(JSON.stringify(this.oldDiscoveredDevices));
            await this.discoverGeneralNotification();

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
                        if (!options) {
                            options = {};
                        }
                        options.common = adapterObject.common;
                        await this.work(adapterObject._id, undefined, options);
                    }
                }
            }
            await this.discoverClimate();
            await this.getForeignStatesForStandardEntities();
            await this.getForeignClimateConfig();
            await this.getForeignHumidifierConfig();
            await this.checkDiscoveries();
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param oldDiscoveredIds Ids wiche are discovered last time that Adapter runs
     */
    generateOldDevices(oldDiscoveredIds) {
        const activeFunction = 'bridge.js - generateOldDevices';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
     * check discovery for old entries
     */
    async checkDiscoveries() {
        const activeFunction = 'bridge.js - checkDiscoveries';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
                target.DeviceIdentifier,
            );
            const entityType = config.Humidifier ? this.HumidifierEntityType : this.DeHumidifierEntityType;
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.HumidifierEntityType}/${humidifierUniqueString?.path}/config`.toLowerCase();
            const indexLastDotTarget = config.HumidifierIds.target.lastIndexOf('.');
            const Id = config.HumidifierIds.target.substring(0, indexLastDotTarget) + this.EndingVirtualHumidifier;

            const DiscoveryPayload = {
                name: config.HumidifierName,
                unique_id: `${humidifierUniqueString?.flat}`.toLowerCase(),
                device: {
                    identifiers: [this.normalizeString(target.DeviceIdentifier).toLowerCase()],
                    name: target.DeviceIdentifier,
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
     * *************** generate Foreign Climate Ids **********************
     * ******************************************************************/

    /**
     * @param config Configuration of the climate entity, wich is to genereate
     */
    async generateForeignHumidifierIds(config) {
        const activeFunction = 'generateForeignHumidifierIds';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            const HumidifierIds = { onOff: '', target: '', act: '' };
            HumidifierIds.onOff = config.OnOffId;
            HumidifierIds.target = config.TargetId;
            HumidifierIds.act = config.ActId;
            for (const id of Object.values(HumidifierIds)) {
                // Just lock to object, if it does not end with Virtual Mode
                if (!id.endsWith(this.EndingVirtualMode)) {
                    if (!(await this.adapter.getForeignObjectAsync(id))) {
                        this.adapter.log.debug(`Id: ${id} does not exsit.`);
                        return false;
                    }
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
    async getForeignStatesForStandardEntities() {
        const activeFunction = 'bridge.js - getForeignStatesForStandardEntities';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
     * @param id id to discover foreign state
     * @param clear clear the ids from internal memory
     */
    async discoverForeignRange(id, clear = false) {
        const activeFunction = 'bridge.js - discoverForeignRange';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
        this.adapter.log.debug(`Function ${activeFunction} started.`);
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
