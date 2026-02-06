'use strict';

const mqtt = require('mqtt');
const crypto = require('node:crypto');

/*
 * Created with @iobroker/create-adapter v2.6.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const bridgeClass = require('./lib/modules/bridge');
const mqttClientClass = require('./lib/modules/mqttclient');
const messagehandlerClass = require('./lib/modules/messagehandler');
const downlinkConfigHandlerClass = require('./lib/modules/downlinkConfighandler');
const LoRaWANDeviceManagement = require('./lib/modules/deviceManager/deviceManager');
const objectStoreClass = require('./lib/modules/objectStore');

class Lorawan extends utils.Adapter {
    /**
     * @param [options] options of the adapter
     */
    constructor(options) {
        super({
            ...options,
            name: 'lorawan',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('fileChange', this.onFileChange.bind(this));
        this.origin = {
            ttn: 'ttn',
            chirpstack: 'chirpstack',
        };
        this.NextSendLocks = new Map(); // key -> Promise-chain

        // Simulation variables
        this.simulation = {};
        this.mySystemConfig;
        this.language;

        // Adapter Version
        this.version;

        this.secret = {
            hash: 'f3988f71e0d6248fbf690c414bcb46b0500c3a8b3ec9adb9c66be2774ec12291',
            salt: 'LoRaWANBeScJoFr',
        };

        // Serialize getStateConfig
        this._configQueue = Promise.resolve();
        this._changeInfoCache = new Map();
        this._adapterObjectsCache = null;

        // Internal Logging Table
        this.logtypes = {};
    }

    onFileChange(_id, _fileName, _size) {
        // restart adapter after upload
        // this.restart();
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        const activeFunction = 'onReady';
        try {
            // Get Logtypes
            this.logtypes = JSON.parse(await this.setDefIfEmptyAndReturnVal('bridge.debug.logtypes'));

            // Generate Object Store
            this.objectStore = new objectStoreClass(this);

            await this.objectStore.generateStoreObjects();

            // read system translation out of i18n translation
            this.i18nTranslation = await this.geti18nTranslation();

            // get systemconfig and configued language
            this.mySystemConfig = await this.getForeignObjectAsync('system.config');
            this.language = this.mySystemConfig?.common.language || 'en';

            // Read aktual Adapterversion
            const adapterinfos = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
            this.version = adapterinfos?.common.version;

            // create downlinkConfigs
            this.downlinkConfighandler = new downlinkConfigHandlerClass(this);

            // Merge the configed and standard profile of downlinks
            await this.downlinkConfighandler.addAndMergeDownlinkConfigs();

            // create new message handler
            this.messagehandler = new messagehandlerClass(this);

            // generate new configed downlinkstates on allready existing devices at adapter startup
            if (this.config.origin !== 'off') {
                await this.messagehandler.generateDownlinksAndRemoveStatesAtStatup();
            }

            // generate deviceinfo of all devices in info folder
            await this.messagehandler.generateDeviceinfosAtStartup();

            // get history instances at Startup
            await this.messagehandler.setCustomObjectAtStartup();

            // Set mqtt client => just declare, if a URL is set
            if (this.config.origin !== 'off') {
                this.mqttClient = new mqttClientClass(this, this.config);
            }

            // declare bridge if configured
            if (this.config.BridgeType !== 'off') {
                this.bridge = new bridgeClass(this);
                // Zuweisen einer Discovery zu der Gerätediscovery
                this.bridge?.on('publishDiscovery', options => {
                    this.objectStore?.initBridgeObjectWithDiscover(options.id, options.DiscoveryObject);
                });
                this.bridge?.on('publishId', options => {
                    this.objectStore?.setPublishForBridge(options.device);
                });
                this.bridge?.on('handleMessage', options => {
                    this.objectStore?.handleMessageForBridge(options.device);
                });
            }

            this.deviceManagement = new LoRaWANDeviceManagement(this);
            //Subscribe all configuration and control states
            await this.subscribeStatesAsync('*');
            await this.subscribeObjectsAsync('*');
            // this.subscribeObjectsAsync('*.downlink.control.*');
            // Check for logging
            this.log[this.logtypes.downlinkconfig]?.(
                `the adapter starts with downlinkconfigs: ${JSON.stringify(this.config.downlinkConfig)}.`,
            );
            this.log[this.logtypes.downlinkconfig]?.(
                `the active downlinkconfigs are: ${JSON.stringify(this.downlinkConfighandler.activeDownlinkConfigs)}`,
            );

            /*
            setTimeout(async () => {
                this.log.debug('vor Simulation');
                await this.startSimulation();
                this.log.debug('nach Simulation');
            }, 5000);
            */
            /* this.simulation.timeout = setTimeout(async () => {
				const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/f1c0ae0e-b4a2-4547-b360-7cfa15e85734/command/down";
				const message = {devEui:"f1c0ae0e-b4a2-4547-b360-7cfa15e85734",confirmed:false,fPort:1,data:"AAA"};
				await this.mqttClient?.publish(topic,JSON.stringify(message));
			}, 5000);*/
            // Test of getChangeInfo with and without object Store
            /*
            const ts = Date.now();
            this.log.error(`start mit objectStore`);
            for (let i = 1; i <= 1000; i++) {
                let a = await this.getChangeInfo(
                    'lorawan.0.bbea74d6-1fc5-4238-af20-d2aecdbb4f8e.devices.70b3d52dd301b3cc.configuration.devicetype',
                );
            }
            this.log.error(`Dauer: ${Date.now() - ts}`);*/
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    createHash(plainText, salt) {
        return crypto
            .createHash('sha256')
            .update(plainText + salt)
            .digest('hex');
    }

    /**
     * CHeck ID for '' and set to def, if preset
     *
     * @param id id to check for empty
     */
    async setDefIfEmptyAndReturnVal(id) {
        if (await this.objectExists(id)) {
            const stateOfId = await this.getStateAsync(id);
            if (stateOfId && typeof stateOfId.val) {
                if (stateOfId.val === '') {
                    const objectOfId = await this.getObjectAsync(id);
                    if (objectOfId?.common.def) {
                        await this.setState(id, objectOfId?.common.def, true);
                        return objectOfId?.common.def;
                    }
                } else {
                    return stateOfId.val;
                }
            }
        }
    }

    async geti18nTranslation() {
        const systemConfig = await this.getForeignObjectAsync('system.config');
        if (systemConfig) {
            let lang = systemConfig.common.language;
            if (!lang) {
                lang = 'en';
            }
            const translationsPath = `./admin/i18n/${lang}/translations.json`;
            return require(translationsPath);
        }
        return {};
    }

    async startSimulation() {
        // TTN
        //const topic ="v3/hafi-ttn-lorawan@ttn/devices/Meins/up";
        //const message = {"end_device_ids":{"device_id":"eui-lobaro-modbus","application_ids":{"application_id":"hafi-ttn-lorawan"},"dev_eui":"70B3D5E050013950","join_eui":"D55B58C0DDC074DE","dev_addr":"260B5972"},"correlation_ids":["gs:uplink:01HMQZVSCX4D7JRDNFA7GJ9D4W"],"received_at":"2024-01-22T07:06:25.260676101Z","uplink_message":{"session_key_id":"AY0v/ZirzRkpNW0Cgjdhig==","f_port":20,"f_cnt":2,"frm_payload":"AA5BAf0AxwIAAQ==","decoded_payload":{"airhumidity":50.9,"airtemperature":19.9,"port":20,"relais1":0,"relais2":1,"relais3":null,"relais5":null,"volt":3.649,"zisternenpegel":2},"rx_metadata":[{"gateway_ids":{"gateway_id":"hafenmeister-port2ttn-ng","eui":"50313953530A4750"},"time":"2024-01-22T07:06:25.013878Z","timestamp":995696116,"rssi":-37,"channel_rssi":-37,"snr":8.5,"location":{"latitude":53.5548443059465,"longitude":9.92155426743724,"altitude":10,"source":"SOURCE_REGISTRY"},"uplink_token":"CiYKJAoYaGFmZW5tZWlzdGVyLXBvcnQydHRuLW5nEghQMTlTUwpHUBD0u+TaAxoLCPGnuK0GEM3uvhkgoIL0oP24Sg==","channel_index":5,"received_at":"2024-01-22T07:06:25.032492359Z"}],"settings":{"data_rate":{"lora":{"bandwidth":125000,"spreading_factor":9,"coding_rate":"4/5"}},"frequency":"867500000","timestamp":995696116,"time":"2024-01-22T07:06:25.013878Z"},"received_at":"2024-01-22T07:06:25.054442349Z","consumed_airtime":"0.205824s","network_ids":{"net_id":"000013","ns_id":"EC656E0000000181","tenant_id":"ttn","cluster_id":"eu1","cluster_address":"eu1.cloud.thethings.network"}}};
        /*
        const topic = 'v3/hafi-ttn-lorawan@ttn/devices/eui-00137A1000044DF5/up';
        const message = {
            end_device_ids: {
                device_id: 'shlm-luxsensor-001',
                application_ids: { application_id: 'shlm-clima' },
                dev_eui: '00137A1000044DF5',
                join_eui: '00137A1000000002',
                dev_addr: '260B60D9',
            },
            correlation_ids: ['gs:uplink:01JDM7QFYGPF09F2NK2YW5GW78'],
            received_at: '2024-11-26T12:39:20.993583474Z',
            uplink_message: {
                session_key_id: 'AZNi5dvTa96t7M6UDHLcnw==',
                f_port: 6,
                f_cnt: 107,
                frm_payload: 'AR4BJAAAAQIAAAA=',
                decoded_payload: { BatV: 3.6, Illuminance: 258 },
                rx_metadata: [
                    {
                        gateway_ids: { gateway_id: 'shlmgw03', eui: 'A84041FDFE291238' },
                        time: '2024-11-26T12:39:20.769507Z',
                        timestamp: 184317371,
                        rssi: -29,
                        channel_rssi: -29,
                        snr: 14,
                        frequency_offset: '9922',
                        location: {
                            latitude: 54.51076410677215,
                            longitude: 9.540317058563234,
                            source: 'SOURCE_REGISTRY',
                        },
                        uplink_token: 'ChYKFAoIc2hsbWd3MDMSCKhAQf3+KRI4ELvr8VcaDAj4gpe6BhCWuPL1AiD4xK/RrrNE',
                        channel_index: 1,
                        received_at: '2024-11-26T12:39:20.784112662Z',
                    },
                    {
                        gateway_ids: { gateway_id: 'shlmgw01', eui: 'A84041FDFE276220' },
                        time: '2024-11-26T12:39:20.764831Z',
                        timestamp: 304678548,
                        rssi: -105,
                        channel_rssi: -105,
                        snr: -1.8,
                        frequency_offset: '10121',
                        location: {
                            latitude: 54.5128326197047,
                            longitude: 9.54245877441114,
                            source: 'SOURCE_REGISTRY',
                        },
                        uplink_token: 'ChYKFAoIc2hsbWd3MDESCKhAQf3+J2IgEJSNpJEBGgwI+IKXugYQ9bnS+QIgoOSGgu/qhgE=',
                        channel_index: 1,
                        received_at: '2024-11-26T12:39:20.791977205Z',
                    },
                    {
                        gateway_ids: { gateway_id: 'eui-7076ff0056070bc0', eui: '7076FF0056070BC0' },
                        time: '2024-11-26T12:39:20.756Z',
                        timestamp: 2848353700,
                        rssi: -120,
                        channel_rssi: -120,
                        snr: -8.2,
                        uplink_token:
                            'CiIKIAoUZXVpLTcwNzZmZjAwNTYwNzBiYzASCHB2/wBWBwvAEKTbmc4KGgwI+IKXugYQiY/egwMgoJHx+PLsngEqDAj4gpe6BhCAyr7oAg==',
                        channel_index: 6,
                        gps_time: '2024-11-26T12:39:20.756Z',
                        received_at: '2024-11-26T12:39:20.813139849Z',
                    },
                ],
                settings: {
                    data_rate: { lora: { bandwidth: 125000, spreading_factor: 7, coding_rate: '4/5' } },
                    frequency: '868300000',
                    timestamp: 184317371,
                    time: '2024-11-26T12:39:20.769507Z',
                },
                received_at: '2024-11-26T12:39:20.785204683Z',
                consumed_airtime: '0.061696s',
                version_ids: {
                    brand_id: 'netvox',
                    model_id: 'r718g',
                    hardware_version: '2',
                    firmware_version: '10',
                    band_id: 'EU_863_870',
                },
                network_ids: {
                    net_id: '000013',
                    ns_id: 'EC656E0000000181',
                    tenant_id: 'ttn',
                    cluster_id: 'eu1',
                    cluster_address: 'eu1.cloud.thethings.network',
                },
            },
        };
*/
        // ACK
        //const topic = "v3/hafi-ttn-lorawan@ttn/devices/eui-a84041162183f8fb/down/ack";
        //const message = {"end_device_ids":{"device_id":"eui-a84041162183f8fb","application_ids":{"application_id":"hafi-ttn-lorawan"},"dev_eui":"A84041162183F8FB","join_eui":"A840410000000101","dev_addr":"260B141A"},"correlation_ids":["as:downlink:01HP6D18MQXJN90J5B07DC11HY","gs:uplink:01HP6D1A9X4WAA3SFMXH4ESSMV"],"received_at":"2024-02-09T07:41:41.776887672Z","downlink_ack":{"session_key_id":"AY2MUrmnuovS8DCZAfYmsA==","f_port":1,"f_cnt":21,"frm_payload":"AQAAeA==","confirmed":true,"priority":"NORMAL","correlation_ids":["as:downlink:01HP6D18MQXJN90J5B07DC11HY"],"confirmed_retry":{"attempt":1}}};
        /*
        // Chipstack
        const topic = 'application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/event/up';
        const message = {
            deduplicationId: '46fecb8d-d7f1-481e-8b1b-bcaad7e5d1e0',
            time: '2025-02-18T14:49:19.475813+00:00',
            deviceInfo: {
                tenantId: '52f14cd4-c6f1-4fbd-8f87-4025e1d49242',
                tenantName: 'ChirpStack',
                applicationId: 'bac5ba56-f9c6-4d98-a609-8366e048495d',
                applicationName: 'Pool',
                deviceProfileId: 'e847fd4b-a87e-452c-91b8-a4fbaa51acfa',
                deviceProfileName: 'Dragino Feuchtesenor',
                deviceName: 'Skimmer',
                devEui: 'a84041f621857cd2',
                deviceClassEnabled: 'CLASS_A',
                tags: {},
            },
            devAddr: '01cdf20a',
            adr: true,
            dr: 5,
            fCnt: 170,
            fPort: 2,
            confirmed: false,
            data: 'DPYBAaL//AA9',
            object: {
                Soilmoisture: 41.8,
                Soilconductivity: 61,
                devicetype: 'Dragino',
                Volt: 3.318,
                Soiltemperature: -0.4,
            },
            rxInfo: [
                {
                    gatewayId: '503035416e314750',
                    uplinkId: 33537,
                    gwTime: '2025-02-18T14:49:19.475813+00:00',
                    rssi: -108,
                    snr: 2,
                    channel: 4,
                    location: { latitude: 50.693467319817266, longitude: 8.47676753997803 },
                    context: 'mRVIdA==',
                    crcStatus: 'CRC_OK',
                },
            ],
            txInfo: {
                frequency: 867300000,
                modulation: { lora: { bandwidth: 125000, spreadingFactor: 7, codeRate: 'CR_4_5' } },
            },
            regionConfigId: 'eu868',
        };*/

        // Chipstack
        const topic = 'application/bbea74d6-1fc5-4238-af20-d2aecdbb4f8e/device/70b3d52dd301b3cc/event/up';
        const message = {
            deduplicationId: '1d94e6d8-25cc-4099-ab45-4a7f7faa1634',
            time: '2025-05-15T13:22:08.891648+00:00',
            deviceInfo: {
                tenantId: '52f14cd4-c6f1-4fbd-8f87-4025e1d49242',
                tenantName: 'ChirpStack',
                applicationId: 'bbea74d6-1fc5-4238-af20-d2aecdbb4f8e',
                applicationName: 'Heizen',
                deviceProfileId: 'aedb4f09-8644-430b-a088-47519f01530b',
                deviceProfileName: 'MClimate Vicki',
                deviceName: 'ThermostatKinderzimmerRika',
                devEui: '70b3d52dd301b3cc',
                deviceClassEnabled: 'CLASS_A',
                tags: {},
            },
            devAddr: '01b6c24b',
            adr: true,
            dr: 5,
            fCnt: 38547,
            fPort: 2,
            confirmed: false,
            data: 'RADjUgC5gRKfTt7eEfAw',
            object: {
                CalibrationFailed: false,
                ValveOpenness: 0,
                MotorRange: 478,
                ChildLock: false,
                Reason: 81,
                RelativeHumidity: 30.47,
                BatteryVoltage: 3.5,
                AttachedBackplate: true,
                extSensorTemperature: 22.7,
                TargetTemperature: 18,
                PerceiveAsOnline: true,
                BrokenSensor: false,
                AntiFreezeProtection: false,
                HighMotorConsumption: false,
                Device: 'Vicki',
                SensorTemperature: 23.06,
                targetTemperatureFloat: 18.5,
                MotorPosition: 478,
                OpenWindow: false,
                LowMotorConsumption: false,
            },
            rxInfo: [
                {
                    gatewayId: '503035416e314750',
                    uplinkId: 55809,
                    gwTime: '2025-05-15T13:22:08.891648+00:00',
                    nsTime: '2025-05-15T13:22:08.927071564+00:00',
                    rssi: -81,
                    snr: 7.5,
                    channel: 2,
                    rfChain: 1,
                    location: { latitude: 50.693467319817266, longitude: 8.47676753997803 },
                    context: 'YOhWvA==',
                    crcStatus: 'CRC_OK',
                },
            ],
            txInfo: {
                frequency: 868500000,
                modulation: { lora: { bandwidth: 125000, spreadingFactor: 7, codeRate: 'CR_4_5' } },
            },
            regionConfigId: 'eu868',
        };

        // const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/command/down";
        // const message = {"devEui":"a84041f621857cd2","confirmed":false,"fPort":1,"data":"AQAqMA=="};

        // Chirpstack LT222222
        // const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a8404127a188d826/event/up";
        // const message = {"deduplicationId":"bd3fdb3b-af86-4617-b9f2-da07075d2bc5","time":"2024-01-24T16:47:01.573381+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"d63c10b6-9263-4ab3-9299-4308fa19a2ad","applicationName":"Benjamin Schmidt","deviceProfileId":"f1c0ae0e-b4a2-4547-b360-7cfa15e85734","deviceProfileName":"Dragino LT22222","deviceName":"Relaistestgerät","devEui":"a8404127a188d826","deviceClassEnabled":"CLASS_C","tags":{}},"devAddr":"01dfbaf2","adr":true,"dr":5,"fCnt":12,"fPort":2,"confirmed":false,"data":"AAAAAAAAAAA8/0E=","object":{"RO1_status":"OFF","DO2_status":"H","ACI2_mA":0.0,"DO1_status":"H","Hardware_mode":"LT22222","RO2_status":"OFF","AVI2_V":0.0,"ACI1_mA":0.0,"DI1_status":"H","DI2_status":"H","Work_mode":"2ACI+2AVI","AVI1_V":0.0},"rxInfo":[{"gatewayId":"50303541b0344750","uplinkId":57857,"gwTime":"2024-01-24T16:47:01.573381+00:00","nsTime":"2024-01-24T16:47:02.370171527+00:00","rssi":-54,"snr":8.5,"channel":6,"location":{"latitude":50.69344693065449,"longitude":8.476783633232118},"context":"2tr9BA==","metadata":{"region_config_id":"eu868","region_common_name":"EU868"},"crcStatus":"CRC_OK"}],"txInfo":{"frequency":867700000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}}};
        // const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a8404127a188d826/command/down";
        // const message = {"devEui":"a8404127a188d826","confirmed":false,"fPort":1,"data":"AQACWA=="};

        // ACK
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/ack";
        // const message = {"deduplicationId":"b080c0d8-6151-4675-84b8-74ecf9e33bae","time":"2023-08-15T13:22:27.969901+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"queueItemId":"3434298f-2b89-49f8-885e-9fdd9f0892e6","acknowledged":true,"fCntDown":262};

        // TXACK
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/txack";
        // const message = {"downlinkId":2478630510,"time":"2024-01-27T11:50:04.736655452+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"queueItemId":"efc2bacf-d5da-48d3-a6ef-2a77fda41bd0","fCntDown":4940,"gatewayId":"50313953530a4750","txInfo":{"frequency":868300000,"power":16,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5","polarizationInversion":true}},"timing":{"delay":{"delay":"1s"}},"context":"eqFuiw=="}};

        // STATUS
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/status";
        // const message = {"deduplicationId":"4a91b00d-b5e1-4955-b085-ba21b9318213","time":"2024-01-26T20:18:45.299871+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"margin":7,"externalPowerSource":false,"batteryLevelUnavailable":false,"batteryLevel":85.826775};

        // UP
        // const topic = "application/e91e66ba-1aa7-4bdf-af88-f1246e0b8d75/device/a84041263188b787/event/up";
        // const message = {"deduplicationId":"ce1ca35d-35c7-4f60-844c-c2b2810fd74b","time":"2024-08-25T07:10:47.758298+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"e91e66ba-1aa7-4bdf-af88-f1246e0b8d75","applicationName":"Türen","deviceProfileId":"431c5895-68e2-478d-945f-f0e9a6f5f9f5","deviceProfileName":"Dragino Türsensoren / Fenstersensoren","deviceName":"Flurtüre","devEui":"a84041263188b787","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"0061ebd4","adr":true,"dr":5,"fCnt":8264,"fPort":10,"confirmed":false,"data":"DAYBAA+IAAAAAA==","object":{"ALARM":0.0,"BAT_V":3.078,"CONTACT":true,"OPEN_TIMES":3976.0,"MOD":1.0,"LAST_OPEN_DURATION":0.0,"OPEN":false,"devicetype":"Dragino"},"rxInfo":[{"gatewayId":"503035416e314750","uplinkId":64001,"gwTime":"2024-08-25T07:10:47.758298+00:00","nsTime":"2024-08-25T07:11:29.787667701+00:00","rssi":-68,"snr":9.25,"channel":6,"location":{"latitude":50.69350130173554,"longitude":8.476821184158327},"context":"fp1WbA==","metadata":{"region_common_name":"EU868","region_config_id":"eu868"},"crcStatus":"CRC_OK"}],"txInfo":{"frequency":867700000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}}};

        // LOG
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/up";
        // const message = {"time":"2024-01-27T10:29:58.221817559+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"level":"ERROR","code":"UPLINK_CODEC","description":"Exception generated by quickjs","context":{"deduplication_id":"c44e7e25-09ce-4c95-b96f-5a298c5c6440"}};

        // JOIN
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/join";
        // const message = {"deduplicationId":"44cef56d-1b8d-45fc-a762-03b98b620db2","time":"2023-12-12T03:13:21.551178+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"01009400"};

        // DOWN
        // const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/command/down";
        // const message = {"devEui": "70b3d52dd300ed31", "confirmed": false,"fPort": 1,"data": "DQEYDQEY"};

        this.log.debug(`incoming topic: ${topic}`);
        this.log.debug(`incoming message: ${JSON.stringify(message)}`);

        await this.messagehandler?.handleMessage(topic, message);
    }
    /**
     * Is called when the adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback function wich is called after shutdown adapter
     */
    async onUnload(callback) {
        try {
            // Ausgabe der Nachricht, dass der Adapter beendet wird
            const notificationId = `${this.namespace}.${this.bridge?.Words.notification}${this.bridge?.GeneralId}`;
            await this.bridge?.publishNotification(
                notificationId,
                this.i18nTranslation['Adapter will be stoped'],
                this.bridge?.Notificationlevel.bridgeConnection,
            );
            // clear timeout (for simulation)
            if (this.simulation.timeout) {
                this.clearTimeout(this.simulation.timeout);
                delete this.simulation.timeout;
            }

            // Clear Schedules in the directory handler
            this.messagehandler?.clearAllSchedules();

            // Clear Schedules in Bridge
            this.bridge?.clearAllSchedules();

            // Destroy Bridged mqtt client
            this.bridge?.bridgeMqttClient?.destroy();

            // Destroy mqtt client
            this.mqttClient?.destroy();
            callback();
        } catch (e) {
            this.log.error(`error at onUnload: ${e}`);
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     *
     * @param id ID of the changed object
     * @param obj value and ack of the changed object
     */
    async onObjectChange(id, obj) {
        this.log.silly(`${id} is changed into ${JSON.stringify(obj)}`);
        const activeFunction = 'main.js - onObjectChange';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            // Internal Objects => Assign to objectStore
            if (id.startsWith(this.namespace)) {
                // Update State in objectStore
                if (!id.startsWith(`${this.namespace}.info`) && !id.startsWith(`${this.namespace}.bridge`)) {
                    await this.objectStore?.updateLoraWanObject(id, { payload: { object: obj } });
                }
                if (id.startsWith(`${this.namespace}.bridge.devices`)) {
                    if (obj !== null) {
                        await this.objectStore?.updateToIobObject(id, { payload: { object: obj } });
                    } else {
                        await this.objectStore?.deleteToIobObject(id);
                    }
                }

                // External States
            } else {
                if (this.bridge && this.objectStore?.bridge.currentIds[id]) {
                    await this.objectStore.updateBridgeObject(id, { payload: { object: obj } });
                }
                // Only work if bridge is activ
                if (this.bridge && id === this.config.BridgeEnum) {
                    // Erzeugen der HA Bridged für Control
                    // check for new Entry
                    const members = obj.common.members;
                    for (const member of members) {
                        if (!this.bridge.ForeignBridgeMembers[member]) {
                            if (!member.startsWith(this.namespace)) {
                                await this.bridge?.discoverForeignRange(member);
                            } else {
                                this.log.warn(
                                    `The bridge enum is set within adapternamespace. please remove form id: ${member}`,
                                );
                            }
                            return;
                        }
                    }

                    // check for Entry removed
                    for (const member of Object.values(this.bridge.ForeignBridgeMembers)) {
                        if (!members.includes(member)) {
                            await this.bridge.discoverForeignRange(member, true);
                            return;
                        }
                    }
                }
            }
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param id ID of the changed state
     * @param state value and ack of the changed state
     */
    async onStateChange(id, state) {
        const activeFunction = 'onStateChange';
        try {
            if (state) {
                this.log.silly(
                    `the state ${id} has changed to ${state.val !== '' ? state.val : '""'} with ack = ${state.ack}.`,
                );
                // Update State in objectStore
                if (id.startsWith(this.namespace)) {
                    if (!id.startsWith(`${this.namespace}.info`) && !id.startsWith(`${this.namespace}.bridge`)) {
                        // Configuration and Downlink is updated with ack = false / true
                        // Other folders only in case of true
                        if (
                            id.includes(this.messagehandler?.directoryhandler.reachableSubfolders.configuration) ||
                            id.includes(this.messagehandler?.directoryhandler.reachableSubfolders.downlinkControl) ||
                            state.ack
                        ) {
                            await this.objectStore?.updateLoraWanObject(id, { payload: { state: state } });
                        }
                        // ToIob
                    } else if (id.startsWith(`${this.namespace}.bridge.devices`)) {
                        await this.objectStore?.updateToIobObject(id, { payload: { state: state } });
                    }
                } else {
                    if (this.bridge && (!id.startsWith(`0_userdata.`) || !id.startsWith(`alias.`) || state.ack)) {
                        if (this.objectStore?.bridge.currentIds[id]) {
                            this.objectStore.updateBridgeObject(id, { payload: { state: state } });
                        }
                    }
                }
                if (!state.ack) {
                    if (id.startsWith(this.namespace)) {
                        // Check for downlink in id
                        if (id.indexOf('.downlink.control.') !== -1) {
                            // get information of the changing state
                            const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
                            const suffix = this.downlinkConfighandler?.getDownlinkTopicSuffix(changeInfo?.changedState);
                            if (changeInfo?.changedState === 'push' || changeInfo?.changedState === 'replace') {
                                const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo, suffix);
                                try {
                                    if (JSON.parse(state.val)) {
                                        await this.sendDownlink(downlinkTopic, state.val, changeInfo);
                                        await this.bridge?.publishId(id, state.val, {});
                                        await this.setState(id, state.val, true);
                                    }
                                } catch (error) {
                                    this.log.warn(`Cant send invalid downlinks. Error: ${error}`);
                                }
                            } else if (changeInfo?.changedState === 'CustomSend') {
                                if (state.val !== '') {
                                    const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(
                                        changeInfo,
                                        suffix,
                                    );
                                    const downlinkConfig =
                                        this.downlinkConfighandler?.activeDownlinkConfigs[
                                            changeInfo.bestMatchForDeviceType
                                        ];
                                    /* Alte Zuweisung
                                    const stateValues  = state.val.split(',');
                                    const StateElements = {
                                        payloadInHex: stateValues [0].toUpperCase(),
                                        port: downlinkConfig.port,
                                        confirmed: downlinkConfig.confirmed,
                                        priority: downlinkConfig.priority,
                                        push: false,
                                    };
                                    // Assign writen values
                                    for (const element in stateValues ) {
                                        if (stateValues [element] === 'push') {
                                            StateElements.push = true;
                                            break;
                                        }
                                        if (element === '1') {
                                            StateElements.port = Number(stateValues [element]);
                                        } else if (element === '2') {
                                            StateElements.confirmed = stateValues [element] === 'true' ? true : false;
                                        } else if (element === '3') {
                                            StateElements.priority = Statevalues[element];
                                        }
                                    }
                                    */
                                    // Eingefügt am 09.12.2026
                                    const StateValues = state.val.split(',');

                                    const StateElements = {
                                        payloadInHex: null,
                                        port: downlinkConfig.port,
                                        confirmed: downlinkConfig.confirmed,
                                        priority: downlinkConfig.priority,
                                        push: false,
                                    };

                                    for (const raw of StateValues) {
                                        const element = raw.trim();

                                        // --- push ---
                                        if (element.toLowerCase() === 'push') {
                                            StateElements.push = true;
                                            continue;
                                        }

                                        // --- confirmed (boolean) ---
                                        if (element === 'true' || element === 'false') {
                                            StateElements.confirmed = element === 'true';
                                            continue;
                                        }

                                        // --- port (number) ---
                                        if (/^\d+$/.test(element)) {
                                            StateElements.port = Number(element);
                                            continue;
                                        }

                                        // --- payloadInHex: reiner Hex-String ---
                                        if (/^[0-9A-Fa-f]+$/.test(element)) {
                                            StateElements.payloadInHex = element.toUpperCase();
                                            continue;
                                        }

                                        // --- priority: alles, was kein reiner Hex-String ist ---
                                        if (/[^0-9A-Fa-f]/.test(element)) {
                                            StateElements.priority = element;
                                            continue;
                                        }
                                    }

                                    // Query about the correct type
                                    this.log.silly(
                                        'The following values are detected / used at input of custom send state',
                                    );
                                    for (const element in StateElements) {
                                        this.log.silly(
                                            `${element}: Type: ${typeof StateElements[element]} - Value: ${StateElements[element]}`,
                                        );
                                    }

                                    // write into NextSend or push directly
                                    if (!StateElements.push) {
                                        // Write into nextSend
                                        await this.writeNextSend(changeInfo, StateElements.payloadInHex);
                                    }
                                    if (
                                        !changeInfo?.bestMatchForDeviceType ||
                                        this.downlinkConfighandler?.activeDownlinkConfigs[
                                            changeInfo.bestMatchForDeviceType
                                        ].sendWithUplink === 'disabled' ||
                                        StateElements.push
                                    ) {
                                        const downlink = this.downlinkConfighandler?.getDownlink(
                                            {
                                                port: StateElements.port,
                                                confirmed: StateElements.confirmed,
                                                priority: StateElements.priority,
                                            },
                                            StateElements.payloadInHex,
                                            changeInfo,
                                        );
                                        if (downlink !== undefined) {
                                            await this.sendDownlink(
                                                downlinkTopic,
                                                JSON.stringify(downlink),
                                                changeInfo,
                                            );
                                        }
                                    }
                                }
                                await this.bridge?.publishId(id, state.val, {});
                                await this.setState(id, state.val, true);
                            } else {
                                const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo, suffix);
                                const downlinkParameter = this.downlinkConfighandler?.getDownlinkParameter(
                                    changeInfo,
                                    {},
                                );
                                if (downlinkParameter !== undefined) {
                                    const payloadInHex = this.downlinkConfighandler?.calculatePayloadInHex(
                                        downlinkParameter,
                                        state,
                                    );
                                    await this.writeNextSend(changeInfo, payloadInHex);
                                    if (
                                        !changeInfo?.bestMatchForDeviceType ||
                                        this.downlinkConfighandler?.activeDownlinkConfigs[
                                            changeInfo.bestMatchForDeviceType
                                        ].sendWithUplink === 'disabled'
                                    ) {
                                        const downlink = this.downlinkConfighandler?.getDownlink(
                                            downlinkParameter,
                                            payloadInHex,
                                            changeInfo,
                                        );
                                        if (downlink !== undefined) {
                                            await this.sendDownlink(
                                                downlinkTopic,
                                                JSON.stringify(downlink),
                                                changeInfo,
                                            );
                                        }
                                    }
                                    await this.bridge?.publishId(id, state.val, {});
                                    await this.setState(id, state.val, true);
                                }
                            }
                        } else if (id.includes('.nextSend.push')) {
                            if (state.val) {
                                await this.checkSendDownlinkWithUplink(id, { pushNextSend: true });
                                await this.setState(id, false, true);
                            }
                        } else if (id.indexOf('.configuration.') !== -1) {
                            // State is from the configuration path
                            const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
                            this.messagehandler?.fillWithDownlinkConfig(changeInfo?.objectStartDirectory, {});

                            // remove not configured states
                            const adapterObjects = await this.getAdapterObjectsAsync();
                            for (const adapterObject of Object.values(adapterObjects)) {
                                if (
                                    adapterObject.type === 'state' &&
                                    adapterObject._id.indexOf(
                                        `${changeInfo?.objectStartDirectory}.downlink.control`,
                                    ) !== -1
                                ) {
                                    const changeInfo = await this.getChangeInfo(adapterObject._id);
                                    const downlinkParameter = this.downlinkConfighandler?.getDownlinkParameter(
                                        changeInfo,
                                        {
                                            startupCheck: true,
                                        },
                                    );
                                    if (!downlinkParameter) {
                                        await this.delObjectAsync(this.removeNamespace(adapterObject._id));
                                    }
                                }
                            }
                            await this.setState(id, state.val, true);
                            // notification
                        } else if (id.endsWith('.bridge.notification')) {
                            const words = state.val.split(' ');
                            const hash = this.createHash(words[0], this.secret.salt);
                            if (hash === this.secret.hash) {
                                if (words[1] === 'mqtt') {
                                    this.extendObject('bridge.debug.topic', {
                                        type: 'state',
                                        common: {
                                            name: 'topic of mqtt message',
                                            type: 'string',
                                            read: true,
                                            write: true,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.payload', {
                                        type: 'state',
                                        common: {
                                            name: 'payload of mqtt message',
                                            type: 'string',
                                            role: 'json',
                                            read: true,
                                            write: true,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.send', {
                                        type: 'state',
                                        common: {
                                            name: 'payload of mqtt message',
                                            type: 'boolean',
                                            role: 'button',
                                            read: false,
                                            write: true,
                                            def: false,
                                        },
                                        native: {},
                                    });
                                    // Incoming
                                    this.extendObject('bridge.debug.incomingTopic', {
                                        type: 'state',
                                        common: {
                                            name: 'topic of mqtt message',
                                            type: 'string',
                                            read: true,
                                            write: false,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.incomingTopicFilter', {
                                        type: 'state',
                                        common: {
                                            name: 'filter for topic of mqtt message',
                                            type: 'string',
                                            read: true,
                                            write: true,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.incomingPayload', {
                                        type: 'state',
                                        common: {
                                            name: 'payload of mqtt message',
                                            type: 'string',
                                            role: 'json',
                                            read: true,
                                            write: false,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    // Outgoing
                                    this.extendObject('bridge.debug.outgoingTopic', {
                                        type: 'state',
                                        common: {
                                            name: 'topic of mqtt message',
                                            type: 'string',
                                            read: true,
                                            write: false,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.outgoingTopicFilter', {
                                        type: 'state',
                                        common: {
                                            name: 'filter for topic of mqtt message',
                                            type: 'string',
                                            read: true,
                                            write: true,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    this.extendObject('bridge.debug.outgoingPayload', {
                                        type: 'state',
                                        common: {
                                            name: 'payload of mqtt message',
                                            type: 'string',
                                            role: 'json',
                                            read: true,
                                            write: false,
                                            def: '',
                                        },
                                        native: {},
                                    });
                                    await this.setState(id, '', true);
                                } else if (words[1] === 'objectStore') {
                                    this.extendObject('bridge.debug.objecStore', {
                                        type: 'state',
                                        common: {
                                            name: 'topic of mqtt message',
                                            type: 'string',
                                            role: 'json',
                                            read: true,
                                            write: true,
                                            def: 'lorawan.applications, lorawan.devices, lorawan.currentIds',
                                        },
                                        native: {},
                                    });
                                    await this.setState(id, '', true);
                                }
                            } else {
                                let notificationId = `${this.namespace}.${this.bridge?.Words.notification}${this.bridge?.GeneralId}`;
                                await this.bridge?.publishNotification(
                                    notificationId,
                                    state.val,
                                    this.config.BridgenotificationActivation,
                                );
                                await this.setState(id, state.val, true);
                            }
                        } else if (id.endsWith('bridge.debug.incomingTopicFilter')) {
                            this.bridge?.bridgeMqttClient.setFilter('incoming', state.val);
                            await this.setState(id, state.val, true);
                        } else if (id.endsWith('bridge.debug.outgoingTopicFilter')) {
                            this.bridge?.bridgeMqttClient.setFilter('outgoing', state.val);
                            await this.setState(id, state.val, true);
                            // Send Topic and payload to bridge
                        } else if (id.endsWith('.bridge.debug.send')) {
                            const topic = await this.getStateAsync('bridge.debug.topic');
                            const payload = await this.getStateAsync('bridge.debug.payload');
                            if (topic && payload) {
                                await this.bridge?.bridgeMqttClient.publish(topic.val, payload.val, {});
                                await this.setState('bridge.debug.topic', topic.val, true);
                                await this.setState('bridge.debug.payload', payload.val, true);
                            }
                            await this.setState(id, false, true);
                            // get objectStore
                        } else if (id.endsWith('.bridge.debug.objecStore')) {
                            const words = state.val.split('.');
                            if (words[0] === 'lorawan') {
                                if (this.objectStore?.lorawan[words[1]]) {
                                    this.setState(id, JSON.stringify(this.objectStore.lorawan[words[1]]), true);
                                }
                            } else if (words[0] === 'bridge') {
                                if (this.objectStore?.bridge[words[1]]) {
                                    this.setState(id, JSON.stringify(this.objectStore.bridge[words[1]]), true);
                                }
                            } else if (words[0] === 'toIob') {
                                if (this.objectStore?.toIob[words[1]]) {
                                    this.setState(id, JSON.stringify(this.objectStore.toIob[words[1]]), true);
                                }
                            }
                        } else if (id.endsWith('.bridge.dataFromIob')) {
                            if (this.bridge) {
                                await this.setState(id, state.val, true);
                                await this.bridge.publishId(id, state.val, {});
                            }
                        } else if (id.startsWith(`${this.namespace}.bridge.devices.`)) {
                            if (!id.endsWith('discoveredEntities')) {
                                if (!id.endsWith('bridgeBaseIp')) {
                                    await this.bridge?.bridgeDeviceHandler.sendData(id, state);
                                }
                                await this.setState(id, state.val, true);
                            }
                        } else if (id.endsWith('bridge.debug.logtypes')) {
                            await this.setState(id, state.val, true);
                            this.logtypes = JSON.parse(await this.setDefIfEmptyAndReturnVal(id));
                        }
                    } else {
                        // Query for 0_userdata or alias => states also publish with ack = false
                        if (id.startsWith('0_userdata') || id.startsWith('alias')) {
                            await this.bridge?.publishId(id, state.val, {});
                        }
                    }
                } else {
                    // Query for Namespace => Just publish foreign States with ack = true
                    if (!id.startsWith(this.namespace)) {
                        await this.bridge?.publishId(id, state.val, {});
                    }
                }
            } else {
                // The state was deleted
                this.log.info(`state ${id} deleted`);
            }
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    async checkSendDownlinkWithUplink(id, options) {
        const activeFunction = 'main.js - checkSendDownlinkWithUplink';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            this.log.silly(`Check for send downlink with uplink.`);
            const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
            if (
                changeInfo &&
                changeInfo.bestMatchForDeviceType &&
                (this.downlinkConfighandler?.activeDownlinkConfigs[changeInfo.bestMatchForDeviceType].sendWithUplink !==
                    'disabled' ||
                    options?.pushNextSend)
            ) {
                const nextSend = await this.getNextSend(changeInfo?.objectStartDirectory);
                if (nextSend?.val !== '0') {
                    const suffix = this.downlinkConfighandler?.getDownlinkTopicSuffix('push');
                    const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo, suffix);
                    const downlinkConfig =
                        this.downlinkConfighandler?.activeDownlinkConfigs[changeInfo.bestMatchForDeviceType];
                    const downlink = this.downlinkConfighandler?.getDownlink(downlinkConfig, nextSend?.val, changeInfo);
                    if (downlink !== undefined) {
                        await this.sendDownlink(downlinkTopic, JSON.stringify(downlink), changeInfo);
                    }
                }
            }
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    async getNextSend(deviceDirectory) {
        const activeFunction = 'main.js - getNextSend';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            const idFolder = `${deviceDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
            return await this.getStateAsync(`${idFolder}.hex`);
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    async writeNextSend(changeInfo, payloadInHex) {
        const activeFunction = 'main.js - writeNextSend';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            const idFolderNextSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
            const stateId = `${idFolderNextSend}.hex`;

            // Serialize (also simply write without appending)
            await this.withLock(this.NextSendLocks, stateId, async () => {
                let toWrite = payloadInHex;
                if (
                    changeInfo.bestMatchForDeviceType &&
                    this.downlinkConfighandler?.activeDownlinkConfigs?.[changeInfo.bestMatchForDeviceType]
                        .sendWithUplink === 'enabled & collect'
                ) {
                    const nextSend = await this.getStateAsync(stateId);
                    if (nextSend?.val !== '0') {
                        toWrite = nextSend?.val + toWrite;
                    }
                }
                await this.setState(stateId, toWrite, true);
            });
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    // Serialize functions
    async withLock(locksMap, key, fn) {
        const activeFunction = 'main.js - withLock';
        this.log.silly(`Function ${activeFunction} started.`);
        const prev = locksMap.get(key) || Promise.resolve();

        // fn erst starten, wenn prev fertig ist (egal ob ok oder Fehler)
        const next = prev.then(
            () => Promise.resolve().then(fn),
            () => Promise.resolve().then(fn),
        );

        // stored wartet auf next, fängt aber Fehler intern ab (Kette reißt nicht)
        const stored = next.catch(() => {});
        locksMap.set(key, stored);

        try {
            // Ergebnis/Fehler an Aufrufer weitergeben
            return await next;
        } finally {
            // vorsichtig aufräumen: nur löschen, wenn kein neuer Job dazwischenkam
            if (locksMap.get(key) === stored) {
                locksMap.delete(key);
            }
        }
    }

    async sendDownlink(topic, message, changeInfo) {
        const activeFunction = 'main.js - sendDownlink';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            await this.mqttClient?.publish(topic, message, {});
            const idFolderNextSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
            const idFolderLastSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkLastSend}`;
            const nextSend = await this.getStateAsync(`${idFolderNextSend}.hex`);
            const lastSend = this.getHexpayloadFromDownlink(message);
            if (lastSend !== undefined) {
                await this.setState(`${idFolderLastSend}.hex`, lastSend, true);
                if (nextSend && lastSend === nextSend?.val) {
                    await this.setState(`${idFolderNextSend}.hex`, '0', true);
                }
            }
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    getHexpayloadFromDownlink(downlinkmessage) {
        const activeFunction = 'main.js - getHexPayloadFromDownlink';
        this.log.silly(`Function ${activeFunction} started.`);
        try {
            let downlink = downlinkmessage;
            if (typeof downlink === 'string') {
                downlink = JSON.parse(downlinkmessage);
            } else if (typeof downlink !== 'object') {
                return 0;
            }
            let payload = '';
            switch (this.config.origin) {
                case this.origin.ttn:
                    payload = downlink.downlinks[0].frm_payload;
                    break;

                case this.origin.chirpstack:
                    payload = downlink.data;
                    break;
            }
            return Buffer.from(payload, 'base64').toString('hex').toUpperCase();
        } catch (error) {
            this.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    getBaseDeviceInfo(id) {
        const activeFunction = 'getBaseDeviceInfo';
        try {
            id = this.removeNamespace(id);
            const idElements = id.split('.');
            const deviceInfo = {
                id,
                applicationId: idElements[0],
                deviceEUI: idElements[2],
                changedState: idElements[idElements.length - 1],
                objectStartDirectory: `${idElements[0]}.${idElements[1]}.${idElements[2]}`,
                allElements: idElements,
            };
            return deviceInfo;
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    async getChangeInfo(id, options) {
        const activeFunction = 'getChangeInfo';
        try {
            // Check for logging
            this.log[this.logtypes.getChangeInfo]?.(`changeinfo of id ${id}, will be generated.`);
            const changeInfo = this.getBaseDeviceInfo(id);
            // const myId = `${changeInfo?.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.configuration}.devicetype`; // commented out on: 26.01.2026 => Use objectStore
            // Check for changeInfo
            if (changeInfo) {
                // Get Object from start directory
                // const applicationDirectoryObject = await this.getObjectAsync(changeInfo.applicationId); // commented out on: 26.01.2026 => Use objectStore
                // const startDirectoryObject = await this.getObjectAsync(changeInfo.objectStartDirectory); // commented out on: 26.01.2026 => Use objectStore
                const applicationDirectoryObject =
                    this.objectStore?.lorawan.applications[changeInfo.applicationId].object;
                const startDirectoryObject = this.objectStore?.lorawan.devices[changeInfo.deviceEUI].object;
                if (applicationDirectoryObject && startDirectoryObject) {
                    changeInfo.applicationName = applicationDirectoryObject.native.applicationName;
                    changeInfo.usedApplicationName = applicationDirectoryObject.common.name;
                    changeInfo.deviceId = startDirectoryObject.native.deviceId;
                    changeInfo.usedDeviceId = startDirectoryObject.common.name;
                }
                // Get deviceType
                // const deviceTypeIdState = await this.getStateAsync(myId); // commented out on: 26.01.2026 => Use objectStore
                const deviceTypeIdState =
                    this.objectStore?.lorawan.devices[changeInfo.deviceEUI].informations.devicetype.state;
                if (deviceTypeIdState) {
                    changeInfo.deviceType = deviceTypeIdState.val;
                    if (options && options.withBestMatch) {
                        // Get the best match of expert downlink
                        const bestMatchForDeviceType =
                            this.downlinkConfighandler?.getBestMatchForDeviceType(changeInfo);
                        if (bestMatchForDeviceType) {
                            changeInfo.bestMatchForDeviceType = bestMatchForDeviceType;
                            this.log.silly(
                                `best match for expertconfig of device: ${changeInfo.deviceType ? changeInfo.deviceType : 'empty devicetype'} is: ${bestMatchForDeviceType}`,
                            );
                        } else {
                            this.log.silly(
                                `no match for expert downlinkconfig found: ${changeInfo.deviceType ? changeInfo.deviceType : 'empty devicetype'}`,
                            );
                        }
                    }
                }
            }
            this.log.silly(`changeinfo is ${JSON.stringify(changeInfo)}.`);
            return changeInfo;
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    removeNamespace(id) {
        if (id.indexOf(this.namespace) !== -1) {
            this.log.silly(`namespace will be removed from id ${id}.`);
            id = id.substring(this.namespace.length + 1, id.length);
        }
        return id;
    }

    // Get Changeinfo in case of device EUI (used more times in onMessage)
    async getChangeInfoFromDeviceEUI(deviceUI, subId = '') {
        let changeInfo = undefined;
        const adapterObjects = await this.getAdapterObjectsAsync();
        for (const adapterObject of Object.values(adapterObjects)) {
            if (adapterObject.type === 'device') {
                if (adapterObject._id.indexOf(deviceUI) !== -1) {
                    const sufix = subId !== '' ? `.${subId}` : '';
                    changeInfo = await this.getChangeInfo(`${adapterObject._id}${sufix}`);
                    break;
                }
            }
        }
        return changeInfo;
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over the message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */

    async onMessage(obj) {
        if (obj.command?.startsWith('dm:')) {
            // Handled by Device Manager class itself, so ignored here
            return;
        }
        const activeFunction = 'onMessage';
        this.log.silly(`message received: command = ${obj.command} - message = ${JSON.stringify(obj.message)}`);
        try {
            if (typeof obj === 'object' && obj.message) {
                let result = {};
                if (obj.command === 'getDeviceInfo') {
                    if (obj.message.deviceEUI) {
                        const changeInfo = await this.getChangeInfoFromDeviceEUI(
                            obj.message.deviceEUI,
                            `${this.messagehandler?.directoryhandler.reachableSubfolders.configuration}.devicetype`,
                        );
                        if (changeInfo) {
                            result = {
                                applicationId: changeInfo.applicationId,
                                applicationName: changeInfo.applicationName,
                                usedApplicationName: changeInfo.usedApplicationName,
                                deviceEUI: changeInfo.deviceEUI,
                                deviceId: changeInfo.deviceId,
                                usedDeviceId: changeInfo.usedDeviceId,
                                deviceType: changeInfo.deviceType,
                                received: obj.message,
                            };
                        } else {
                            result = { error: true, message: 'No device found', received: obj.message };
                        }
                    } else {
                        result = { error: true, message: 'No deviceEUI found', received: obj.message };
                    }
                    // Send response
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                } else if (obj.command === 'getUplink') {
                    if (obj.message.deviceEUI && obj.message.uplink) {
                        const folderAndUplinkId = obj.message.subfolder
                            ? `${this.messagehandler?.directoryhandler.reachableSubfolders.uplink}.${obj.message.subfolder}.${obj.message.uplink}`
                            : obj.message.uplink;
                        const changeInfo = await this.getChangeInfoFromDeviceEUI(
                            obj.message.deviceEUI,
                            folderAndUplinkId,
                        );
                        if (changeInfo) {
                            const uplinkId = changeInfo.id;
                            if (await this.objectExists(uplinkId)) {
                                const stateResult = await this.getStateAsync(changeInfo.id);
                                if (stateResult) {
                                    result = {
                                        applicationId: changeInfo.applicationId,
                                        applicationName: changeInfo.applicationName,
                                        usedApplicationName: changeInfo.usedApplicationName,
                                        deviceEUI: changeInfo.deviceEUI,
                                        deviceId: changeInfo.deviceId,
                                        usedDeviceId: changeInfo.usedDeviceId,
                                        deviceType: changeInfo.deviceType,
                                        value: stateResult.val,
                                        received: obj.message,
                                    };
                                }
                            } else {
                                result = { error: true, message: 'No uplink matches', received: obj.message };
                            }
                        } else {
                            result = { error: true, message: 'No device found', received: obj.message };
                        }
                    } else {
                        result = { error: true, message: 'No deviceEUI & uplink found', received: obj.message };
                    }
                    // Send response
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                } else if (obj.command === 'setDownlink') {
                    if (
                        obj.message.deviceEUI &&
                        obj.message.downlink &&
                        (obj.message.value || obj.message.value === false)
                    ) {
                        const changeInfo = await this.getChangeInfoFromDeviceEUI(
                            obj.message.deviceEUI,
                            `${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkControl}.${obj.message.downlink}`,
                        );
                        if (changeInfo) {
                            const downlinkId = changeInfo.id;
                            if (await this.objectExists(downlinkId)) {
                                // get Object to decide min and max value
                                const downlinkObject = await this.getObjectAsync(downlinkId);
                                if (downlinkObject) {
                                    // check typ number
                                    if (downlinkObject.common.type === 'number') {
                                        if (typeof obj.message.value === 'number') {
                                            // Check limit
                                            if (
                                                (!downlinkObject.common.min ||
                                                    obj.message.value >= downlinkObject.common.min) &&
                                                (!downlinkObject.common.max ||
                                                    obj.message.value <= downlinkObject.common.max)
                                            ) {
                                                await this.setState(downlinkId, obj.message.value);
                                                result = {
                                                    applicationId: changeInfo.applicationId,
                                                    applicationName: changeInfo.applicationName,
                                                    usedApplicationName: changeInfo.usedApplicationName,
                                                    deviceEUI: changeInfo.deviceEUI,
                                                    deviceId: changeInfo.deviceId,
                                                    deviceType: changeInfo.deviceType,
                                                    downlink: obj.message.downlink,
                                                    value: obj.message.value,
                                                    received: obj.message,
                                                };
                                            } else {
                                                result = {
                                                    error: true,
                                                    message: 'value is not in valid range',
                                                    received: obj.message,
                                                };
                                            }
                                        } else {
                                            result = {
                                                error: true,
                                                message: `downlink is type number, but received ${typeof obj.message.value}`,
                                                received: obj.message,
                                            };
                                        }
                                    } else {
                                        // downlinkobject is not a number
                                        if (downlinkObject.common.type !== typeof obj.message.value) {
                                            result = {
                                                error: true,
                                                message: `downlink is type ${downlinkObject.common.type}, but received ${typeof obj.message.value}`,
                                                received: obj.message,
                                            };
                                        } else {
                                            await this.setState(downlinkId, obj.message.value);
                                            result = {
                                                applicationId: changeInfo.applicationId,
                                                applicationName: changeInfo.applicationName,
                                                deviceEUI: changeInfo.deviceEUI,
                                                deviceId: changeInfo.deviceId,
                                                deviceType: changeInfo.deviceType,
                                                downlink: obj.message.downlink,
                                                value: obj.message.value,
                                                received: obj.message,
                                            };
                                        }
                                    }
                                }
                            } else {
                                result = { error: true, message: 'No downlink matches', received: obj.message };
                            }
                        } else {
                            result = { error: true, message: 'No device found', received: obj.message };
                        }
                    } else {
                        result = {
                            error: true,
                            message: 'No deviceEUI, downlink & value found',
                            received: obj.message,
                        };
                    }
                    // Send response
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                } else if (obj.command === 'getTopicConfigured') {
                    result = '';
                    let Separator = '';
                    switch (obj.message.separator) {
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
                    for (const element of obj.message.DeviceIdentifiers) {
                        if (result !== '') {
                            result += Separator;
                        }
                        result += element.DeviceIdentifier;
                    }
                    result = `${this.bridge?.bridgeMqttClient.BridgePrefix}${result}/state`;
                    // Send response
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                } else if (obj.command === 'getTopicExample') {
                    result = '';
                    let Separator = '';
                    switch (obj.message.separator) {
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
                    for (const element of obj.message.DeviceIdentifiers) {
                        if (result !== '') {
                            result += Separator;
                        }
                        result += this.messagehandler?.directoryhandler.HABridge.Dummy[element.DeviceIdentifier];
                    }
                    result = `${this.bridge?.bridgeMqttClient.BridgePrefix}${result}/state`;
                    // Send response
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }

                    // send application to config
                } else if (
                    obj.command === 'getApplicationsForConfig' ||
                    obj.command === 'getApplicationsForClimateConfig' ||
                    obj.command === 'getApplicationsForClimateModeConfig'
                ) {
                    try {
                        await this.runSerializedMessages(async () => {
                            let myCount = 0;
                            const applications = [];
                            if (obj.command === 'getApplicationsForConfig') {
                                applications[myCount] = { label: '* (Wildcard)', value: '*' };
                                myCount++;
                            } else if (obj.command === 'getApplicationsForClimateModeConfig') {
                                applications[myCount] = { label: '* Not Present (Virtual)', value: 'NotPresent' };
                                myCount++;
                            }
                            const currentApplications = {};
                            const adapterObjects = await this.getAdapterObjectsCached();
                            for (const adapterObject of Object.values(adapterObjects)) {
                                if (adapterObject.type === 'folder' && adapterObject._id.endsWith('uplink')) {
                                    adapterObject._id = this.removeNamespace(adapterObject._id);
                                    const changeInfo = await this.getChangeInfoCached(adapterObject._id);
                                    const label = changeInfo?.usedApplicationName;
                                    const value = changeInfo?.applicationId;
                                    if (!currentApplications[value]) {
                                        currentApplications[value] = value;
                                        applications[myCount] = { label: label, value: value };
                                        myCount++;
                                    }
                                }
                            }
                            applications.sort(this.sortByLabel);
                            this.sendTo(obj.from, obj.command, applications, obj.callback);
                        });
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getDevicesForConfig' || obj.command === 'getDevicesForClimateConfig') {
                    try {
                        await this.runSerializedMessages(async () => {
                            let myCount = 0;
                            const devices = [];
                            if (obj.command === 'getDevicesForConfig') {
                                devices[myCount] = { label: '* (Wildcard)', value: '*' };
                                myCount++;
                            }
                            const adapterObjects = await this.getAdapterObjectsCached();
                            for (const adapterObject of Object.values(adapterObjects)) {
                                if (
                                    adapterObject.type === 'folder' &&
                                    (adapterObject._id.includes(obj.message.application) ||
                                        obj.message.application === '*') &&
                                    adapterObject._id.endsWith('uplink')
                                ) {
                                    adapterObject._id = this.removeNamespace(adapterObject._id);
                                    const changeInfo = await this.getChangeInfoCached(adapterObject._id);
                                    const label = changeInfo?.usedDeviceId;
                                    const value = changeInfo?.deviceEUI;
                                    devices[myCount] = { label: label, value: value };
                                    myCount++;
                                }
                            }
                            devices.sort(this.sortByLabel);
                            this.sendTo(obj.from, obj.command, devices, obj.callback);
                        });
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getFoldersForConfig') {
                    try {
                        await this.runSerializedMessages(async () => {
                            const devices = [
                                { label: '* (Wildcard)', value: '*' },
                                { label: 'uplink.decoded', value: 'uplink.decoded' },
                                { label: 'downlink.control', value: 'downlink.control' },
                            ];
                            this.sendTo(obj.from, obj.command, devices, obj.callback);
                        });
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getStatesForConfig' || obj.command === 'getStatesForClimateConfig') {
                    try {
                        await this.runSerializedMessages(async () => {
                            let myCount = 0;
                            const states = [];
                            const possibleTypes = { state: true };
                            if (obj.command === 'getStatesForConfig') {
                                states[myCount] = { label: '* (Wildcard)', value: '*' };
                                myCount++;
                                possibleTypes.folder = true;
                            }
                            const currentStates = {};
                            const adapterObjects = await this.getAdapterObjectsCached();
                            for (const adapterObject of Object.values(adapterObjects)) {
                                if (
                                    possibleTypes[adapterObject.type] === true &&
                                    (adapterObject._id.includes(obj.message.application) ||
                                        obj.message.application === '*') &&
                                    (adapterObject._id.includes(obj.message.device) || obj.message.device === '*') &&
                                    (adapterObject._id.includes(obj.message.folder) ||
                                        (obj.message.folder === '*' &&
                                            (adapterObject._id.includes('uplink.decoded') ||
                                                adapterObject._id.includes('downlink.control'))))
                                ) {
                                    //adapterObject._id = this.removeNamespace(adapterObject._id); remooved 30.122025
                                    const changeInfo = await this.getChangeInfoCached(adapterObject._id);
                                    //if uplink decoded => changed State with folder
                                    let fullStateName = changeInfo?.changedState;
                                    if (changeInfo?.allElements.length > 6) {
                                        fullStateName = '';
                                        for (let i = 5; i < changeInfo?.allElements.length; i++) {
                                            if (fullStateName !== '') {
                                                fullStateName += '.';
                                            }
                                            fullStateName += changeInfo?.allElements[i];
                                        }
                                    }
                                    if (adapterObject.type === 'folder') {
                                        fullStateName += '.';
                                    }
                                    const label = fullStateName;
                                    const value = fullStateName;
                                    if (!currentStates[value]) {
                                        currentStates[value] = value;
                                        states[myCount] = { label: label, value: value };
                                        myCount++;
                                    }
                                }
                            }
                            states.sort(this.sortByLabel);
                            this.sendTo(obj.from, obj.command, states, obj.callback);
                        });
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getDiscoveredIds') {
                    try {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            this.config.BridgeType !== 'off'
                                ? JSON.stringify(this.bridge?.DiscoveredIds, null, 2)
                                : this.i18nTranslation['NoBridgeConfiged'],
                            obj.callback,
                        );
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getPublishedIds') {
                    try {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            this.config.BridgeType !== 'off'
                                ? JSON.stringify(this.bridge?.PublishedIds, null, 2)
                                : this.i18nTranslation['NoBridgeConfiged'],
                            obj.callback,
                        );
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getSubscribedTopics') {
                    try {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            this.config.BridgeType !== 'off'
                                ? JSON.stringify(this.bridge?.SubscribedTopics, null, 2)
                                : this.i18nTranslation['NoBridgeConfiged'],
                            obj.callback,
                        );
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getDeviceinformations') {
                    try {
                        this.sendTo(
                            obj.from,
                            obj.command,
                            JSON.stringify(this.messagehandler?.deviceinformations, null, 2),
                            obj.callback,
                        );
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getEnums') {
                    try {
                        const enums = [{ label: 'No Enum selected', value: '*' }];
                        const enumList = await this.getEnumsAsync();
                        for (const enumTyp of Object.values(enumList)) {
                            for (const myEnum of Object.values(enumTyp)) {
                                const value = myEnum._id;
                                let label = myEnum.common.name;
                                if (typeof label !== 'string') {
                                    if (this.language) {
                                        label = myEnum.common.name[this.language];
                                    }
                                }
                                label += ` (${myEnum._id.substring(5, myEnum._id.length)})`;
                                enums.push({ label: label.toString(), value: value });
                            }
                        }
                        this.sendTo(obj.from, obj.command, enums, obj.callback);
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'getBridgeConnection') {
                    try {
                        let connection = false;
                        const mqttPrefix = obj.message.Bridgessl ? 'mqtts://' : 'mqtt://';
                        const testclient = mqtt.connect(`${mqttPrefix}${obj.message.BridgeipUrl}`, {
                            port: obj.message.Bridgeport,
                            username: obj.message.Bridgeusername,
                            password: obj.message.Bridgepassword,
                            clientId: `iobroker_${this.namespace}.bridgeTest`,
                        });
                        testclient.on('connect', async () => {
                            connection = true;
                        });
                        setTimeout(() => {
                            testclient.end();
                            this.sendTo(
                                obj.from,
                                obj.command,
                                {
                                    result: connection
                                        ? this.i18nTranslation['connection to bridge ok']
                                        : this.i18nTranslation['no connection to bridge'],
                                },
                                obj.callback,
                            );
                        }, 100);
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else if (obj.command === 'sendMQTTMessage') {
                    try {
                        this.log.error(`Error by ${obj.command}: ${typeof obj.message.Topic}`);
                        this.log.error(typeof obj.message.Message);
                        this.sendTo(obj.from, obj.command, { result: 'OK' }, obj.callback);
                    } catch (error) {
                        this.log.error(`Error by command ${obj.command}: ${error}`);
                    }
                } else {
                    const result = { error: true, message: 'No message matched', received: obj.message };
                    if (obj.callback) {
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                    }
                }
            }
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    sortByLabel(a, b) {
        if (a.label < b.label) {
            return -1;
        }
        return 1;
    }

    async getConnectionInfo() {
        if (this.config.origin === 'off' || this.mqttClient?.internalConnectionstate) {
            if (this.config.BridgeType === 'off' || this.bridge?.bridgeMqttClient?.internalConnectionstate) {
                return true;
            }
        }
        return false;
    }

    async runSerializedMessages(fn) {
        const run = async () => fn();

        // Queue verlängern
        const next = this._configQueue.then(run, run);

        // Queue immer weiterführen, Fehler schlucken
        this._configQueue = next.catch(() => {});

        return next;
    }

    async getChangeInfoCached(id) {
        const now = Date.now();

        const cached = this._changeInfoCache.get(id);
        if (cached && cached.expires > now) {
            return cached.value;
        }

        const value = await this.getChangeInfo(id);
        this._changeInfoCache.set(id, {
            value,
            expires: now + 30_000, // 10 Sekunden
        });

        return value;
    }

    async getAdapterObjectsCached() {
        const now = Date.now();

        if (this._adapterObjectsCache && this._adapterObjectsCache.expires > now) {
            return this._adapterObjectsCache.value;
        }

        const value = await this.getAdapterObjectsAsync();

        this._adapterObjectsCache = {
            value,
            expires: now + 30_000, // z.B. 30s
        };

        return value;
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param [options] options of the adapter
     */
    module.exports = options => new Lorawan(options);
} else {
    // otherwise start the instance directly
    new Lorawan();
}
