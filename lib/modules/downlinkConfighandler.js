const fs = require('fs');
const { isDeepStrictEqual } = require('util');
const { crc8, crc16 } = require('easy-crc');
/**
 * this class handles the downlinkconfiguration
 */
class downlinkConfighandlerClass {
    /**
     * @param adapter adapter data (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.activeDownlinkConfigs = {};
        this.knownProfiles = [];
        this.deviceProfilesPath = '/lib/modules/deviceProfiles';
        this.internalDeviceProfilesPath = '/lib/modules/deviceProfiles/internal';
        this.internalDevices = {
            baseDevice: 'internalBaseDevice',
        };

        this.downlinkParameterAttributs = {
            name: '',
            port: 1,
            priority: 'NORMAL',
            type: 'number',
            confirmed: false,
            front: '',
            end: '',
            lengthInByte: 3,
            on: '',
            off: '',
            onClick: '',
            multiplyfaktor: 1,
            unit: '',
            crc: 'noCrc',
            limitMin: false,
            limitMinValue: 0,
            limitMax: false,
            limitMaxValue: 0,
            swap: false,
            decimalPlaces: 0,
        };

        this.metafolders = {
            downlink: {
                itself: 'downlink/',
                uploads: 'downlink/uploads/',
                current: 'downlink/current/',
                knownProfiles: 'downlink/knownProfiles/',
            },
        };
    }

    /*********************************************************************
     * *************************** General  ******************************
     * ******************************************************************/

    /**
     * adds the configed downlinkconfigs into the internal structure
     */
    async addAndMergeDownlinkConfigs() {
        const activeFunction = 'addAndMergeDownlinkConfigs';
        this.adapter.log.silly(`the standard and configed downlinks will be merged`);
        // Generate Metafolders
        await this.generateMetafoldersFromObject(this.metafolders);

        // Generate downlinks for known Profiles
        this.generateKnownProfiesFromFiles();

        try {
            // Add user downlink config first
            for (const downlinkConfig of Object.values(this.adapter.config.downlinkConfig)) {
                this.addDownlinkConfigByType(downlinkConfig, this.activeDownlinkConfigs);
            }

            // check for uploads
            await this.checkForUploads();

            // Set known Profiles
            for (const profile of Object.values(this.knownProfiles)) {
                this.addDownlinkConfigByType(profile, this.activeDownlinkConfigs);
            }

            // Check active userconfig
            const adapterId = `system.adapter.${this.adapter.namespace}`;
            const obj = await this.adapter.getForeignObjectAsync(adapterId);
            // generate the Config without own objects
            const ownConfig = [];
            for (const downlinkConfig of Object.values(this.activeDownlinkConfigs)) {
                ownConfig.push(structuredClone(downlinkConfig));
                // delete internal structure (to compare with config)
                delete ownConfig[ownConfig.length - 1].downlinkState;
            }
            // Add internal base downlinks
            const internalBaseDownlinks = this.getJsonArrayFromDirectoryfiles(
                `${this.adapter.adapterDir}${this.internalDeviceProfilesPath}`,
            );
            if (Array.isArray(internalBaseDownlinks)) {
                for (const downlinkConfig of Object.values(internalBaseDownlinks)) {
                    this.addDownlinkConfigByType(downlinkConfig, this.activeDownlinkConfigs);
                }
            }
            // Check if equal
            if (!isDeepStrictEqual(obj.native.downlinkConfig, ownConfig)) {
                obj.native.downlinkConfig = ownConfig;
                this.adapter.log.warn('Adapter restart, because of reinit configuration');
                await this.adapter.setForeignObjectAsync(adapterId, obj);
            }
            // write known Profiles
            await this.writeKnownProfiles(this.knownProfiles);

            // write downlinkconfig to current folder
            await this.writeCurrentDownlinksconfigs(obj.native.downlinkConfig);
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
            return undefined;
        }
    }

    /**
     * no Parameters needed
     */
    async generateKnownProfiesFromFiles() {
        const activeFunction = 'generateKnownProfiesFromFiles';
        try {
            this.adapter.log.silly(`${activeFunction} starts.`);
            // Add standard downlink config if devices not present
            const knownProfiles = this.getJsonArrayFromDirectoryfiles(
                `${this.adapter.adapterDir}${this.deviceProfilesPath}`,
            );
            if (knownProfiles) {
                this.knownProfiles = knownProfiles;
            }
            /*if (Array.isArray(knownProfiles)) {
                for (const downlinkConfig of Object.values(knownProfiles)) {
                    this.addDownlinkConfigByType(downlinkConfig, this.knownProfiles);
                }
            }*/
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param profiles known profiles to write (eg. from lib/module/deviceProfiles)
     */
    async writeKnownProfiles(profiles) {
        const activeFunction = 'writeKnownProfiles';
        try {
            this.adapter.log.silly(`${activeFunction} starts.`);
            // Read all files in folder and delete them
            let metadataOfFiles = await this.adapter.readDirAsync(
                this.adapter.namespace,
                this.metafolders.downlink.knownProfiles,
            );
            for (const element of Object.values(metadataOfFiles)) {
                const filepath = `${this.metafolders.downlink.knownProfiles}${element.file}`;
                //delete file from uploadfolder
                this.adapter.delFileAsync(this.adapter.namespace, filepath);
            }

            // Write knwon profiles (in one file)
            await this.adapter.writeFileAsync(
                this.adapter.namespace,
                `${this.metafolders.downlink.knownProfiles}KnownProfiles (all devicetypes).json`,
                Buffer.from(JSON.stringify(profiles)),
            );

            // Write for known profile (separated by devicetypes)
            for (const profile of Object.values(profiles)) {
                await this.adapter.writeFileAsync(
                    this.adapter.namespace,
                    `${this.metafolders.downlink.knownProfiles}${profile.deviceType}.json`,
                    Buffer.from(JSON.stringify(profile)),
                );
            }
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param downlinkConfig downlinkconfig to write (eg. from system.adapter.instance)
     */
    async writeCurrentDownlinksconfigs(downlinkConfig) {
        const activeFunction = 'writeDownlinkconfigs';
        try {
            this.adapter.log.silly(`${activeFunction} starts.`);
            // Read all files in folder and delete them
            let metadataOfFiles = await this.adapter.readDirAsync(
                this.adapter.namespace,
                this.metafolders.downlink.current,
            );
            for (const element of Object.values(metadataOfFiles)) {
                const filepath = `${this.metafolders.downlink.current}${element.file}`;
                //delete file from uploadfolder
                this.adapter.delFileAsync(this.adapter.namespace, filepath);
            }

            //Write configs to directory
            // Write whole config
            await this.adapter.writeFileAsync(
                this.adapter.namespace,
                `${this.metafolders.downlink.current}CurrentConfigs (all devicetypes).json`,
                Buffer.from(JSON.stringify(downlinkConfig)),
            );
            // Write for the devicetypes
            for (const downlinkconfig of Object.values(downlinkConfig)) {
                await this.adapter.writeFileAsync(
                    this.adapter.namespace,
                    `${this.metafolders.downlink.current}${downlinkconfig.deviceType}.json`,
                    Buffer.from(JSON.stringify(downlinkconfig)),
                );
            }
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param folderObject object wich contains the folderstructure in its elements
     */
    async generateMetafoldersFromObject(folderObject) {
        const activeFunction = 'generateFoldersFromObject';
        try {
            this.adapter.log.silly(`${activeFunction} starts.`);
            for (const folder of Object.values(folderObject)) {
                if (typeof folder === 'object') {
                    await this.generateMetafoldersFromObject(folder);
                } else {
                    await this.adapter.mkdirAsync(this.adapter.namespace, `${folder}`);
                }
            }
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * no Parameters needed
     */
    async checkForUploads() {
        const activeFunction = 'checkForUploads';
        this.adapter.log.silly(`check the upload folder for files`);
        let activeFile = 'no active file';
        try {
            let metadataOfFiles = await this.adapter.readDirAsync(
                this.adapter.namespace,
                this.metafolders.downlink.uploads,
            );
            for (const element of Object.values(metadataOfFiles)) {
                activeFile = element.file;
                const filepath = `${this.metafolders.downlink.uploads}${element.file}`;
                let readedFileobject = await this.adapter.readFileAsync(this.adapter.namespace, filepath);
                const downlinkConfig = JSON.parse(readedFileobject.file);
                if (Array.isArray(downlinkConfig)) {
                    for (const config of Object.values(downlinkConfig)) {
                        if (this.plausibilityOfDownlinkconfigOk(config)) {
                            this.addDownlinkConfigByType(config, this.activeDownlinkConfigs, { countDeviceType: true });
                        }
                    }
                } else {
                    if (this.plausibilityOfDownlinkconfigOk(downlinkConfig)) {
                        this.addDownlinkConfigByType(downlinkConfig, this.activeDownlinkConfigs, {
                            countDeviceType: true,
                        });
                    }
                }
                //delete file from uploadfolder
                this.adapter.delFileAsync(this.adapter.namespace, filepath);
            }
        } catch (error) {
            this.adapter.log.warn(
                `error in ${activeFunction} at reading ${activeFile} from downlink uploadpath. Error: ${error}`,
            );
        }
    }

    /**
     * @param downlinkconfig downlinkconfig to check for plausibility
     */
    plausibilityOfDownlinkconfigOk(downlinkconfig) {
        const activeFunction = 'checkPlausibilityOfDownlinkconfig';
        try {
            if (downlinkconfig.deviceType && downlinkconfig.downlinkParameter) {
                this.adapter.log.debug(
                    `plausibility check for uploaded downlinkconfig of ${downlinkconfig.deviceType} ok.`,
                );
                return true;
            }
            this.adapter.log.debug(
                `plausibility check for uploaded downlinkconfig of ${downlinkconfig.deviceType} not ok.`,
            );
            return false;
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param downlinkConfig downlinkconfig to add
     * @param config active downlinkConfig
     * @param options countDeviceType: the deviceType in case of exists}
     */
    addDownlinkConfigByType(downlinkConfig, config, options = {}) {
        const activeFunction = 'addDownlinkConfigByType';
        try {
            if (options && options.countDeviceType) {
                downlinkConfig.deviceType = this.addCountToElementname(config, downlinkConfig.deviceType);
            }

            // Check for device not present
            if (!config[downlinkConfig.deviceType]) {
                // override standard with userconfig
                config[downlinkConfig.deviceType] = structuredClone(downlinkConfig);
                config[downlinkConfig.deviceType].downlinkState = {};
                //Querey length of downlinkParamter
                if (config[downlinkConfig.deviceType].downlinkParameter) {
                    // generate downlinkstates for internal use
                    for (const downlinkParameter of Object.values(
                        config[downlinkConfig.deviceType].downlinkParameter,
                    )) {
                        // check name for forbidden chars
                        downlinkParameter.name = downlinkParameter.name.replace(this.adapter.FORBIDDEN_CHARS, '_');
                        // check the downlinkparameters for all needed attributes and generate them if undefined
                        for (const attribute in this.downlinkParameterAttributs) {
                            if (
                                downlinkConfig.deviceType !== this.internalDevices.baseDevice &&
                                downlinkParameter[attribute] === undefined
                            ) {
                                this.adapter.log.debug(
                                    `attribute ${attribute} in parameter ${downlinkParameter.name} at devicetype ${downlinkConfig.deviceType} generated`,
                                );
                                downlinkParameter[attribute] = this.downlinkParameterAttributs[attribute];
                            }
                        }
                        // assign downlinkparamter to internal structure
                        config[downlinkConfig.deviceType].downlinkState[downlinkParameter.name] = downlinkParameter;
                    }
                } else {
                    this.adapter.log.warn(
                        `the Deviceconfig with the name ${downlinkConfig.deviceType} has no downlinkstate configured`,
                    );
                }
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
            return undefined;
        }
    }

    /**
     * @param objectToCHeck object to check and count the elementname
     * @param name string of the name to check
     */
    addCountToElementname(objectToCHeck, name) {
        const activeFunction = 'addCountToElementname';
        try {
            let count = 0;
            const zeroDiggits = '00';
            let countedName = name;
            while (objectToCHeck[countedName] || count >= 99) {
                count++;
                const countPrefix = (zeroDiggits + count.toString()).slice(-zeroDiggits.length);
                countedName = `${name}_${countPrefix}`;
            }
            return countedName;
        } catch (error) {
            this.adapter.log.warn(`error in ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param directory directory of the file with the json array
     */
    getJsonArrayFromDirectoryfiles(directory) {
        const activeFunction = 'getJsonArrayFromDirectoryfiles';
        this.adapter.log.silly(`the standard configs will readout from json files.`);
        let filename;
        try {
            let myJsonArray = [];
            fs.readdirSync(directory).forEach(file => {
                filename = file;
                if (file.endsWith('.json')) {
                    myJsonArray = myJsonArray.concat(JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf-8')));
                }
            });
            return myJsonArray;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: Filename: ${filename} -  ${error}`);
            return undefined;
        }
    }

    /**
     * @param changeInfo changeInfo of the state / device
     */
    getBestMatchForDeviceType(changeInfo) {
        const activeFunction = 'getBestMatchForDeviceType';
        try {
            let foundMatch = '';
            let foundLength = 0;
            for (const deviceType in this.activeDownlinkConfigs) {
                if (
                    (deviceType === this.internalDevices.baseDevice && foundLength === 0) ||
                    (changeInfo.deviceType.indexOf(deviceType) === 0 && deviceType.length > foundLength)
                ) {
                    foundMatch = deviceType;
                    if (deviceType !== this.internalDevices.baseDevice) {
                        foundLength = deviceType.length;
                    }
                }
            }
            if (foundMatch !== '') {
                return foundMatch;
            }
            return undefined;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /**
     * @param changeInfo changeInfo of the state / device
     * @param options options of the function (eg. startup check)
     */
    getDownlinkParameter(changeInfo, options) {
        const activeFunction = 'getDownlinkParameter';
        this.adapter.log.silly(
            `the downlinkconfig is requested for the following changeinfo: ${JSON.stringify(changeInfo)}`,
        );
        try {
            let downlinkParameter = undefined;
            let foundLength = 0;
            for (const deviceType in this.activeDownlinkConfigs) {
                if (
                    (deviceType === this.internalDevices.baseDevice && foundLength === 0) ||
                    (changeInfo.deviceType.indexOf(deviceType) === 0 && deviceType.length > foundLength)
                ) {
                    if (this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState]) {
                        downlinkParameter =
                            this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState];
                        if (deviceType !== this.internalDevices.baseDevice) {
                            foundLength = deviceType.length;
                        }
                    }
                }
            }
            if (downlinkParameter !== undefined) {
                return downlinkParameter;
            }
            if (options && options.startupCheck) {
                if (changeInfo.deviceType === '') {
                    this.adapter.log.warn(
                        `${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices without a typedefinition.`,
                    );
                } else {
                    this.adapter.log.warn(
                        `${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices with the typ: ${changeInfo.deviceType}`,
                    );
                }
            } else {
                this.adapter.log.warn(
                    `${activeFunction}: no downlinkParameter found: deviceType: ${changeInfo.deviceType} - changed state: ${changeInfo.changedState}`,
                );
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /*********************************************************************
     * *********************** Downlinktopic *****************************
     * ******************************************************************/

    /**
     * @param changeInfo changeInfo of the state / device
     * @param suffix suffix for the topic
     */
    getDownlinkTopic(changeInfo, suffix) {
        // Select downlinktopic in case of origin
        switch (this.adapter.config.origin) {
            case this.adapter.origin.ttn:
                return this.getTtnDownlinkTopic(changeInfo, suffix);
            case this.adapter.origin.chirpstack:
                return this.getChirpstackDownlinkTopic(changeInfo, suffix);
        }
    }

    /*********************************************************************
     * *********************** Topicsuffix *****************************
     * ******************************************************************/

    /**
     * @param state state wich selects the suffix
     */
    getDownlinkTopicSuffix(state) {
        const activeFunction = 'getDownlinkTopicSuffix';
        try {
            const replace = 'replace';
            switch (this.adapter.config.origin) {
                case this.adapter.origin.ttn:
                    switch (state) {
                        case replace:
                            return '/down/replace';

                        default:
                            return '/down/push';
                    }
                case this.adapter.origin.chirpstack:
                    return '/down';
            }
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /*********************************************************************
     * ************************** Downlink *******************************
     * ******************************************************************/

    /**
     * @param downlinkConfig downlinkconfig of the state
     * @param payloadInHex payload in Hex to calculate the downlink
     * @param changeInfo changeInfo of the state / device
     */
    getDownlink(downlinkConfig, payloadInHex, changeInfo) {
        // Select downlink in case of origin
        this.adapter.log.silly(`the downlink for the changeinfo ${JSON.stringify(changeInfo)} is requested`);
        switch (this.adapter.config.origin) {
            case this.adapter.origin.ttn:
                return this.getTtnDownlink(downlinkConfig, payloadInHex);
            case this.adapter.origin.chirpstack:
                return this.getChirpstackDownlink(downlinkConfig, payloadInHex, changeInfo);
        }
    }

    /*********************************************************************
     * ******************* Calculation of payload ************************
     * ******************************************************************/

    /**
     * @param downlinkParameter downlinkparameter to generate the downlink
     * @param state state for the downlink
     */
    calculatePayloadInHex(downlinkParameter, state) {
        // declare pyaload variable
        this.adapter.log.silly(`the payload will be calculated`);
        let payloadInHex = '';
        let multipliedVal = 0;
        const crcConfig = downlinkParameter.crc ? downlinkParameter.crc.split('.') : ['noCrc'];
        const crcAlgorithm = crcConfig[0];
        const crcSwap = crcConfig[1] === 'LittleEndian' ? true : false;

        //Check type
        if (downlinkParameter.type === 'button') {
            payloadInHex = downlinkParameter.onClick;
        } else if (downlinkParameter.type === 'boolean') {
            if (state.val) {
                payloadInHex = downlinkParameter.on;
            } else {
                payloadInHex = downlinkParameter.off;
            }
        } else {
            let numberOfDiggits = 0;
            let zeroDiggits = '';
            let resultAfterdecimalPlaces = 0;
            switch (downlinkParameter.type) {
                case 'number':
                    if (downlinkParameter.decimalPlaces) {
                        const expotentialFactor = Math.pow(10, downlinkParameter.decimalPlaces);
                        const StateWithExotetialFactor = Math.round(state.val * expotentialFactor);
                        resultAfterdecimalPlaces = StateWithExotetialFactor / expotentialFactor;
                    } else {
                        resultAfterdecimalPlaces = Math.trunc(state.val);
                    }
                    multipliedVal = resultAfterdecimalPlaces * downlinkParameter.multiplyfaktor;
                    // Assign absolute value
                    payloadInHex = Math.round(Math.abs(multipliedVal)).toString(16); // Round to convert only integers to HEX
                    // create the zero diggits
                    numberOfDiggits = downlinkParameter.lengthInByte * 2;
                    for (let index = 1; index <= numberOfDiggits; index++) {
                        zeroDiggits += '0';
                    }
                    payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
                    if (downlinkParameter.swap) {
                        payloadInHex = Buffer.from(payloadInHex, 'hex').reverse().toString('hex');
                    }

                    // Create negative 2´s complement
                    if (multipliedVal < 0) {
                        const compareFactor = Math.pow(2, downlinkParameter.lengthInByte * 8) - 1;
                        payloadInHex = ((~parseInt(payloadInHex, 16) + 1) & compareFactor).toString(16);
                    }

                    // Assign the front and end
                    payloadInHex = downlinkParameter.front + payloadInHex + downlinkParameter.end;
                    break;

                case 'ascii':
                    payloadInHex = Buffer.from(state.val).toString('hex');
                    numberOfDiggits = downlinkParameter.lengthInByte * 2;
                    for (let index = 1; index <= numberOfDiggits; index++) {
                        zeroDiggits += '0';
                    }
                    payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
                    payloadInHex = downlinkParameter.front + payloadInHex + downlinkParameter.end;
                    break;

                case 'string':
                    payloadInHex = downlinkParameter.front + state.val + downlinkParameter.end;
                    payloadInHex = Buffer.from(payloadInHex).toString('hex');
                    break;
            }
        }
        if (crcAlgorithm && crcAlgorithm !== 'noCrc') {
            let crc = null;
            if (crcAlgorithm === 'CRC-8') {
                crc = crc8(crcAlgorithm, Buffer.from(payloadInHex, 'hex')).toString(16);
            } else {
                crc = crc16(crcAlgorithm, Buffer.from(payloadInHex, 'hex')).toString(16);
            }

            // Check for swap if little endian is selected
            if (crcSwap) {
                crc = Buffer.from(crc, 'hex').reverse().toString('hex');
            }
            payloadInHex += crc;
        }
        return payloadInHex.toUpperCase();
    }

    /*********************************************************************
     * **************************** TTN  *********************************
     * ******************************************************************/

    /*********************************************************************
     * *********************** Downlinktopic *****************************
     * ******************************************************************/

    /**
     * @param changeInfo changeInfo of the state / device
     * @param suffix suffix for the topic
     */
    getTtnDownlinkTopic(changeInfo, suffix) {
        this.adapter.log.silly(`the downlinktopic for ttn is requested`);
        const topicElements = {
            Version: 'v3',
            applicationId: `/${changeInfo.applicationId}`,
            applicationFrom: '@ttn',
            devices: `/devices`,
            deviceId: `/${changeInfo.deviceId}`,
            suffix: suffix,
        };
        let downlink = '';
        for (const stringelement of Object.values(topicElements)) {
            downlink += stringelement;
        }
        return downlink;
    }

    /*********************************************************************
     * ************************** Downlink ******************************
     * ******************************************************************/

    /**
     * @param downlinkConfig downlinkConfig for the state
     * @param payloadInHex payload in Hex to calculate the downlink
     */
    getTtnDownlink(downlinkConfig, payloadInHex) {
        const activeFunction = 'getTtnDownlink';
        try {
            this.adapter.log.silly(`the downlink for ttn is requested`);
            //convert hex in base64
            const payloadInBase64 = Buffer.from(payloadInHex, 'hex').toString('base64');
            // retun the whole downlink
            return {
                downlinks: [
                    {
                        f_port: downlinkConfig.port,
                        frm_payload: payloadInBase64,
                        priority: downlinkConfig.priority,
                        confirmed: downlinkConfig.confirmed,
                    },
                ],
            };
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    /*********************************************************************
     * ************************** Chirpstack  ****************************
     * ******************************************************************/

    /*********************************************************************
     * *********************** Downlinktopic *****************************
     * ******************************************************************/

    /**
     * @param changeInfo changeInfo of the state
     * @param suffix suffix of the topic
     */
    getChirpstackDownlinkTopic(changeInfo, suffix) {
        this.adapter.log.silly(`the downlinktopic for chirpstack is requested`);
        const topicElements = {
            Version: 'application',
            applicationId: `/${changeInfo.applicationId}`,
            device: `/device`,
            deviceEUI: `/${changeInfo.deviceEUI}`,
            command: `/command`,
            suffix: suffix,
        };
        let downlink = '';
        for (const stringelement of Object.values(topicElements)) {
            downlink += stringelement;
        }
        return downlink;
    }

    /*********************************************************************
     * ************************** Downlink ******************************
     * ******************************************************************/

    /**
     * @param downlinkConfig downlinkConfig for the state
     * @param payloadInHex payload in Hex to calculate the downlink
     * @param changeInfo changeInfo of the state
     */
    getChirpstackDownlink(downlinkConfig, payloadInHex, changeInfo) {
        this.adapter.log.silly(`the downlink for chirpstack is requested`);
        const payloadInBase64 = Buffer.from(payloadInHex, 'hex').toString('base64');
        // retun the whole downlink
        return {
            devEui: changeInfo.deviceEUI,
            confirmed: downlinkConfig.confirmed,
            fPort: downlinkConfig.port,
            data: payloadInBase64,
        };
    }
}

module.exports = downlinkConfighandlerClass;
