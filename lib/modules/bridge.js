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
                if (
                    !this.PublishedIds[this.SubscribedTopics[topic].id] ||
                    this.PublishedIds[this.SubscribedTopics[topic].id].val !== message ||
                    Date.now() - this.PublishedIds[this.SubscribedTopics[topic].id].ts >= this.MinTime
                ) {
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
                }
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
                    target.ReplacedDeviceIdentifier = await this.replaceGermanSpecific(target.DeviceIdentifier);
                    target.ReplacedWithoutSpace = await this.replaceSpace(target.ReplacedDeviceIdentifier);
                    target.ReplaceWithoutSlash = await this.replaceSlash(target.ReplacedWithoutSpace);
                    target.Topic = `${this.bridgeMqttClient.BridgePrefix}${target.ReplacedDeviceIdentifier}/${target.changeInfo.changedState}`;

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
                    act.ReplacedDeviceIdentifier = await this.replaceGermanSpecific(act.DeviceIdentifier);
                    act.ReplacedWithoutSpace = await this.replaceSpace(act.ReplacedDeviceIdentifier);
                    act.ReplaceWithoutSlash = await this.replaceSlash(act.ReplacedWithoutSpace);
                    act.Topic = `${this.bridgeMqttClient.BridgePrefix}${act.ReplacedDeviceIdentifier}/${act.changeInfo.changedState}`;

                    // Mode
                    const mode = {};
                    mode.changeInfo = await this.adapter.getChangeInfo(config.climateIds.mode);
                    mode.DeviceIdentifier = this.getDeviceIdentifier(
                        mode.changeInfo,
                        this.adapter.config.DeviceIdentifiers,
                    );
                    mode.ReplacedDeviceIdentifier = await this.replaceGermanSpecific(mode.DeviceIdentifier);
                    mode.ReplacedWithoutSpace = await this.replaceSpace(mode.ReplacedDeviceIdentifier);
                    mode.ReplaceWithoutSlash = await this.replaceSlash(mode.ReplacedWithoutSpace);
                    mode.Topic = `${this.bridgeMqttClient.BridgePrefix}${mode.ReplacedDeviceIdentifier}/${mode.changeInfo.changedState}`;

                    const indexLastSlashTarget = target.Topic.lastIndexOf('/');
                    const ReplacedClimateName = await this.replaceGermanSpecific(config.ClimateName);
                    const ReplacedWithoutSpaceClimateName = await this.replaceSpace(ReplacedClimateName);
                    const ReplacedWithoutSlashClimateName = await this.replaceSlash(ReplacedWithoutSpaceClimateName);
                    const Topic = target.Topic.substring(0, indexLastSlashTarget) + this.EndingVirtualClimate;
                    const DiscoveryTopic = `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${this.ClimateEntityType}/${target.ReplaceWithoutSlash}/${ReplacedWithoutSlashClimateName}/config`;
                    const indexLastDotTarget = config.climateIds.target.lastIndexOf('.');
                    const Id = config.climateIds.target.substring(0, indexLastDotTarget) + this.EndingVirtualClimate;
                    const DiscoveryPayload = {
                        name: config.ClimateName,
                        unique_id: `${target.ReplaceWithoutSlash}_${ReplacedWithoutSlashClimateName}`.toLowerCase(),
                        device: {
                            identifiers: [target.ReplaceWithoutSlash.toLowerCase()],
                            name: target.DeviceIdentifier,
                        },
                        mode_state_topic: mode.Topic,
                        mode_command_topic: mode.Topic,
                        temperature_state_topic: target.Topic,
                        temperature_command_topic: target.Topic,
                        current_temperature_topic: act.Topic,
                        min_temp: target.min ? target.min : 0,
                        max_temp: target.max ? target.max : 40,
                        modes: ['auto', 'heat', 'off'],
                        precision: 0.5,
                        temp_step: 0.5,
                    };

                    // Assign Subscribed Topics
                    this.SubscribedTopics[target.Topic] = {};
                    this.SubscribedTopics[target.Topic].id = config.climateIds.target;
                    this.SubscribedTopics[target.Topic].val = await this.adapter.getState(config.climateIds.target).val;
                    this.SubscribedTopics[target.Topic].ts = Date.now() - this.MinTime;
                    this.SubscribedTopics[target.Topic].time = new Date(Date.now() - this.MinTime).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
                    this.SubscribedTopics[target.Topic].informations = {
                        applicationName: target.changeInfo.applicationName,
                        usedApplicationName: target.changeInfo.usedApplicationName,
                        deviceId: target.changeInfo.deviceId,
                        usedDeviceId: target.changeInfo.usedDeviceId,
                    };

                    this.SubscribedTopics[mode.Topic] = {};
                    this.SubscribedTopics[mode.Topic].id = config.climateIds.mode;
                    if (config.climateIds.mode.endsWith(this.EndingVirtualMode)) {
                        this.SubscribedTopics[mode.Topic].val = 'auto';
                        this.VitualIds[config.climateIds.mode] = this.SubscribedTopics[mode.Topic].val;
                    } else {
                        this.SubscribedTopics[mode.Topic].val = await this.adapter.getState(config.climateIds.mode).val;
                    }
                    this.SubscribedTopics[mode.Topic].ts = Date.now() - this.MinTime;
                    this.SubscribedTopics[mode.Topic].time = new Date(Date.now() - this.MinTime).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
                    this.SubscribedTopics[mode.Topic].informations = {
                        applicationName: mode.changeInfo.applicationName,
                        usedApplicationName: mode.changeInfo.usedApplicationName,
                        deviceId: mode.changeInfo.deviceId,
                        usedDeviceId: mode.changeInfo.usedDeviceId,
                    };

                    const DiscoveryObject = {
                        Topic: Topic,
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    };

                    // Assign published Topics
                    // Target
                    if (!this.PublishedIds[config.climateIds.target]) {
                        this.PublishedIds[config.climateIds.target] = { discovery: [] };
                    }
                    this.PublishedIds[config.climateIds.target].Topic = target.Topic;
                    this.PublishedIds[config.climateIds.target].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.target].ts = Date.now();
                    this.PublishedIds[config.climateIds.target].time = new Date(Date.now()).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
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
                    this.PublishedIds[config.climateIds.act].Topic = act.Topic;
                    this.PublishedIds[config.climateIds.act].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.act].ts = Date.now();
                    this.PublishedIds[config.climateIds.act].time = new Date(Date.now()).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
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
                    this.PublishedIds[config.climateIds.mode].Topic = mode.Topic;
                    this.PublishedIds[config.climateIds.mode].discovery.push({
                        topic: DiscoveryTopic,
                        payload: structuredClone(DiscoveryPayload),
                    });
                    this.PublishedIds[config.climateIds.mode].ts = Date.now();
                    this.PublishedIds[config.climateIds.mode].time = new Date(Date.now()).toLocaleString(
                        this.Timeoutput.Argument,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        this.Timeoutput.Format,
                    );
                    this.PublishedIds[config.climateIds.mode].informations = {
                        applicationName: mode.changeInfo.applicationName,
                        usedApplicationName: mode.changeInfo.usedApplicationName,
                        deviceId: mode.changeInfo.deviceId,
                        usedDeviceId: mode.changeInfo.usedDeviceId,
                    };

                    // Publishing the discover message
                    await this.publishDiscovery(Id, {
                        topic: DiscoveryObject?.topic,
                        payload: structuredClone(DiscoveryObject.payload),
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
                    await this.publishId(config.climateIds.target, this.SubscribedTopics[target.Topic].val);
                    await this.publishId(config.climateIds.act, await this.adapter.getState(config.climateIds.act).val);
                    await this.publishId(config.climateIds.mode, this.SubscribedTopics[mode.Topic].val);
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
                if (
                    !this.SubscribedTopics[this.PublishedIds[id].Topic] ||
                    this.SubscribedTopics[this.PublishedIds[id].Topic].val !== val ||
                    Date.now() - this.SubscribedTopics[this.PublishedIds[id].Topic].ts >= this.MinTime
                ) {
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
                    await this.bridgeMqttClient.publish(this.PublishedIds[id].Topic, val, {
                        retain: true,
                    });
                    await this.adapter.setState('info.publishedIds', JSON.stringify(this.PublishedIds), true);
                }
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
                            (id.endsWith(
                                `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.uplinkDecoded}.${config.State}`,
                            ) ||
                                config.State === '*')
                        ) {
                            Bridgestate.discover = !config.exclude;
                            Bridgestate.publish = config.publish;
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
                            this.PublishedIds[id].Topic = DiscoveryObject?.Topic;
                            this.PublishedIds[id].discovery.push({
                                topic: DiscoveryObject?.topic,
                                payload: structuredClone(DiscoveryObject?.payload),
                            });
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
                            this.SubscribedTopics[DiscoveryObject?.Topic] = {};
                            this.SubscribedTopics[DiscoveryObject?.Topic].id = id;
                            this.SubscribedTopics[DiscoveryObject?.Topic].ts = Date.now() - this.MinTime;
                            this.SubscribedTopics[DiscoveryObject?.Topic].time = new Date(
                                Date.now() - this.MinTime,
                            ).toLocaleString(
                                this.Timeoutput.Argument,
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                this.Timeoutput.Format,
                            );
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
                            (id.endsWith(
                                `${this.adapter.messagehandler.directoryhandler.reachableSubfolders.downlinkControl}.${config.State}`,
                            ) ||
                                config.State === '*')
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
                            this.PublishedIds[id].Topic = DiscoveryObject?.Topic;
                            this.PublishedIds[id].discovery.push({
                                topic: DiscoveryObject?.topic,
                                payload: structuredClone(DiscoveryObject?.payload),
                            });
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
                            this.SubscribedTopics[DiscoveryObject?.Topic] = {};
                            this.SubscribedTopics[DiscoveryObject?.Topic].id = id;
                            this.SubscribedTopics[DiscoveryObject?.Topic].ts = Date.now() - this.MinTime;
                            this.SubscribedTopics[DiscoveryObject?.Topic].time = new Date(
                                Date.now() - this.MinTime,
                            ).toLocaleString(
                                this.Timeoutput.Argument,
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-expect-error
                                this.Timeoutput.Format,
                            );
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
            const DeviceIdentifier = await this.getDeviceIdentifier(changeInfo, this.adapter.config.DeviceIdentifiers);
            const ReplacedDeviceIdentifier = await this.replaceGermanSpecific(DeviceIdentifier);
            const ReplacedWithoutSpace = await this.replaceSpace(ReplacedDeviceIdentifier);
            const ReplaceWithoutSlash = await this.replaceSlash(ReplacedWithoutSpace);
            const Topic = `${this.bridgeMqttClient.BridgePrefix}${ReplacedDeviceIdentifier}/${StateName}`;
            const EntityType = await this.getEntityType(options);
            const AdditionalAttributes = await this.getStateAttributes(options.common, EntityType);
            const DiscoveryTopic = `${this.BridgeDiscoveryPrefix[this.adapter.config.BridgeType]}${EntityType}/${ReplaceWithoutSlash}/${changeInfo.changedState}/config`;
            const DiscoveryPayload = {
                name: StateName,
                unique_id: `${ReplaceWithoutSlash}_${StateName}`.toLowerCase(),
                device: { identifiers: [ReplaceWithoutSlash.toLowerCase()], name: DeviceIdentifier },
            };
            // Add Topics
            if (options.Bridgestate.publish) {
                DiscoveryPayload.state_topic = Topic;
            }
            if (options.Bridgestate.subscribe) {
                DiscoveryPayload.command_topic = Topic;
            }

            // Assign Attibute to Payload
            for (const Attribute in AdditionalAttributes) {
                DiscoveryPayload[Attribute] = AdditionalAttributes[Attribute];
            }
            return { Topic: Topic, topic: DiscoveryTopic, payload: DiscoveryPayload };
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
            const unitLower = unit.toLowerCase();
            const type = common?.type || '';
            const attributes = {};

            if (entityType === 'sensor' || entityType === 'number') {
                if (role.includes('temperature')) {
                    attributes.device_class = 'temperature';
                    attributes.unit_of_measurement = unit || '°C';
                } else if (role.includes('humidity')) {
                    attributes.device_class = 'humidity';
                    attributes.unit_of_measurement = unit || '%';
                } else if (role.includes('illuminance') || role.includes('brightness')) {
                    attributes.device_class = 'illuminance';
                    attributes.unit_of_measurement = 'lx'; //unit || 'lx';
                } else if (role.includes('battery')) {
                    attributes.device_class = 'battery';
                    attributes.unit_of_measurement = unit || '%';
                } else if (role.includes('power') && !unit.includes('Wh')) {
                    // Sonoff mit value.power.consumtion und kWh ausnehmen
                    attributes.device_class = 'power';
                    attributes.unit_of_measurement = unit || 'W';
                } else if (unitLower === 'w' || unitLower === 'kw') {
                    attributes.device_class = 'power';
                    attributes.unit_of_measurement = unit;
                } else if (unitLower === 'v') {
                    attributes.device_class = 'voltage';
                    attributes.unit_of_measurement = unit;
                } else if (unitLower === 'a') {
                    attributes.device_class = 'current';
                    attributes.unit_of_measurement = unit;
                } else if (role.includes('energy') || (role.includes('power.consumption') && unit.includes('Wh'))) {
                    // Sonoff speziefisch, wegen falscher Rolle
                    attributes.device_class = 'energy';
                    /*   if(role.includes('consumed') || role.includes('produced')){
                        attributes.state_class = 'total';
                        attributes.last_reset = "1970-01-01T00:00:00+00:00";
                    }
                    else{*/
                    attributes.state_class = 'total_increasing';
                    //}
                    attributes.unit_of_measurement = unit || 'Wh';
                } else if (role.includes('weight')) {
                    // Sonoff mit value.power.consumtion und kWh ausnehmen
                    attributes.device_class = 'weight';
                    attributes.unit_of_measurement = unit || 'kg';
                } else if (unitLower === 'g' || unitLower === 'kg') {
                    attributes.device_class = 'weight';
                    attributes.unit_of_measurement = unit;
                } else {
                    if (unit === '°C') {
                        attributes.device_class = 'temperature';
                        attributes.unit_of_measurement = unit;
                    }
                    attributes.unit_of_measurement = unit || '';
                }

                // Korrektur der Unit
                if (attributes.unit_of_measurement === 'm^3') {
                    attributes.unit_of_measurement = 'm³';
                }

                // Min und Max zuweisen
                if (common.min) {
                    attributes.min = common.min;
                }
                if (common.max) {
                    attributes.max = common.max;
                }

                // Es muss eine Device Class zugewiesen sein und der State darf kein String sein.
                // String ist kein Measurement
                if (!attributes.state_class && type !== 'string') {
                    attributes.state_class = 'measurement';
                }
            }

            if (entityType === 'valve') {
                attributes.unit_of_measurement = unit || '%';
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
    replaceGermanSpecific(Inputstring) {
        const activeFunction = 'bridge.js - replaceGermanSpecific';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            return Inputstring.replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/Ä/g, 'Ae')
                .replace(/Ö/g, 'Oe')
                .replace(/Ü/g, 'Ue')
                .replace(/ß/g, 'ss');
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param Inputstring string to replace the vorbidden chars
     */
    replaceSpace(Inputstring) {
        const activeFunction = 'bridge.js - replaceSpace';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            return Inputstring.replace(/ /g, '_');
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * @param Inputstring string to replace the vorbidden chars
     */
    replaceSlash(Inputstring) {
        const activeFunction = 'bridge.js - replaceSlash';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            return Inputstring.replace(/\//g, '_');
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
