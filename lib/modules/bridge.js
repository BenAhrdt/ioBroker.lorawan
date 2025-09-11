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
        this.DiscoveredIds = {};
        this.SubscribedTopics = {};
        this.PublishedIds = {};
        this.VitualIds = {};
        this.BridgeDiscoveryPrefix = {
            HA: 'homeassistant/',
        };
        this.MinTime = 100; // ms between publish and subscribe same value
        this.DiscoveryCronjob = {};
        this.EndingSet = '/set';
        this.EndingState = '/state';
        this.EndingVirtualClimate = '.virtual_climate';
        this.EndingVirtualMode = '.virtual_mode';
        this.ClimateEntityType = 'climate';

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
                this.SubscribedTopics[topic].val = message;
                this.SubscribedTopics[topic].ts = Date.now();
                this.SubscribedTopics[topic].time = new Date(Date.now()).toLocaleString(
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
                    return;
                }
                await this.adapter.setState(this.SubscribedTopics[topic].id, message);
                await this.adapter.setState('info.subscribedTopics', JSON.stringify(this.DiscoveredIds), true);
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
            // First remove namespace from id
            id = this.adapter.removeNamespace(id);
            if (this.bridgeMqttClient.internalConnectionstate) {
                const countBefore = Object.keys(this.DiscoveredIds).length;
                await this.discovery(id, options);
                // only publish new discovered Ids
                if (countBefore !== Object.keys(this.DiscoveredIds).length) {
                    await this.publishId(id, Stateval);
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
                await this.buildDiscovery(id, options);
            } else {
                this.adapter.log.debug(`${id} allready checked for discovery`);
            }
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
                    target.normalizedDeficeIdentifier = await this.normalizeString(target.DeviceIdentifier);
                    target.Topic =
                        `${this.bridgeMqttClient.BridgePrefix}${target.normalizedDeficeIdentifier}/${target.changeInfo.changedState}`.toLocaleLowerCase();

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
                    act.Topic =
                        `${this.bridgeMqttClient.BridgePrefix}${act.normalizedDeficeIndetifier}/${act.changeInfo.changedState}`.toLowerCase();

                    // Mode
                    const mode = {};
                    mode.changeInfo = await this.adapter.getChangeInfo(config.climateIds.mode);
                    mode.DeviceIdentifier = this.getDeviceIdentifier(
                        mode.changeInfo,
                        this.adapter.config.DeviceIdentifiers,
                    );
                    mode.normalizedDeviceIdentifier = await this.normalizeString(mode.DeviceIdentifier);
                    mode.Topic =
                        `${this.bridgeMqttClient.BridgePrefix}${mode.normalizedDeviceIdentifier}/${mode.changeInfo.changedState}`.toLowerCase();

                    const normalizedClimateName = await this.normalizeString(config.ClimateName);
                    const DiscoveryTopic =
                        `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.ClimateEntityType}/${target.normalizedDeficeIdentifier}/${normalizedClimateName}/config`.toLocaleLowerCase();
                    const indexLastDotTarget = config.climateIds.target.lastIndexOf('.');
                    const Id = config.climateIds.target.substring(0, indexLastDotTarget) + this.EndingVirtualClimate;
                    const DiscoveryPayload = {
                        name: config.ClimateName,
                        unique_id: `${target.normalizedDeficeIdentifier}_${normalizedClimateName}`.toLowerCase(),
                        device: {
                            identifiers: [target.normalizedDeficeIdentifier.toLowerCase()],
                            name: target.DeviceIdentifier,
                        },
                        mode_state_topic: `${mode.Topic}${this.EndingState}`,
                        mode_command_topic: `${mode.Topic}${this.EndingSet}`,
                        temperature_state_topic: `${target.Topic}${this.EndingState}`,
                        temperature_command_topic: `${target.Topic}${this.EndingSet}`,
                        current_temperature_topic: `${target.Topic}${this.EndingState}`,
                        min_temp: target.min ? target.min : 0,
                        max_temp: target.max ? target.max : 40,
                        modes: ['auto', 'heat', 'off'],
                        precision: 0.1,
                        temp_step: 0.1,
                    };

                    // Assign Subscribed Topics
                    if (!this.SubscribedTopics[`${target.Topic}${this.EndingSet}`]) {
                        this.SubscribedTopics[`${target.Topic}${this.EndingSet}`] = { discovery: [] };
                    }
                    this.SubscribedTopics[`${target.Topic}${this.EndingSet}`].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.SubscribedTopics[`${target.Topic}${this.EndingSet}`].id = config.climateIds.target;
                    this.SubscribedTopics[`${target.Topic}${this.EndingSet}`].informations = {
                        applicationName: target.changeInfo.applicationName,
                        usedApplicationName: target.changeInfo.usedApplicationName,
                        deviceId: target.changeInfo.deviceId,
                        usedDeviceId: target.changeInfo.usedDeviceId,
                    };

                    if (!this.SubscribedTopics[`${mode.Topic}${this.EndingSet}`]) {
                        this.SubscribedTopics[`${mode.Topic}${this.EndingSet}`] = { discovery: [] };
                    }
                    this.SubscribedTopics[`${mode.Topic}${this.EndingSet}`].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.SubscribedTopics[`${mode.Topic}${this.EndingSet}`].id = config.climateIds.mode;
                    this.SubscribedTopics[`${mode.Topic}${this.EndingSet}`].informations = {
                        applicationName: mode.changeInfo.applicationName,
                        usedApplicationName: mode.changeInfo.usedApplicationName,
                        deviceId: mode.changeInfo.deviceId,
                        usedDeviceId: mode.changeInfo.usedDeviceId,
                    };

                    // Assign published Topics
                    // Target
                    if (!this.PublishedIds[config.climateIds.target]) {
                        this.PublishedIds[config.climateIds.target] = { discovery: [] };
                    }
                    this.PublishedIds[config.climateIds.target].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.target].state_topic = `${target.Topic}${this.EndingState}`;
                    this.PublishedIds[config.climateIds.target].informations = {
                        applicationName: target.changeInfo.applicationName,
                        usedApplicationName: target.changeInfo.usedApplicationName,
                        deviceId: target.changeInfo.deviceId,
                        usedDeviceId: target.changeInfo.usedDeviceId,
                    };

                    // Act
                    if (!this.PublishedIds[config.climateIds.act]) {
                        this.PublishedIds[config.climateIds.act] = { discovery: [] };
                    }
                    this.PublishedIds[config.climateIds.act].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.act].state_topic = `${act.Topic}${this.EndingState}`;
                    this.PublishedIds[config.climateIds.act].informations = {
                        applicationName: act.changeInfo.applicationName,
                        usedApplicationName: act.changeInfo.usedApplicationName,
                        deviceId: act.changeInfo.deviceId,
                        usedDeviceId: act.changeInfo.usedDeviceId,
                    };

                    // Mode
                    if (!this.PublishedIds[config.climateIds.mode]) {
                        this.PublishedIds[config.climateIds.mode] = { discovery: [] };
                    }
                    this.PublishedIds[config.climateIds.mode].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.mode].state_topic = `${mode.Topic}${this.EndingState}`;
                    this.PublishedIds[config.climateIds.mode].informations = {
                        applicationName: mode.changeInfo.applicationName,
                        usedApplicationName: mode.changeInfo.usedApplicationName,
                        deviceId: mode.changeInfo.deviceId,
                        usedDeviceId: mode.changeInfo.usedDeviceId,
                    };

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
                    await this.publishId(config.climateIds.target, undefined);
                    await this.publishId(config.climateIds.act, undefined);
                    await this.publishId(config.climateIds.mode, modeval);
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
            climateIds.target = `${config.TargetApplication}.devices.${config.TargetDevice}.${config.TargetFolder}.${config.TargetState}`;
            climateIds.act = `${config.ActApplication}.devices.${config.ActDevice}.${config.ActFolder}.${config.ActState}`;
            if (config.ModeApplication === 'NotPresent') {
                climateIds.mode = `${climateIds.target}${this.EndingVirtualMode}`;
            } else {
                climateIds.mode = `${config.ModeApplication}.devices.${config.ModeDevice}.${config.ModeFolder}.${config.ModeState}`;
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
     * @param id Id, wich is to discover
     * @param val Value of the used Id
     */
    async publishId(id, val) {
        const activeFunction = 'bridge.js - publishId';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            if (this.PublishedIds[id]) {
                if (val === undefined) {
                    const State = await this.adapter.getState(id);
                    if (State) {
                        val = State.val;
                    }
                }
                this.PublishedIds[id].ts = Date.now();
                this.PublishedIds[id].time = new Date(Date.now()).toLocaleString(
                    this.Timeoutput.Argument,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    this.Timeoutput.Format,
                );
                this.PublishedIds[id].val = val;
                if (typeof val !== 'string') {
                    val = JSON.stringify(val);
                }
                await this.bridgeMqttClient.publish(this.PublishedIds[id].state_topic, val, {
                    retain: true,
                });
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
                            (id.endsWith(config.State) || config.State === '*')
                        ) {
                            Bridgestate.discover = !config.exclude;
                            Bridgestate.publish = config.publish;
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
                            if (!this.PublishedIds[id]) {
                                this.PublishedIds[id] = { discovery: [] };
                            }
                            this.PublishedIds[id].discovery.push({
                                topic: DiscoveryObject?.topic,
                                payload: structuredClone(DiscoveryObject?.payload),
                            });
                            this.PublishedIds[id].state_topic = DiscoveryObject?.payload.state_topic;
                            this.PublishedIds[id].ts = Date.now();
                            this.PublishedIds[id].time = new Date(Date.now()).toLocaleString(
                                this.Timeoutput.Argument,
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                this.Timeoutput.Format,
                            );
                            this.PublishedIds[id].informations = {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            };
                        }
                        await this.publishDiscovery(id, {
                            topic: DiscoveryObject?.topic,
                            payload: structuredClone(DiscoveryObject?.payload),
                            informations: {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            },
                        });
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
                            (id.endsWith(config.State) || config.State === '*')
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
                            if (!this.PublishedIds[id]) {
                                this.PublishedIds[id] = { discovery: [] };
                            }
                            this.PublishedIds[id].discovery.push({
                                topic: DiscoveryObject?.topic,
                                payload: structuredClone(DiscoveryObject?.payload),
                            });
                            this.PublishedIds[id].state_topic = DiscoveryObject?.payload.state_topic;
                            this.PublishedIds[id].ts = Date.now();
                            this.PublishedIds[id].time = new Date(Date.now()).toLocaleString(
                                this.Timeoutput.Argument,
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                this.Timeoutput.Format,
                            );
                            this.PublishedIds[id].informations = {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            };
                        }
                        if (Bridgestate.subscribe) {
                            if (!this.SubscribedTopics[DiscoveryObject?.payload.command_topic]) {
                                this.SubscribedTopics[DiscoveryObject?.payload.command_topic] = { discovery: [] };
                            }
                            this.SubscribedTopics[DiscoveryObject?.payload.command_topic].discovery.push({
                                topic: DiscoveryObject?.topic,
                                payload: structuredClone(DiscoveryObject?.payload),
                            });
                            this.SubscribedTopics[DiscoveryObject?.payload.command_topic].id = id;
                        }
                        await this.publishDiscovery(id, {
                            topic: DiscoveryObject?.topic,
                            payload: structuredClone(DiscoveryObject?.payload),
                            informations: {
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                            },
                        });
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
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
            const normalizedStateName = this.normalizeString(StateName);
            const DeviceIdentifier = await this.getDeviceIdentifier(changeInfo, this.adapter.config.DeviceIdentifiers);
            const normalizedDeviceIdentifier = await this.normalizeString(DeviceIdentifier);
            const Topic =
                `${this.bridgeMqttClient.BridgePrefix}${normalizedDeviceIdentifier}/${normalizedStateName}`.toLocaleLowerCase();
            const EntityType = await this.getEntityType(options);
            const AdditionalAttributes = await this.getStateAttributes(options.common, EntityType);
            const DiscoveryTopic =
                `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${EntityType}/${normalizedDeviceIdentifier}/${normalizedStateName}/config`.toLocaleLowerCase();
            const DiscoveryPayload = {
                name: StateName,
                unique_id: `${normalizedDeviceIdentifier}_${normalizedStateName}`.toLowerCase(),
                device: { identifiers: [normalizedDeviceIdentifier.toLowerCase()], name: DeviceIdentifier },
            };
            // Add Topics
            if (options.Bridgestate.publish) {
                DiscoveryPayload.state_topic = `${Topic}${this.EndingState}`;
            }
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
        try {
            this.DiscoveredIds[id] = DiscoveryObject;
            await this.bridgeMqttClient.publish(DiscoveryObject.topic, JSON.stringify(DiscoveryObject.payload), {
                retain: true,
            });
            await this.adapter.setState('info.discoveredIds', JSON.stringify(this.DiscoveredIds), true);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
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
                    attributes.unit_of_measurement = normalizedUnit || '%';
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
                            attributes.unit_of_measurement = normalizedUnit;

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
                .replace(/ /g, '_');
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
}
module.exports = bridgeClass;
