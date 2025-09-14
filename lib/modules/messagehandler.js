const { isDeepStrictEqual } = require('util');

const directorieshandlerClass = require('./directorieshandler');
const schedule = require('node-schedule');
const assignhandlerClass = require('./assignhandler');
const lodash = require('lodash');
/**
 * handles the message, wich comes from LoRaWAN devices
 */
class messagehandlerClass {
    /**
     * @param adapter adapterdata (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.directoryhandler = new directorieshandlerClass(this.adapter);

        /*********************************************************************
         * *************************** Roles  ********************************
         * ******************************************************************/

        // Assign definitions for special states
        this.downlinkRoles = {
            button: 'button',
            boolean: 'switch',
            json: 'json',
        };

        // Define present devices for general datainfo via jsonformat in infor folder
        this.idDeviceinformations = 'info.deviceinformations';
        this.deviceinformations = {};

        // Cronjobs for device offline checking (notification)
        this.cronJobs = {};
        this.cronJobIds = {
            checkTimestamp: 'checkTimestamp',
        };
        this.cronJosValues = {
            checkTimestamp: '0 * * * *',
        };
        // Create cronjob to check timestamps (for device offline notification)
        this.cronJobs[this.cronJobIds.checkTimestamp] = schedule.scheduleJob(
            this.cronJosValues.checkTimestamp,
            this.checkTimestamps.bind(this),
        );
        this.offlineiconString = 'icons/offline.png';
        this.offlinetimeMax = 25 * 60 * 60 * 1000; // Time in ms

        // Create instnce of assignhandler
        this.assignhandler = new assignhandlerClass(this.adapter);
    }

    /*********************************************************************
     * ************************ Check Timestamp **************************
     * ******************************************************************/

    /**
     * checks Timestamps for offline notification
     */
    async checkTimestamps() {
        const activeFunction = 'checkTimestamps';
        try {
            this.adapter.log.debug(`Function ${activeFunction} started.`);
            const adapterObjects = await this.adapter.getAdapterObjectsAsync();
            // Generate Infos of all defices and decoded folders
            for (const adapterObject of Object.values(adapterObjects)) {
                if (adapterObject._id.endsWith(`${this.directoryhandler.reachableSubfolders.uplinkRaw}.json`)) {
                    const uplinkState = await this.adapter.getStateAsync(adapterObject._id);
                    if (uplinkState) {
                        const difference = Date.now() - uplinkState.ts;
                        // Check for timedifference
                        if (difference >= this.offlinetimeMax) {
                            const deviceobjectId = adapterObject._id.substring(0, adapterObject._id.indexOf('.uplink'));
                            const deviceObject = await this.adapter.getObjectAsync(deviceobjectId);
                            // Check deviceObject and present iconpath
                            if (deviceObject) {
                                if (deviceObject.common.icon !== this.offlineiconString) {
                                    deviceObject.common.icon = this.offlineiconString;
                                    await this.adapter.setObjectAsync(deviceobjectId, deviceObject);
                                    // create changeinfo and register notification
                                    const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
                                    if (changeInfo) {
                                        const message = `${this.adapter.i18nTranslation['LoRaWAN device is offline']}.\n${this.adapter.i18nTranslation['Device']}: ${changeInfo.usedDeviceId}\n${this.adapter.i18nTranslation['Application']}: ${changeInfo.usedApplicationName}`;
                                        this.adapter.registerNotification('lorawan', 'LoRaWAN device offline', message);

                                        // Notification to bridge
                                        let notificationId = `${changeInfo.applicationId}.devices.${changeInfo.deviceEUI}${this.adapter.bridge.NotificationId}${this.adapter.bridge.OfflineId}`;
                                        await this.adapter.bridge?.publishNotification(
                                            notificationId,
                                            message,
                                            this.adapter.bridge?.Notificationlevel.deviceState,
                                            true,
                                        );
                                        notificationId = `${this.adapter.bridge.Words.notification}${this.adapter.bridge.GeneralId}`;
                                        await this.adapter.bridge?.publishNotification(
                                            notificationId,
                                            message,
                                            this.adapter.bridge?.Notificationlevel.deviceState,
                                            false,
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /**
     * Clear all schedules, if there are some
     */
    clearAllSchedules() {
        for (const cronJob in this.cronJobs) {
            schedule.cancelJob(this.cronJobs[cronJob]);
            delete this.cronJobs[cronJob];
        }
    }

    /*********************************************************************
     * *************************** General  ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message message of the LoRaWAN device
     */
    async handleMessage(topic, message) {
        // Select datahandling in case of origin
        switch (this.adapter.config.origin) {
            case this.adapter.origin.ttn:
                await this.handleTtnMessage(topic, message);
                break;
            case this.adapter.origin.chirpstack:
                await this.handleChirpstackMessage(topic, message);
        }
    }

    // Startup
    /**
     * generate Downlinks at startup and revome not used states
     */
    async generateDownlinksAndRemoveStatesAtStatup() {
        const activeFunction = 'generateDownlinkstatesAtStatup';
        try {
            const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
            for (const adapterObject of Object.values(adapterObjectsAtStart)) {
                if (adapterObject.type === 'device') {
                    await this.fillWithDownlinkConfig(this.adapter.removeNamespace(adapterObject._id), {
                        startup: true,
                    });
                    //await this.addDirectoriesToPresentDirectory(`${stateId}`); Not used yet (Maybe for thefuture with more folders)
                }
            }

            // remove not configed states
            for (const adapterObject of Object.values(adapterObjectsAtStart)) {
                if (adapterObject.type === 'state' && adapterObject._id.indexOf('downlink.control') !== -1) {
                    const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
                    const downlinkParameter = this.adapter.downlinkConfighandler.getDownlinkParameter(changeInfo, {
                        startupCheck: true,
                    });
                    if (!downlinkParameter || this.stateForbidden(changeInfo.changedState)) {
                        await this.adapter.delObjectAsync(this.adapter.removeNamespace(adapterObject._id));
                        this.adapter.log.debug(
                            `${activeFunction}: the state ${changeInfo.changedState} was deleted out of ${changeInfo.objectStartDirectory}`,
                        );
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /**
     * generate deviceinfos at startup
     */
    async generateDeviceinfosAtStartup() {
        const activeFunction = 'generateDeviceinfosAtStartup';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
            this.adapter.log.debug(`Adapter objects at start: ${JSON.stringify(adapterObjectsAtStart)}`);
            // Generate Infos of all devices and decoded folders
            const decodedData = {};
            for (const adapterObject of Object.values(adapterObjectsAtStart)) {
                this.adapter.log.debug(`Check ${adapterObject._id} for state.`);
                if (adapterObject.type === 'state') {
                    // To became just states no folders
                    if (
                        adapterObject._id.indexOf(`${this.directoryhandler.reachableSubfolders.uplinkDecoded}.`) !== -1
                    ) {
                        this.adapter.log.debug(`${adapterObject._id} will be added to deviceinformation.`);

                        const decodedState = await this.adapter.getStateAsync(adapterObject._id);
                        const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
                        if (!decodedData[changeInfo.deviceEUI]) {
                            decodedData[changeInfo.deviceEUI] = {};
                            decodedData[changeInfo.deviceEUI].decoded = {};
                            decodedData[changeInfo.deviceEUI].id = adapterObject._id;
                        }
                        const restId = adapterObject._id.substring(
                            adapterObject._id.indexOf(`${this.directoryhandler.reachableSubfolders.uplinkDecoded}.`) +
                                this.directoryhandler.reachableSubfolders.uplinkDecoded.length +
                                1,
                            adapterObject._id.length,
                        );
                        //Check for Structure or State
                        const index = restId.indexOf('.');
                        if (index !== -1) {
                            // => Structure
                            const generatedStructure = this.getIdStructure(restId, decodedState.val);
                            // merge the structures
                            decodedData[changeInfo.deviceEUI].decoded = lodash.merge(
                                decodedData[changeInfo.deviceEUI].decoded,
                                generatedStructure,
                            );
                        } else {
                            // direct state in decoded path
                            decodedData[changeInfo.deviceEUI].decoded[changeInfo.changedState] = decodedState.val;
                        }
                    }
                    if (
                        adapterObject._id.endsWith(`rx_metadata.0.time`) ||
                        adapterObject._id.endsWith(`remaining.time`)
                    ) {
                        const timeData = await this.adapter.getStateAsync(adapterObject._id);
                        const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
                        if (!decodedData[changeInfo.deviceEUI]) {
                            decodedData[changeInfo.deviceEUI] = {};
                            decodedData[changeInfo.deviceEUI].decoded = {};
                            decodedData[changeInfo.deviceEUI].id = adapterObject._id;
                        }
                        decodedData[changeInfo.deviceEUI].time = timeData.val;
                    }
                }
            }

            // Check all devEUI and convert
            for (const devEUI in decodedData) {
                // Check origin
                switch (this.adapter.config.origin) {
                    case this.adapter.origin.ttn:
                        decodedData[devEUI].uplink_message = {};
                        decodedData[devEUI].uplink_message.decoded_payload = decodedData[devEUI].decoded;
                        decodedData[devEUI].uplink_message.rx_metadata = [];
                        decodedData[devEUI].uplink_message.rx_metadata[0] = {};
                        decodedData[devEUI].uplink_message.rx_metadata[0].time = decodedData[devEUI].time;
                        break;
                    case this.adapter.origin.chirpstack:
                        decodedData[devEUI].object = decodedData[devEUI].decoded;
                        decodedData[devEUI].rxInfo = [];
                        decodedData[devEUI].rxInfo[0] = {};
                        break;
                }
                this.assignDeviceInformation(decodedData[devEUI].id, decodedData[devEUI]);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    // get structure out of string (id)
    /**
     * @param id string toconvert to structure
     * @param val value for last element
     */
    getIdStructure(id, val) {
        let idStructure = {};
        const index = id.indexOf('.');
        if (index !== -1) {
            idStructure[id.substring(0, index)] = this.getIdStructure(id.substring(index + 1, id.length), val);
        } else {
            idStructure[id] = val;
        }
        return idStructure;
    }
    // Assign base information to presentDevices
    /**
     * @param id id of the state
     * @param message message of the LoRaWAN device
     */
    async assignDeviceInformation(id, message) {
        const activeFunction = 'assignDeviceInformation';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            const changeInfo = await this.adapter.getChangeInfo(id);
            // Create Attribute for application id
            if (!this.deviceinformations[changeInfo.deviceEUI]) {
                this.deviceinformations[changeInfo.deviceEUI] = {};
                this.deviceinformations[changeInfo.deviceEUI].uplink = {};
                this.deviceinformations[changeInfo.deviceEUI].uplink.decoded = {};
            }
            this.deviceinformations[changeInfo.deviceEUI].applicationId = changeInfo.applicationId;
            this.deviceinformations[changeInfo.deviceEUI].applicationName = changeInfo.applicationName;
            this.deviceinformations[changeInfo.deviceEUI].usedApplicationName = changeInfo.usedApplicationName;
            this.deviceinformations[changeInfo.deviceEUI].deviceId = changeInfo.deviceId;
            this.deviceinformations[changeInfo.deviceEUI].usedDeviceId = changeInfo.usedDeviceId;

            // Check origin
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn:
                    if (message.uplink_message && message.uplink_message.rx_metadata[0]) {
                        for (const attr in message.uplink_message.decoded_payload) {
                            if (typeof message.uplink_message.decoded_payload[attr] === 'object') {
                                // merge the structures
                                this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr] = lodash.merge(
                                    this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr],
                                    message.uplink_message.decoded_payload[attr],
                                );
                            } else {
                                this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr] =
                                    message.uplink_message.decoded_payload[attr];
                            }
                        }

                        // Generate Timestamp
                        if (!message.uplink_message.rx_metadata[0].time) {
                            message.uplink_message.rx_metadata[0].time = Date.now();
                        }
                        const Timestamp =
                            typeof message.uplink_message.rx_metadata[0].time === 'number'
                                ? message.uplink_message.rx_metadata[0].time
                                : new Date(message.uplink_message.rx_metadata[0].time).valueOf();

                        // time
                        this.deviceinformations[changeInfo.deviceEUI].uplink.time =
                            this.generateTimestringFromTimestamp(Timestamp);

                        // timestamp
                        this.deviceinformations[changeInfo.deviceEUI].uplink.timestamp = Timestamp;
                    }
                    break;
                case this.adapter.origin.chirpstack:
                    if (message.object) {
                        for (const attr in message.object) {
                            // if there is allready an attribute check for object and assign all attributs of the object
                            if (this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr]) {
                                if (typeof message.object[attr] === 'object') {
                                    // merge the structures
                                    this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr] = lodash.merge(
                                        this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr],
                                        message.object[attr],
                                    );
                                } else {
                                    this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr] =
                                        message.object[attr];
                                }
                            } else {
                                this.deviceinformations[changeInfo.deviceEUI].uplink.decoded[attr] =
                                    message.object[attr];
                            }
                        }
                        // Generate Timestamp
                        if (!message.time) {
                            message.time = Date.now();
                        }
                        const Timestamp =
                            typeof message.time === 'number' ? message.time : new Date(message.time).valueOf();

                        // time
                        this.deviceinformations[changeInfo.deviceEUI].uplink.time =
                            this.generateTimestringFromTimestamp(Timestamp);

                        // timestamp
                        this.deviceinformations[changeInfo.deviceEUI].uplink.timestamp = Timestamp;
                    }
                    break;
            }
            await this.adapter.setStateAsync(this.idDeviceinformations, JSON.stringify(this.deviceinformations), true);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    // Generate Timestring for deviceInformations
    /**
     * @param Timestamp Timestamp, from wich the Timestring has to generated
     */
    generateTimestringFromTimestamp(Timestamp) {
        return `${new Date(Timestamp).toDateString()} ${new Date(Timestamp).toTimeString().substring(0, 8)}`;
    }

    //Add directories at startup (so they are present before next upload)
    /**
     * @param startDirectory directorypath (id)
     */
    async addDirectoriesToPresentDirectory(startDirectory) {
        await this.directoryhandler.generateRekursivObjects(
            this.directoryhandler.directories.application.devices.deviceEUI.downlink.nextSend,
            `${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkNextSend}`,
            '',
            '',
            {},
        );
        await this.directoryhandler.generateRekursivObjects(
            this.directoryhandler.directories.application.devices.deviceEUI.downlink.lastSend,
            `${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkLastSend}`,
            '',
            '',
            {},
        );
    }

    /**
     * @param deviceStartdirectory start directory (id) of the device
     * @param options options to do specific things (eg. handle in message or at startup)
     */
    async fillWithDownlinkConfig(deviceStartdirectory, options) {
        const activeFunction = 'fillWithDownlinkConfig';
        try {
            this.adapter.log.debug(`Function ${activeFunction} started.`);
            const changeInfo = await this.adapter.getChangeInfo(`${deviceStartdirectory}.fillDownlinkFolder`, {
                withBestMatch: true,
            });
            const foundLength = {};
            //iterate downlinkDevice
            for (const downlinkDevice in this.adapter.downlinkConfighandler.activeDownlinkConfigs) {
                // query for match deviceType
                if (
                    downlinkDevice === this.adapter.downlinkConfighandler.internalDevices.baseDevice ||
                    changeInfo.deviceType.indexOf(downlinkDevice) === 0
                ) {
                    // iterate downlinkConfig
                    for (const downlinkParameter of Object.values(
                        this.adapter.downlinkConfighandler.activeDownlinkConfigs[downlinkDevice].downlinkState,
                    )) {
                        this.adapter.log.silly(
                            `the downlinkparameter ${JSON.stringify(downlinkParameter)}, will be checked.`,
                        );
                        // check for forbidden states
                        if (this.stateForbidden(downlinkParameter.name)) {
                            continue;
                        }
                        // Create found length if not defined
                        if (!foundLength[downlinkParameter.name]) {
                            foundLength[downlinkParameter.name] = 0;
                        }
                        // check found length
                        if (downlinkDevice.length > foundLength[downlinkParameter.name]) {
                            const common = {
                                type: downlinkParameter.type,
                            };

                            // Assign role (if present)
                            common.role = this.downlinkRoles[common.type] ? this.downlinkRoles[common.type] : 'level';

                            // Reassign type
                            if (common.type === 'button') {
                                common.type = 'boolean';
                            } else if (common.type === 'ascii') {
                                common.type = 'string';
                            }
                            // declare def / min / max
                            common.min = undefined;
                            common.def = 0; //just numbers
                            common.max = undefined;
                            if (common.type === 'number') {
                                if (downlinkParameter.limitMin) {
                                    common.min = downlinkParameter.limitMinValue;
                                    if (common.min > common.def) {
                                        common.def = common.min;
                                    }
                                } else if (common.type === 'number') {
                                    common.min = -1000000;
                                }
                                if (downlinkParameter.limitMax) {
                                    common.max = downlinkParameter.limitMaxValue;
                                    if (common.max < common.def) {
                                        common.def = common.max;
                                    }
                                } else if (common.type === 'number') {
                                    common.max = 1000000;
                                }
                            }
                            common.name = '';
                            common.read = common.role !== 'button';
                            common.write = true;
                            common.unit = downlinkParameter.unit ? downlinkParameter.unit : '';
                            common.def = common.type === 'boolean' ? false : common.type === 'number' ? common.def : '';
                            // common set into variable to read later (for options)
                            const stateId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkControl}.${downlinkParameter.name}`;

                            // write custom values into state (if active)
                            // Check for object does not exist
                            // Check custom control json
                            if (
                                this.adapter.config.customDecodedJsonActive &&
                                this.adapter.config.customControlJsonActive
                            ) {
                                if (typeof this.directoryhandler.customObject === 'object') {
                                    common.custom = this.directoryhandler.customObject;
                                }
                            }
                            /* Remove at 16.06.2025 => Solved with addition role switch.setting
                            // Correct role switch in case of send with uplink and collect (dont set role switch in this case)
                            if (common.role === 'switch') {
                                if (
                                    this.adapter.downlinkConfighandler?.activeDownlinkConfigs[
                                        changeInfo.bestMatchForDeviceType
                                    ].sendWithUplink === 'enabled & collect'
                                ) {
                                    common.role = 'state';
                                }
                            }
                            */
                            // Check for assign (new implemented function)
                            if (this.assignhandler.assign[downlinkParameter.name] && !options?.dontAssign) {
                                this.adapter.log.debug(
                                    `the state with the id ${stateId} will be assigned by internal assign function`,
                                );
                                this.assignhandler.executeAssign(
                                    stateId,
                                    false,
                                    this.assignhandler.assign[downlinkParameter.name],
                                    { common: common },
                                );
                            }

                            // Query for base device and parameter push or replace
                            if (downlinkDevice === this.adapter.downlinkConfighandler.internalDevices.baseDevice) {
                                if (downlinkParameter.name === 'push' || downlinkParameter.name === 'replace') {
                                    const downlink = this.adapter.downlinkConfighandler.getDownlink(
                                        { port: 1, priority: 'NORMAL', confirmed: false },
                                        '0000',
                                        changeInfo,
                                    );
                                    common.def = JSON.stringify(downlink);
                                }
                            }
                            await this.adapter.extendObjectAsync(stateId, {
                                type: 'state',
                                common: common,
                                native: {},
                            });
                            if (downlinkDevice !== this.adapter.downlinkConfighandler.internalDevices.baseDevice) {
                                foundLength[downlinkParameter.name] = downlinkDevice.length;
                            }
                            // Add Bridged Funktion (MQTT auto discovery) only in Message
                            if (!options?.startup) {
                                await this.adapter.bridge?.work(stateId, undefined, { common: common });
                            }

                            //check for right type of data (after a possible change)
                            if (!options || !options.inMessage) {
                                const state = await this.adapter.getStateAsync(stateId);
                                if (typeof state.val !== typeof common.def) {
                                    this.adapter.log.silly(
                                        `the defaultvale for state ${stateId} will set to ${common.def}`,
                                    );
                                    await this.adapter.setStateAsync(stateId, common.def, true);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param stateName checks the statename is forbidden (eg. replace in chirpstack)
     */
    stateForbidden(stateName) {
        switch (this.adapter.config.origin) {
            case this.adapter.origin.ttn:
                return false;
            case this.adapter.origin.chirpstack:
                return stateName === 'replace';
        }
    }

    /**
     * sets the customobject in the specific folders at startup
     */
    async setCustomObjectAtStartup() {
        const activeFunction = 'setCustomObjectAtStartup';
        try {
            if (this.adapter.config.customDecodedJsonActive) {
                //Check configued custom JSON is parsed an Object
                this.directoryhandler.customObject = JSON.parse(this.adapter.config.customJson);

                // Get all ids in adapterfolder
                const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
                // Generate Infos of all devices and decoded folders
                for (const adapterObject of Object.values(adapterObjectsAtStart)) {
                    if (
                        adapterObject._id.indexOf(`${this.directoryhandler.reachableSubfolders.uplinkDecoded}.`) !==
                            -1 ||
                        (this.adapter.config.customControlJsonActive &&
                            adapterObject._id.indexOf(
                                `${this.directoryhandler.reachableSubfolders.downlinkControl}.`,
                            ) !== -1) ||
                        (this.adapter.config.customConfigurationJsonActive &&
                            adapterObject._id.indexOf(`${this.directoryhandler.reachableSubfolders.configuration}.`) !==
                                -1)
                    ) {
                        if (adapterObject.type === 'state') {
                            //Check for custom
                            if (!adapterObject.common.custom) {
                                adapterObject.common.custom = {};
                            }
                            const customBefore = structuredClone(adapterObject.common.custom);
                            for (const attr in this.directoryhandler.customObject) {
                                adapterObject.common.custom[attr] = this.directoryhandler.customObject[attr];
                            }
                            if (!isDeepStrictEqual(adapterObject.common.custom, customBefore)) {
                                await this.adapter.setObjectAsync(adapterObject._id, adapterObject);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /*****************************************************************************************************************
     * ***************************************************************************************************************
     * **************************************************************************************************************/

    /*********************************************************************
     * ***************************** TTN  ********************************
     * ******************************************************************/

    /*********************************************************************
     * **************************** Message ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message message of the LoRaWAN device
     */
    async handleTtnMessage(topic, message) {
        const activeFunction = 'handleTtnMessage';

        try {
            const messageType = topic.substring(topic.lastIndexOf('/') + 1, topic.length);
            this.adapter.log.silly(`the messagetype ${messageType} was determined`);
            // generate startdirectory of device
            const deviceStartdirectory = this.directoryhandler.getDeviceStartDirectory(topic, message);
            this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);

            /*********************************************************************
             * ****************** Check device startdirectory ********************
             * ******************************************************************/

            if (
                messageType !== 'up' &&
                messageType !== 'join' &&
                !(await this.adapter.objectExists(`${deviceStartdirectory}`))
            ) {
                this.adapter.log.debug(
                    `There was a message with the topic ${topic}, but the object ${deviceStartdirectory} does not exists yet.`,
                );
                return;
            }

            /*********************************************************************
             * ************************* Infodata ********************************
             * ******************************************************************/

            /*********************************************************************
             * ********************** Uplink data ********************************
             * ******************************************************************/

            // check for uplink message
            if (messageType === 'up') {
                /*********************************************************************
                 * ************************ Main directories *************************
                 * ******************************************************************/

                await this.directoryhandler.generateRekursivObjects(
                    this.directoryhandler.directories,
                    '',
                    topic,
                    message,
                    {},
                );

                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                this.adapter.log.silly(`write rawdata`);
                let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
                // write json
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last received message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);

                /*********************************************************************
                 * ********************** Rawdata (Base64) ***************************
                 * ******************************************************************/
                // check for frm payload
                if (message.uplink_message.frm_payload) {
                    // wite base64 data
                    this.adapter.log.silly(`write base64`);
                    await this.adapter.extendObjectAsync(`${startId}.base64`, {
                        type: 'state',
                        common: {
                            name: 'last received data as base64',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const writedata = message.uplink_message.frm_payload;
                    await this.adapter.setStateAsync(`${startId}.base64`, writedata, true);

                    // write base64 data in hex data
                    this.adapter.log.silly(`write hex`);
                    await this.adapter.extendObjectAsync(`${startId}.hex`, {
                        type: 'state',
                        common: {
                            name: 'last received data as hex',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const hexdata = Buffer.from(message.uplink_message.frm_payload, 'base64')
                        .toString('hex')
                        .toUpperCase();
                    await this.adapter.setStateAsync(`${startId}.hex`, hexdata, true);

                    // write base64 data in string data
                    this.adapter.log.silly(`write string`);
                    await this.adapter.extendObjectAsync(`${startId}.string`, {
                        type: 'state',
                        common: {
                            name: 'last received data as string',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const stringdata = Buffer.from(message.uplink_message.frm_payload, 'base64').toString();
                    await this.adapter.setStateAsync(`${startId}.string`, stringdata, true);
                }

                /*********************************************************************
                 * ********************** decoded payload ****************************
                 * ******************************************************************/

                startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
                this.adapter.log.silly(`write decoded payload`);
                await this.directoryhandler.generateRekursivObjects(
                    message.uplink_message.decoded_payload,
                    startId,
                    topic,
                    message,
                    {},
                );

                /*********************************************************************
                 * ************************* remaining *******************************
                 * ******************************************************************/

                startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
                this.adapter.log.silly(`write remaining uplink data`);

                await this.directoryhandler.generateRekursivObjects(message.uplink_message, startId, topic, message, {
                    ignoredElementNames: { decoded_payload: {}, frm_payload: {} },
                });

                /*********************************************************************
                 * ******************* Check downlink at uplink **********************
                 * ******************************************************************/

                await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);

                /*********************************************************************
                 * ******************* assign deviceinformations **********************
                 * ******************************************************************/

                await this.assignDeviceInformation(deviceStartdirectory, message);

                /*********************************************************************
                 * ************************* Downlink data ***************************
                 * ******************************************************************/

                // check for uplink message
            } else if (messageType === 'queued' || messageType === 'sent') {
                // Check wich downlink was recieved
                const downlinkType = `downlink_${messageType}`;
                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
                // write json
                this.adapter.log.silly(`write rawdata`);
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last send message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);

                /*********************************************************************
                 * ********************** Rawdata (Base64) ***************************
                 * ******************************************************************/

                // check for frm payload
                this.adapter.log.silly(`write base64`);
                if (message[downlinkType].frm_payload) {
                    // wite base64 data
                    await this.adapter.extendObjectAsync(`${startId}.base64`, {
                        type: 'state',
                        common: {
                            name: 'last send data as base64',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const writedata = message[downlinkType].frm_payload;
                    await this.adapter.setStateAsync(`${startId}.base64`, writedata, true);

                    // write base64 data in hex data
                    this.adapter.log.silly(`write hex`);
                    await this.adapter.extendObjectAsync(`${startId}.hex`, {
                        type: 'state',
                        common: {
                            name: 'last send data as hex',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const hexdata = Buffer.from(message[downlinkType].frm_payload, 'base64')
                        .toString('hex')
                        .toUpperCase();
                    await this.adapter.setStateAsync(`${startId}.hex`, hexdata, true);

                    // write base64 data in string data
                    this.adapter.log.silly(`write string`);
                    await this.adapter.extendObjectAsync(`${startId}.string`, {
                        type: 'state',
                        common: {
                            name: 'last send data as string',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const stringdata = Buffer.from(message[downlinkType].frm_payload, 'base64').toString();
                    await this.adapter.setStateAsync(`${startId}.string`, stringdata, true);
                }

                /*********************************************************************
                 * ************************* remaining *******************************
                 * ******************************************************************/

                startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRemaining}`;
                this.adapter.log.silly(`write remaining downlink data`);
                await this.directoryhandler.generateRekursivObjects(message[downlinkType], startId, topic, message, {
                    ignoredElementNames: { frm_payload: {} },
                });

                /*********************************************************************
                 * ************************ Main directories *************************
                 * ******************************************************************/
            } else if (messageType === 'join') {
                // check for join message
                await this.directoryhandler.generateRekursivObjects(
                    this.directoryhandler.directories,
                    '',
                    topic,
                    message,
                    {},
                );

                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                this.adapter.log.silly(`write rawdata`);
                const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.joinRaw}`;
                // write json
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last recieved message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);
                const changeInfo = await this.adapter.getChangeInfo(startId);
                this.adapter.log.info(
                    `the device ${changeInfo.deviceEUI} (${changeInfo.deviceId}) joined network at application ${changeInfo.applicationId} (${changeInfo.applicationName})`,
                );
            } else {
                // Other messagetypes
                this.adapter.log.debug(`the messagetype: ${messageType}, is not implemented yet`);
            }

            /*********************************************************************
             * ********************** downlinkConfigs ****************************
             * ******************************************************************/
            this.adapter.log.silly(`check configed downlinks`);
            await this.fillWithDownlinkConfig(deviceStartdirectory, { inMessage: true });
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /*********************************************************************
     * ************************** Chirpstack  ****************************
     * ******************************************************************/

    /*********************************************************************
     * **************************** Message ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message message of the LoRaWAN device
     */
    async handleChirpstackMessage(topic, message) {
        const activeFunction = 'handleChirpstackMessage';

        try {
            const messageType = topic.substring(topic.lastIndexOf('/') + 1, topic.length);
            this.adapter.log.silly(`the messagetype ${messageType} was determined`);
            // generate startdirectory of device
            const deviceStartdirectory = this.directoryhandler.getDeviceStartDirectory(topic, message);
            this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);

            /*********************************************************************
             * ****************** Check device startdirectory ********************
             * ******************************************************************/

            if (
                messageType !== 'up' &&
                messageType !== 'join' &&
                !(await this.adapter.objectExists(`${deviceStartdirectory}`))
            ) {
                this.adapter.log.debug(
                    `There was a message with the topic ${topic}, but the object ${deviceStartdirectory} does not exists yet.`,
                );
                return;
            }

            /*********************************************************************
             * ************************* Infodata ********************************
             * ******************************************************************/

            /*********************************************************************
             * ********************** Uplink data ********************************
             * ******************************************************************/

            // check for uplink message
            if (messageType === 'up') {
                /*********************************************************************
                 * ************************ Main directories *************************
                 * ******************************************************************/

                await this.directoryhandler.generateRekursivObjects(
                    this.directoryhandler.directories,
                    '',
                    topic,
                    message,
                    {},
                );

                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
                // write json
                this.adapter.log.silly(`write rawdata`);
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last received message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);

                /*********************************************************************
                 * ********************** Rawdata (Base64) ***************************
                 * ******************************************************************/
                // check for data
                if (message.data) {
                    // wite base64 data
                    this.adapter.log.silly(`write base64`);
                    await this.adapter.extendObjectAsync(`${startId}.base64`, {
                        type: 'state',
                        common: {
                            name: 'last received data as base64',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const writedata = message.data;
                    await this.adapter.setStateAsync(`${startId}.base64`, writedata, true);

                    // write base64 data in hex data
                    this.adapter.log.silly(`write hex`);
                    await this.adapter.extendObjectAsync(`${startId}.hex`, {
                        type: 'state',
                        common: {
                            name: 'last received data as hex',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const hexdata = Buffer.from(message.data, 'base64').toString('hex').toUpperCase();
                    await this.adapter.setStateAsync(`${startId}.hex`, hexdata, true);

                    // write base64 data in string data
                    this.adapter.log.silly(`write string`);
                    await this.adapter.extendObjectAsync(`${startId}.string`, {
                        type: 'state',
                        common: {
                            name: 'last received data as string',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const stringdata = Buffer.from(message.data, 'base64').toString();
                    await this.adapter.setStateAsync(`${startId}.string`, stringdata, true);
                }

                /*********************************************************************
                 * ****************** decoded payload (Object) ***********************
                 * ******************************************************************/
                startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
                this.adapter.log.silly(`write decoded payload (Object)`);
                await this.directoryhandler.generateRekursivObjects(message.object, startId, topic, message, {});

                /*********************************************************************
                 * ************************* remaining *******************************
                 * ******************************************************************/

                startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
                this.adapter.log.silly(`write remaining uplink data`);
                await this.directoryhandler.generateRekursivObjects(message, startId, topic, message, {
                    ignoredElementNames: { deduplicationId: {}, deviceInfo: {}, data: {}, object: {} },
                });

                /*********************************************************************
                 * ******************* Check downlink at uplink **********************
                 * ******************************************************************/

                await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);

                /*********************************************************************
                 * ******************* assign deviceinformations **********************
                 * ******************************************************************/

                await this.assignDeviceInformation(deviceStartdirectory, message);

                /*********************************************************************
                 * ************************* Downlink data ***************************
                 * ******************************************************************/
            } else if (messageType === 'down') {
                // check for uplink message
                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
                // write json
                this.adapter.log.silly(`write rawdata`);
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last send message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);

                /*********************************************************************
                 * ********************** Rawdata (Base64) ***************************
                 * ******************************************************************/

                // check for data
                if (message.data) {
                    // wite base64 data
                    this.adapter.log.silly(`write base64`);
                    await this.adapter.extendObjectAsync(`${startId}.base64`, {
                        type: 'state',
                        common: {
                            name: 'last send data as base64',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const writedata = message.data;
                    await this.adapter.setStateAsync(`${startId}.base64`, writedata, true);

                    // write base64 data in hex data
                    this.adapter.log.silly(`write hex`);
                    await this.adapter.extendObjectAsync(`${startId}.hex`, {
                        type: 'state',
                        common: {
                            name: 'last send data as hex',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const hexdata = Buffer.from(message.data, 'base64').toString('hex').toUpperCase();
                    await this.adapter.setStateAsync(`${startId}.hex`, hexdata, true);

                    // write base64 data in string data
                    this.adapter.log.silly(`write string`);
                    await this.adapter.extendObjectAsync(`${startId}.string`, {
                        type: 'state',
                        common: {
                            name: 'last send data as string',
                            type: 'string',
                            role: 'state',
                            read: true,
                            write: false,
                        },
                        native: {},
                    });
                    const stringdata = Buffer.from(message.data, 'base64').toString();
                    await this.adapter.setStateAsync(`${startId}.string`, stringdata, true);
                }

                /*********************************************************************
                 * ************************* remaining *******************************
                 * ******************************************************************/
            } else if (messageType === 'join') {
                // check for uplink message
                /*********************************************************************
                 * ************************ Main directories *************************
                 * ******************************************************************/

                await this.directoryhandler.generateRekursivObjects(
                    this.directoryhandler.directories,
                    '',
                    topic,
                    message,
                    {},
                );

                /*********************************************************************
                 * ************************ Rawdata json *****************************
                 * ******************************************************************/

                const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.joinRaw}`;
                // write json
                this.adapter.log.silly(`write rawdata`);
                await this.adapter.extendObjectAsync(`${startId}.json`, {
                    type: 'state',
                    common: {
                        name: 'last received message',
                        type: 'json',
                        role: 'json',
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.adapter.setStateAsync(`${startId}.json`, JSON.stringify(message), true);
                const changeInfo = await this.adapter.getChangeInfo(startId);
                this.adapter.log.info(
                    `the device ${changeInfo.deviceEUI} (${changeInfo.deviceId}) joined network at application ${changeInfo.applicationId} (${changeInfo.applicationName})`,
                );
            } else {
                // Other messagetypes
                this.adapter.log.debug(`the messagetype: ${messageType}, is not implemented yet`);
            }

            /*********************************************************************
             * ********************** downlinkConfigs ****************************
             * ******************************************************************/
            this.adapter.log.silly(`check configed downlinks`);
            await this.fillWithDownlinkConfig(deviceStartdirectory, { inMessage: true });
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /*********************************************************************
     * *******************************************************************
     * ******************************************************************/
}

module.exports = messagehandlerClass;
