const assignhandlerClass = require('./assignhandler');
const { isDeepStrictEqual } = require('util');
/**
 * this class handles the rekursive directories
 */
class directorieshandlerClass {
    /**
     * @param adapter adapter data (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;

        // used dataentries in directory structurt
        this.searchableAttributeNames = {
            applicationId: 'applicationId',
            applicationName: 'applicationName',
            deviceEUI: 'deviceEui',
            deviceId: 'deviceId',
        };

        this.reachableSubfolders = {
            configuration: 'configuration',
            uplink: 'uplink',
            uplinkDecoded: 'uplink.decoded',
            uplinkRaw: 'uplink.raw',
            uplinkRemaining: 'uplink.remaining',
            downlink: 'downlink',
            downlinkRaw: 'downlink.raw',
            downlinkControl: 'downlink.control',
            downlinkRemaining: 'downlink.remaining',
            downlinkNextSend: 'downlink.nextSend',
            downlinkLastSend: 'downlink.lastSend',
            join: 'join',
            joinRaw: 'join.raw',
        };

        this.icons = {
            wifi: 'wifi',
        };

        this.customObject = {};

        this.HABridge = {
            Dummy: {
                applicationId: '942ea85a-1ea8-4dff-8900-8141897f95b9',
                applicationName: 'Fenster',
                usedApplicationName: 'FensterStaße',
                deviceEUI: 'a84041a52a598cc5',
                deviceId: 'Balkon',
                usedDeviceId: 'BalkonLinks',
            },
        };

        /*********************************************************************
         * ************** Definition Assigns (externel Module) ***************
         * ******************************************************************/

        this.assignhandler = new assignhandlerClass(this.adapter);

        /*********************************************************************
         * ********************* Definition of Assigns  **********************
         * ******************************************************************/

        // Definition of Assign timestamps
        this.timestringToDate = (value, common) => {
            common.role = 'date';
            if (typeof value === 'string') {
                common.type = 'number';
                return new Date(value).valueOf();
            }
            return value;
        };

        // Assign definitions for special states
        this.assigns = {
            time: this.timestringToDate,
            gwTime: this.timestringToDate,
            nsTime: this.timestringToDate,
            received_at: this.timestringToDate,
        };

        /*********************************************************************
         * ************************** writecommands  *************************
         * ******************************************************************/

        //general function for writecommands
        this.executeWritecommand = async (writecommand, elementName, sourceId, value) => {
            const activeFunction = 'executeWritecommand';
            this.adapter.log.silly(`Function ${activeFunction} started.`);
            try {
                // Check, if there is a writetrigger and the stateval is not euqal its releaseVal(still present)
                if (writecommand.releaseValue !== value) {
                    const baseInfo = this.adapter.getBaseDeviceInfo(sourceId);
                    const subfolder = sourceId.slice(
                        baseInfo.objectStartDirectory.length + 1,
                        sourceId.length - baseInfo.changedState.length - 1,
                    );
                    if (!writecommand.approvedFolders || writecommand.approvedFolders[subfolder]) {
                        const destinationId = `${baseInfo.objectStartDirectory}.${writecommand.destination}`;
                        const destinationState = await this.adapter.getStateAsync(destinationId);
                        if (destinationState?.val === writecommand.releaseValue) {
                            this.adapter.log.debug(
                                `writecommand ${elementName} recogniced. value ${value} will be written into ${writecommand.destination}`,
                            );
                            await this.adapter.setStateAsync(destinationId, value);
                        }
                    }
                }
            } catch (error) {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        };

        // Define settings for writecommand devicetype
        this.writeCommandDeviceType = async (elementName, sourceId, value) => {
            const activeFunction = 'writeCommandDeviceType';
            this.adapter.log.silly(`Function ${activeFunction} started.`);
            try {
                const writecommand = {
                    destination: 'configuration.devicetype',
                    releaseValue: '',
                    approvedFolders: { 'uplink.decoded': true, 'uplink.remaining.version_ids': true },
                };
                return await this.executeWritecommand(writecommand, elementName, sourceId, value);
            } catch (error) {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        };

        this.writeCommand = {
            Devicetype: this.writeCommandDeviceType,
            devicetype: this.writeCommandDeviceType,
            Device: this.writeCommandDeviceType,
            device: this.writeCommandDeviceType,
            Hardware_mode: this.writeCommandDeviceType,
            Hardware_Mode: this.writeCommandDeviceType,
            model_id: this.writeCommandDeviceType,
        };

        // declare the directory structre
        this.directories = {
            application: {
                objectId: (topic, message) => {
                    return this.getAttributValue(topic, message, this.searchableAttributeNames.applicationId);
                },
                objectCommonFromNative: { name: 'applicationName' },
                objectNative: (topic, message) => {
                    return {
                        applicationName: this.getAttributValue(
                            topic,
                            message,
                            this.searchableAttributeNames.applicationName,
                        ),
                    };
                },
                devices: {
                    deviceEUI: {
                        objectId: (topic, message) => {
                            return this.getAttributValue(topic, message, this.searchableAttributeNames.deviceEUI);
                        },
                        objectCommonFromNative: { name: 'deviceId' },
                        objectNative: (topic, message) => {
                            return {
                                applicationName: this.getAttributValue(
                                    topic,
                                    message,
                                    this.searchableAttributeNames.applicationName,
                                ),
                                deviceId: this.getAttributValue(topic, message, this.searchableAttributeNames.deviceId),
                            };
                        },
                        objectIconPath: (topic, message) => {
                            return this.getIconPath(topic, message, this.icons.wifi);
                        },
                        objectType: 'device',
                        configuration: {
                            objectType: 'channel',
                            devicetype: {
                                isState: true,
                                stateCommonType: 'string',
                                stateCommonWrite: true,
                                stateCommonRole: 'text',
                            },
                        },
                        uplink: {
                            raw: {},
                            decoded: {
                                objectType: 'channel',
                            },
                            remaining: {},
                        },
                        downlink: {
                            raw: {},
                            control: {
                                objectType: 'channel',
                            },
                            nextSend: {
                                hex: {
                                    isState: true,
                                    stateCommonDef: '0',
                                    stateCommonType: 'string',
                                },
                                push: {
                                    isState: true,
                                    stateCommonType: 'boolean',
                                    stateCommonWrite: true,
                                    stateCommonRole: 'button',
                                },
                            },
                            lastSend: {
                                hex: {
                                    isState: true,
                                    stateCommonDef: '0',
                                    stateCommonType: 'string',
                                },
                            },
                            remaining: {},
                        },
                        join: {
                            raw: {},
                        },
                    },
                },
            },
        };
        this.ignoredElementNames = {
            objectId: 'objectId',
            objectCommonName: 'objectCommonName',
            objectCommonFromNative: 'objectCommonFromNative',
            objectType: 'objectType',
            objectNative: 'objectNative',
            objectIconPath: 'objectIconPath',
        };

        //const HaBridgeConfig = this.buildHaBridgeConfig();
    }

    /*********************************************************************
     * ************************ Objectstring *****************************
     * ******************************************************************/

    /**
     * @param obj object for the rekursive structure
     * @param startDirectory director, from wich starts the rekursive object
     * @param topic topic of the message
     * @param message message from LoRaWan device
     * @param options deviers options (eg. ignoredElementNames)
     */
    async generateRekursivObjects(obj, startDirectory, topic, message, options) {
        const activeFunction = 'generateRekursivObjects';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // just proceed with ojects
            if (typeof obj === 'object') {
                // go to every element in the object
                for (const elementName in obj) {
                    // Check the the elementname is not in ignored object
                    if (
                        !this.ignoredElementNames[elementName] &&
                        (!options || !options.ignoredElementNames || !options.ignoredElementNames[elementName])
                    ) {
                        // Check if the element is an object
                        if (typeof obj[elementName] === 'object' && obj[elementName] && !obj[elementName].isState) {
                            // Generate the desired id
                            let objectId = `${startDirectory}.${elementName}`;
                            let internalObjectId = elementName;
                            if (obj[elementName].objectId) {
                                internalObjectId = `${obj[elementName].objectId(topic, message)}`;
                                objectId = `${startDirectory}.${internalObjectId}`;
                            }
                            if (objectId.indexOf('.') === 0) {
                                objectId = objectId.substring(1, objectId.length);
                            }
                            let myObject = {};
                            // check object exists
                            if (await this.adapter.objectExists(objectId)) {
                                this.adapter.log.silly(`get object ${objectId}`);
                                myObject = await this.adapter.getObjectAsync(objectId);
                            } else {
                                this.adapter.log.silly(`object ${objectId} not exists`);
                            }
                            const myObjectBefore = structuredClone(myObject);

                            //Set type of object, if not exists, or if type in structure
                            if (!myObject.type || obj[elementName].objectType) {
                                myObject.type = obj[elementName].objectType ? obj[elementName].objectType : 'folder';
                            }

                            //check for common
                            if (!myObject.common) {
                                myObject.common = {};
                            }

                            // Check for icon assignment
                            if (obj[elementName].objectIconPath) {
                                const iconPath = obj[elementName].objectIconPath(topic, message);
                                if (iconPath !== '') {
                                    if (myObject.common.icon) {
                                        if (myObject.common.icon.indexOf('offline') !== -1) {
                                            // create changeinfo and register notification
                                            const changeInfo = await this.adapter.getChangeInfo(objectId);
                                            if (changeInfo) {
                                                const message = `${this.adapter.i18nTranslation['LoRaWAN device is back online']}.\n${this.adapter.i18nTranslation['Device']}: ${changeInfo.usedDeviceId}\n${this.adapter.i18nTranslation['Application']}: ${changeInfo.usedApplicationName}`;
                                                if (this.adapter.config.notificationActivation === 'notification') {
                                                    this.adapter.registerNotification(
                                                        'lorawan',
                                                        'Lorawan device back online',
                                                        message,
                                                    );
                                                }
                                                if (this.adapter.config.BridgeType !== 'off') {
                                                    let notificationId = `${this.adapter.namespace}.${this.adapter.bridge.Words.notification}${this.adapter.bridge.GeneralId}`;
                                                    await this.adapter.bridge?.publishNotification(
                                                        notificationId,
                                                        message,
                                                        this.adapter.bridge?.Notificationlevel.deviceState,
                                                    );
                                                }
                                            }
                                        }
                                    }
                                    myObject.common.icon = iconPath;
                                }
                            }

                            // check whether a common name was specified
                            if (obj[elementName].objectCommonName) {
                                if (typeof obj[elementName].objectCommonName === 'function') {
                                    myObject.common.name = obj[elementName].objectCommonName(topic, message);
                                } else {
                                    myObject.common.name = obj[elementName].objectCommonName;
                                }
                            }

                            // Check wheter a native content was specified
                            if (!myObject.native) {
                                myObject.native = {};
                            }
                            // Generate native
                            if (obj[elementName].objectNative) {
                                const objectNative = obj[elementName].objectNative(topic, message);
                                for (const attribute in objectNative) {
                                    myObject.native[attribute] = objectNative[attribute];
                                }
                            }

                            // Assigne to common, if there are values specified
                            if (obj[elementName].objectCommonFromNative) {
                                for (const attribute in obj[elementName].objectCommonFromNative) {
                                    // Check, whether the actual native is present
                                    if (myObject.native[obj[elementName].objectCommonFromNative[attribute]]) {
                                        // check for old common => existing object
                                        if (myObjectBefore.common) {
                                            //check for content
                                            if (
                                                myObjectBefore.common[attribute] ===
                                                    myObjectBefore.native[
                                                        obj[elementName].objectCommonFromNative[attribute]
                                                    ] ||
                                                myObjectBefore.common[attribute] === ''
                                            ) {
                                                this.adapter.log.silly(
                                                    `set common attribut ${attribute} to ${myObject.native[obj[elementName].objectCommonFromNative[attribute]]}`,
                                                );
                                                myObject.common[attribute] =
                                                    myObject.native[obj[elementName].objectCommonFromNative[attribute]];
                                            }
                                        } else {
                                            this.adapter.log.silly(
                                                `set common attribut ${attribute} to ${myObject.native[obj[elementName].objectCommonFromNative[attribute]]}`,
                                            );
                                            myObject.common[attribute] =
                                                myObject.native[obj[elementName].objectCommonFromNative[attribute]];
                                        }
                                    }
                                }
                            }

                            // Check for name
                            if (!myObject.common.name) {
                                myObject.common.name = '';
                            }
                            if (!isDeepStrictEqual(myObject, myObjectBefore)) {
                                // Check for logging
                                this.adapter.log[this.adapter.logtypes.setObject]?.(`set object ${objectId}`);
                                await this.adapter.setObjectAsync(objectId, myObject);
                            }
                            // Jump into next step (next directory / attribute)
                            await this.generateRekursivObjects(obj[elementName], objectId, topic, message, options);
                        } else {
                            const common = {
                                type: typeof obj[elementName],
                                name: '',
                                role: 'state',
                                unit: obj[elementName]
                                    ? obj[elementName].CommonStateUnit
                                        ? obj[elementName].CommonStateUnit
                                        : ''
                                    : '',
                                write: false,
                            };

                            let stateVal = obj[elementName];
                            let objectId = `${startDirectory}.${elementName}`;
                            let internalObjectId = elementName;
                            if (obj[elementName]) {
                                if (obj[elementName].isState) {
                                    stateVal =
                                        obj[elementName].stateVal !== undefined ? obj[elementName].stateVal : undefined;
                                    common.type = obj[elementName].stateCommonType
                                        ? obj[elementName].stateCommonType
                                        : typeof stateVal;
                                    common.name = obj[elementName].stateCommonName
                                        ? obj[elementName].stateCommonName
                                        : common.name;
                                    common.write = obj[elementName].stateCommonWrite
                                        ? obj[elementName].stateCommonWrite
                                        : common.write;
                                    common.role = obj[elementName].stateCommonRole
                                        ? obj[elementName].stateCommonRole
                                        : common.role;
                                }
                                if (obj[elementName].objectId) {
                                    internalObjectId = `${obj[elementName].objectId(topic, message)}`;
                                    objectId = `${startDirectory}.${internalObjectId}`;
                                }
                            }

                            // Check for decoded (for custom values)
                            if (objectId.indexOf(`${this.reachableSubfolders.uplinkDecoded}.`) !== -1) {
                                // Check custom decoded json
                                if (this.adapter.config.customDecodedJsonActive) {
                                    if (typeof this.customObject === 'object') {
                                        // Eventuell noch einen Merge einfügen
                                        common.custom = this.customObject;
                                    }
                                }
                            }

                            // Check for configuration (for custom values)
                            if (objectId.indexOf(`${this.reachableSubfolders.configuration}.`) !== -1) {
                                // Check custom configuration jsondev-server
                                if (
                                    this.adapter.config.customDecodedJsonActive &&
                                    this.adapter.config.customConfigurationJsonActive
                                ) {
                                    if (typeof this.customObject === 'object') {
                                        // Eventuell noch einen Merge einfügen
                                        common.custom = this.customObject;
                                    }
                                }
                            }

                            // Check for id dont starts with "."
                            if (objectId.indexOf('.') === 0) {
                                objectId = objectId.substring(1, objectId.length);
                            }
                            // Check for an assign definition (calculation and / or role assignment)
                            if (this.assigns[elementName] && !options?.dontAssign) {
                                // Check for logging
                                this.adapter.log[this.adapter.logtypes.assign]?.(
                                    `the state with the id ${objectId} will be assigned by internal assign function`,
                                );
                                stateVal = this.assigns[elementName](stateVal, common);
                            }

                            // Check for assign (new implemented function)
                            if (this.assignhandler.assign[elementName] && !options?.dontAssign) {
                                // Check for logging
                                this.adapter.log[this.adapter.logtypes.assignHandler]?.(
                                    `the state with the id ${objectId} will be assigned by internal assign function assignHandler`,
                                );
                                stateVal = this.assignhandler.executeAssign(
                                    objectId,
                                    stateVal,
                                    this.assignhandler.assign[elementName],
                                    { common: common },
                                );
                            }
                            common.read = common.role !== 'button';
                            common.def =
                                obj[elementName] || typeof obj[elementName] === 'boolean'
                                    ? obj[elementName].stateCommonDef
                                        ? obj[elementName].stateCommonDef
                                        : common.type === 'boolean'
                                          ? false
                                          : common.type === 'number'
                                            ? 0
                                            : ''
                                    : common.type === 'number'
                                      ? 0
                                      : '';

                            await this.adapter.extendObjectAsync(objectId, {
                                type: 'state',
                                common: common,
                                native: {},
                            });
                            // Add Bridged Funktion (MQTT auto discovery)
                            // Add for new state
                            await this.adapter.bridge?.work(`${this.adapter.namespace}.${objectId}`, stateVal, {
                                common: common,
                            });
                            if (typeof stateVal === 'object') {
                                stateVal = JSON.stringify(stateVal);
                            }
                            if (stateVal !== undefined) {
                                // Set State from Objectpath
                                await this.adapter.setStateAsync(`${objectId}`, stateVal, true);
                                //Check for writecommand
                                if (this.writeCommand[elementName]) {
                                    await this.writeCommand[elementName](elementName, objectId, stateVal);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.adapter.log.error(
                `error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)} - - - Message: ${JSON.stringify(message)}`,
            );
        }
    }

    /*********************************************************************
     * ************************** Attribute ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message message of the LoRaWAN device
     * @param resolvetype resolvetype of the attribute
     */
    getAttributValue(topic, message, resolvetype) {
        const activeFunction = 'getAttributValue';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Select search in case of origin
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn:
                    return this.getTtnAttributValue(topic, message, resolvetype);
                case this.adapter.origin.chirpstack:
                    return this.getChirpstackAttributValue(topic, message, resolvetype);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /*********************************************************************
     * *************************** iconPath ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message message of the LoRaWAN device
     * @param icontype type of icon (eg. wifi)
     */
    getIconPath(topic, message, icontype) {
        const activeFunction = 'getIconPath';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            // Select search in case of origin
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn:
                    return this.getTtnIconPath(topic, message, icontype);
                case this.adapter.origin.chirpstack:
                    return this.getChirpstackIconPath(topic, message, icontype);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /**
     * @param sf spreading factor
     * @param rssi rssi value of the LoRaWAN device
     */
    analyseConnection(sf, rssi) {
        const activeFunction = 'getIcon';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`icon for device with sf: ${sf} and rssi: ${rssi} requested`);
            let iconPath = `icons/wifiSf`;
            if (sf === 7 || sf === 9 || sf === 12) {
                iconPath += `${sf}`;
            } else {
                iconPath += `X`;
            }
            if (rssi >= -70) {
                rssi = 5;
            } else if (rssi >= -80) {
                rssi = 4;
            } else if (rssi >= -90) {
                rssi = 3;
            } else if (rssi >= -100) {
                rssi = 2;
            } else if (rssi >= -110) {
                rssi = 1;
            } else {
                rssi = 0;
            }
            iconPath += `_${rssi}.png`;

            return iconPath;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }
    /*********************************************************************
     * ******************** Object Start Directory ***********************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message messaqge of the LoRaWAN device
     */
    getDeviceStartDirectory(topic, message) {
        const activeFunction = 'getDeviceStartDirectory';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const applicationId = `${this.getAttributValue(topic, message, this.searchableAttributeNames.applicationId)}`;
            const deviceEUI = `${this.getAttributValue(topic, message, this.searchableAttributeNames.deviceEUI)}`;
            return `${applicationId}.devices.${deviceEUI}`;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /*********************************************************************
     * *********************** Topic resolved ****************************
     * ******************************************************************/
    /**
     * @param topic topic of the message
     */
    getTopicResolved(topic) {
        const activeFunction = 'getTopicResolved';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`topic ${topic} is requested for resolveing`);
            // Select in case of origin
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn:
                    return this.getTtnTopicResolved(topic);
                case this.adapter.origin.chirpstack:
                    return this.getChirpstackTopicResolved(topic);
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }

    /*********************************************************************
     * **************************** TTN  *********************************
     * ******************************************************************/

    /*********************************************************************
     * ************************** Attribute ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message messaqge of the LoRaWAN device
     * @param resolvetype type to resolve to (attribute)
     */
    getTtnAttributValue(topic, message, resolvetype) {
        const activeFunction = 'getTtnAttributValue';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`attribute ${resolvetype} is requested for ttn`);
            const topicResolved = this.getTopicResolved(topic);
            switch (resolvetype) {
                case this.searchableAttributeNames.applicationId:
                    return topicResolved?.applicationId;

                case this.searchableAttributeNames.applicationName:
                    return topicResolved?.applicationName;

                case this.searchableAttributeNames.deviceEUI:
                    return message.end_device_ids.dev_eui;

                case this.searchableAttributeNames.deviceId:
                    return topicResolved?.deviceId;

                default:
                    this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
                    return '';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }

    /*********************************************************************
     * *************************** iconPath ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message messaqge of the LoRaWAN device
     * @param icontype type of the icon (eg. wifi)
     */
    getTtnIconPath(topic, message, icontype) {
        const activeFunction = 'getTtnIconPath';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`icontype ${icontype} is requested for ttn`);
            switch (icontype) {
                case this.icons.wifi:
                    if (
                        message.uplink_message?.settings.data_rate.lora.spreading_factor &&
                        message.uplink_message?.rx_metadata[0].rssi
                    ) {
                        return this.analyseConnection(
                            message.uplink_message.settings.data_rate.lora.spreading_factor,
                            message.uplink_message.rx_metadata[0].rssi,
                        );
                    }
                    return '';

                default:
                    this.adapter.log.warn(`No icontype with the name ${icontype} found.`);
                    return '';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }

    /*********************************************************************
     * ************************ Object Directory *************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     */
    getTtnTopicResolved(topic) {
        const activeFunction = 'getTtnTopicResolved';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const topicElements = topic.split('/');
            const topicResolved = {
                applicationName: '',
                applicationId: topicElements[1],
                deviceId: topicElements[3],
                messageType: topicElements[topicElements.length - 1],
            };
            // clean up application id
            const indexOfOrigin = topicResolved.applicationId.indexOf('@');
            if (indexOfOrigin !== -1) {
                topicResolved.applicationName = topicResolved.applicationId;
                topicResolved.applicationId = topicResolved.applicationId.substring(0, indexOfOrigin);
            }
            return topicResolved;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }

    /*********************************************************************
     * ************************ Chirpstack  ******************************
     * ******************************************************************/

    /*********************************************************************
     * ************************** Attribute ******************************
     * ******************************************************************/

    // !!! Dont use resoletypes with message.deviceInfo in down => No deviceInfo in down message present
    /**
     * @param topic topic of the message
     * @param message messaqge of the LoRaWAN device
     * @param resolvetype type to resolve to (attribute)
     */
    getChirpstackAttributValue(topic, message, resolvetype) {
        const activeFunction = 'getChirpstackAttributValue';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`attribute ${resolvetype} is requested for chirpstack`);
            const topicResolved = this.getTopicResolved(topic);
            switch (resolvetype) {
                case this.searchableAttributeNames.applicationId:
                    return topicResolved?.applicationId;

                case this.searchableAttributeNames.applicationName:
                    return message.deviceInfo.applicationName;

                case this.searchableAttributeNames.deviceEUI:
                    return topicResolved?.deviceEUI;

                case this.searchableAttributeNames.deviceId:
                    return message.deviceInfo.deviceName;

                default:
                    this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
                    return '';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
        }
    }

    /*********************************************************************
     * *************************** iconPath ******************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     * @param message messaqge of the LoRaWAN device
     * @param icontype type of the icon (eg. wifi)
     */
    getChirpstackIconPath(topic, message, icontype) {
        const activeFunction = 'getChirpstackIconPath';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            this.adapter.log.silly(`icontype ${icontype} is requested for Chirpstack`);
            switch (icontype) {
                case this.icons.wifi:
                    if (message.txInfo?.modulation.lora.spreadingFactor && message.rxInfo[0]?.rssi) {
                        return this.analyseConnection(
                            message.txInfo.modulation.lora.spreadingFactor,
                            message.rxInfo[0].rssi,
                        );
                    }
                    return '';

                default:
                    this.adapter.log.warn(`No icontype with the name ${icontype} found.`);
                    return '';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }

    /*********************************************************************
     * ************************ Resolved Topic ***************************
     * ******************************************************************/

    /**
     * @param topic topic of the message
     */
    getChirpstackTopicResolved(topic) {
        const activeFunction = 'getChirpstackTopicResolved';
        this.adapter.log.silly(`Function ${activeFunction} started.`);
        try {
            const topicElements = topic.split('/');
            const topicResolved = {
                applicationId: topicElements[1],
                deviceEUI: topicElements[3],
                messageType: topicElements[topicElements.length - 1],
            };
            return topicResolved;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
        }
    }
}
module.exports = directorieshandlerClass;
