'use strict';

/*
 * Created with @iobroker/create-adapter v2.6.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const mqttClientClass = require('./lib/modules/mqttclient');
const messagehandlerClass = require('./lib/modules/messagehandler');
const downlinkConfighandlerClass = require('./lib/modules/downlinkConfighandler');

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
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.origin = {
            ttn: 'ttn',
            chirpstack: 'chirpstack',
        };

        // Simulation variables
        this.simulation = {};
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        const activeFunction = 'onReady';
        try {
            // create downlinkConfigs
            this.downlinkConfighandler = new downlinkConfighandlerClass(this);

            // Merge the configed and standard profile of downlinks
            await this.downlinkConfighandler.addAndMergeDownlinkConfigs();

            // create new messagehandler
            this.messagehandler = new messagehandlerClass(this);

            // Set all mqtt clients
            this.mqttClient = new mqttClientClass(this, this.config);

            // generate new configed downlinkstates on allready existing devices at adapter startup
            await this.messagehandler.generateDownlinksAndRemoveStatesAtStatup();

            // generate deviceinfo of all devices in info folder
            await this.messagehandler.generateDeviceinfosAtStartup();

            // get history instances at Startup
            await this.messagehandler.setCustomObjectAtStartup();

            //Subscribe all configuration and control states
            this.subscribeStatesAsync('*');
            this.log.silly(`the adapter starts with downlinkconfigs: ${JSON.stringify(this.config.downlinkConfig)}.`);
            this.log.silly(
                `the active downlinkconfigs are: ${JSON.stringify(this.downlinkConfighandler.activeDownlinkConfigs)}`,
            );
            /*
            setTimeout(async () => {
                await this.startSimulation();
            }, 5000);
            */
            /*this.simulation.timeout = setTimeout(async () => {
				const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/f1c0ae0e-b4a2-4547-b360-7cfa15e85734/command/down";
				const message = {devEui:"f1c0ae0e-b4a2-4547-b360-7cfa15e85734",confirmed:false,fPort:1,data:"AAA"};
				await this.mqttClient?.publish(topic,JSON.stringify(message));
			}, 5000);*/
        } catch (error) {
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
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

        // Chipstack
        const topic = 'application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/event/up';
        const message = {
            deduplicationId: '96e4a065-ad5e-402d-a997-7b261072a33c',
            time: '2024-01-21T17:01:36.641008+00:00',
            deviceInfo: {
                tenantId: '52f14cd4-c6f1-4fbd-8f87-4025e1d49242',
                tenantName: 'ChirpStack',
                applicationId: 'd63c10b6-9263-4ab3-9299-4308fa19a2ad',
                applicationName: 'Benjamin Schmidt',
                deviceProfileId: '0b46400f-37ec-4f17-8005-168b06159347',
                deviceProfileName: 'Dragino Feuchtesenor',
                deviceName: 'Skimmer',
                devEui: 'a84041f621857cd2',
                deviceClassEnabled: 'CLASS_A',
                tags: {},
            },
            devAddr: '01fd9738',
            adr: true,
            dr: 5,
            fCnt: 2,
            fPort: 2,
            confirmed: false,
            data: 'DPYBAAD//wAA',
            object: {
                Test: { zweite: { dritte: { a: 4 } } },
                soilconductivity: 0.0,
                soiltemperature: -0.1,
                volt: 3.318,
                soilmoisture: 0.0,
            },
            rxInfo: [
                {
                    gatewayId: '50303541b0344750',
                    uplinkId: 39169,
                    gwTime: '2024-01-21T17:01:36.641008+00:00',
                    nsTime: '2024-01-21T17:01:37.695656999+00:00',
                    rssi: -89,
                    snr: 6.25,
                    rfChain: 1,
                    location: { latitude: 50.69344693065449, longitude: 8.476783633232118 },
                    context: 'qESemw==',
                    metadata: { region_config_id: 'eu868', region_common_name: 'EU868' },
                    crcStatus: 'CRC_OK',
                },
            ],
            txInfo: {
                frequency: 868100000,
                modulation: { lora: { bandwidth: 125000, spreadingFactor: 7, codeRate: 'CR_4_5' } },
            },
        };
        //const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/command/down";
        //const message = {"devEui":"a84041f621857cd2","confirmed":false,"fPort":1,"data":"AQAqMA=="};

        // Chirpstack LT222222
        //const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a8404127a188d826/event/up";
        //const message = {"deduplicationId":"bd3fdb3b-af86-4617-b9f2-da07075d2bc5","time":"2024-01-24T16:47:01.573381+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"d63c10b6-9263-4ab3-9299-4308fa19a2ad","applicationName":"Benjamin Schmidt","deviceProfileId":"f1c0ae0e-b4a2-4547-b360-7cfa15e85734","deviceProfileName":"Dragino LT22222","deviceName":"Relaistestgerät","devEui":"a8404127a188d826","deviceClassEnabled":"CLASS_C","tags":{}},"devAddr":"01dfbaf2","adr":true,"dr":5,"fCnt":12,"fPort":2,"confirmed":false,"data":"AAAAAAAAAAA8/0E=","object":{"RO1_status":"OFF","DO2_status":"H","ACI2_mA":0.0,"DO1_status":"H","Hardware_mode":"LT22222","RO2_status":"OFF","AVI2_V":0.0,"ACI1_mA":0.0,"DI1_status":"H","DI2_status":"H","Work_mode":"2ACI+2AVI","AVI1_V":0.0},"rxInfo":[{"gatewayId":"50303541b0344750","uplinkId":57857,"gwTime":"2024-01-24T16:47:01.573381+00:00","nsTime":"2024-01-24T16:47:02.370171527+00:00","rssi":-54,"snr":8.5,"channel":6,"location":{"latitude":50.69344693065449,"longitude":8.476783633232118},"context":"2tr9BA==","metadata":{"region_config_id":"eu868","region_common_name":"EU868"},"crcStatus":"CRC_OK"}],"txInfo":{"frequency":867700000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}}};
        //const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a8404127a188d826/command/down";
        //const message = {"devEui":"a8404127a188d826","confirmed":false,"fPort":1,"data":"AQACWA=="};

        // ACK
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/ack";
        //const message = {"deduplicationId":"b080c0d8-6151-4675-84b8-74ecf9e33bae","time":"2023-08-15T13:22:27.969901+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"queueItemId":"3434298f-2b89-49f8-885e-9fdd9f0892e6","acknowledged":true,"fCntDown":262};

        // TXACK
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/txack";
        //const message = {"downlinkId":2478630510,"time":"2024-01-27T11:50:04.736655452+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"queueItemId":"efc2bacf-d5da-48d3-a6ef-2a77fda41bd0","fCntDown":4940,"gatewayId":"50313953530a4750","txInfo":{"frequency":868300000,"power":16,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5","polarizationInversion":true}},"timing":{"delay":{"delay":"1s"}},"context":"eqFuiw=="}};

        // STATUS
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/status";
        //const message = {"deduplicationId":"4a91b00d-b5e1-4955-b085-ba21b9318213","time":"2024-01-26T20:18:45.299871+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"margin":7,"externalPowerSource":false,"batteryLevelUnavailable":false,"batteryLevel":85.826775};

        // UP
        //const topic = "application/e91e66ba-1aa7-4bdf-af88-f1246e0b8d75/device/a84041263188b787/event/up";
        //const message = {"deduplicationId":"ce1ca35d-35c7-4f60-844c-c2b2810fd74b","time":"2024-08-25T07:10:47.758298+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"e91e66ba-1aa7-4bdf-af88-f1246e0b8d75","applicationName":"Türen","deviceProfileId":"431c5895-68e2-478d-945f-f0e9a6f5f9f5","deviceProfileName":"Dragino Türsensoren / Fenstersensoren","deviceName":"Flurtüre","devEui":"a84041263188b787","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"0061ebd4","adr":true,"dr":5,"fCnt":8264,"fPort":10,"confirmed":false,"data":"DAYBAA+IAAAAAA==","object":{"ALARM":0.0,"BAT_V":3.078,"CONTACT":true,"OPEN_TIMES":3976.0,"MOD":1.0,"LAST_OPEN_DURATION":0.0,"OPEN":false,"devicetype":"Dragino"},"rxInfo":[{"gatewayId":"503035416e314750","uplinkId":64001,"gwTime":"2024-08-25T07:10:47.758298+00:00","nsTime":"2024-08-25T07:11:29.787667701+00:00","rssi":-68,"snr":9.25,"channel":6,"location":{"latitude":50.69350130173554,"longitude":8.476821184158327},"context":"fp1WbA==","metadata":{"region_common_name":"EU868","region_config_id":"eu868"},"crcStatus":"CRC_OK"}],"txInfo":{"frequency":867700000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}}};

        // LOG
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/up";
        //const message = {"time":"2024-01-27T10:29:58.221817559+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"level":"ERROR","code":"UPLINK_CODEC","description":"Exception generated by quickjs","context":{"deduplication_id":"c44e7e25-09ce-4c95-b96f-5a298c5c6440"}};

        // JOIN
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/event/join";
        //const message = {"deduplicationId":"44cef56d-1b8d-45fc-a762-03b98b620db2","time":"2023-12-12T03:13:21.551178+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915","applicationName":"Mclimate_Vicki","deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8","deviceProfileName":"Mclimate_Vicki","deviceName":"MClimate_Vicki_Heizkoerperventil_001","devEui":"70b3d52dd300ed31","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"01009400"};

        // DOWN
        //const topic = "application/59bcc5a7-59e2-4481-9615-fc4e58791915/device/70b3d52dd300ed31/command/down";
        //const message = {"devEui": "70b3d52dd300ed31", "confirmed": false,"fPort": 1,"data": "DQEYDQEY"};

        await this.messagehandler?.handleMessage(topic, message);
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback function wich is called after shutdown adapter
     */
    onUnload(callback) {
        try {
            // clear timeout (for simulation)
            if (this.simulation.timeout) {
                this.clearTimeout(this.simulation.timeout);
                delete this.simulation.timeout;
            }

            // Clear Schedules im directoriehandler
            this.messagehandler?.clearAllSchedules();

            // Destroy mqtt client
            this.mqttClient?.destroy();
            callback();
        } catch (e) {
            this.log.error(e);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    // 	if (obj) {
    // 		// The object was changed
    // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    // 	} else {
    // 		// The object was deleted
    // 		this.log.info(`object ${id} deleted`);
    // 	}
    // }

    /**
     * Is called if a subscribed state changes
     *
     * @param id id of the chaned state
     * @param state value and ack of the chanedf state
     */
    async onStateChange(id, state) {
        const activeFunction = 'onStateChange';
        try {
            if (state) {
                //this.log.silly(`state ${id} changed: val: ${state.val} - ack: ${state.ack}`);
                // The state was changed => only states with ack = false will be processed, others will be ignored
                if (!state.ack) {
                    // Check for downlink in id
                    if (id.indexOf('.downlink.control.') !== -1) {
                        this.log.silly(`the state ${id} has changed to ${state.val}.`);
                        // get information of the changing state
                        const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
                        const suffix = this.downlinkConfighandler?.getDownlinkTopicSuffix(changeInfo?.changedState);
                        if (changeInfo?.changedState === 'push' || changeInfo?.changedState === 'replace') {
                            const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo, suffix);
                            try {
                                if (JSON.parse(state.val)) {
                                    await this.sendDownlink(downlinkTopic, state.val, changeInfo);
                                    this.setState(id, state.val, true);
                                }
                            } catch (error) {
                                this.log.warn(`Cant send invalid downlinks. Error: ${error}`);
                            }
                        } else {
                            const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo, suffix);
                            const downlinkParameter = this.downlinkConfighandler?.getDownlinkParameter(changeInfo, {});
                            if (downlinkParameter !== undefined) {
                                const payloadInHex = this.downlinkConfighandler?.calculatePayloadInHex(
                                    downlinkParameter,
                                    state,
                                );
                                await this.writeNextSend(changeInfo, payloadInHex);
                                if (
                                    !changeInfo?.bestMatchForDeviceType ||
                                    this.downlinkConfighandler?.activeDownlinkConfigs[changeInfo.bestMatchForDeviceType]
                                        .sendWithUplink === 'disabled'
                                ) {
                                    const downlink = this.downlinkConfighandler?.getDownlink(
                                        downlinkParameter,
                                        payloadInHex,
                                        changeInfo,
                                    );
                                    if (downlink !== undefined) {
                                        await this.sendDownlink(downlinkTopic, JSON.stringify(downlink), changeInfo);
                                    }
                                }
                                this.setState(id, state.val, true);
                            }
                        }
                    } else if (id.indexOf('.configuration.') !== -1) {
                        // State is from configuration path
                        const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
                        this.messagehandler?.fillWithDownlinkConfig(changeInfo?.objectStartDirectory, {});

                        // remove not configed states
                        const adapterObjects = await this.getAdapterObjectsAsync();
                        for (const adapterObject of Object.values(adapterObjects)) {
                            if (
                                adapterObject.type === 'state' &&
                                adapterObject._id.indexOf(`${changeInfo?.objectStartDirectory}.downlink.control`) !== -1
                            ) {
                                const changeInfo = await this.getChangeInfo(adapterObject._id);
                                const downlinkParameter = this.downlinkConfighandler?.getDownlinkParameter(changeInfo, {
                                    startupCheck: true,
                                });
                                if (!downlinkParameter) {
                                    await this.delObjectAsync(this.removeNamespace(adapterObject._id));
                                }
                            }
                        }
                        this.setState(id, state.val, true);
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

    async checkSendDownlinkWithUplink(id) {
        const activeFunction = 'checkSendDownlinkWithUplink';
        try {
            this.log.silly(`Check for send downlink with uplink.`);
            const changeInfo = await this.getChangeInfo(id, { withBestMatch: true });
            if (
                changeInfo &&
                changeInfo.bestMatchForDeviceType &&
                this.downlinkConfighandler?.activeDownlinkConfigs[changeInfo.bestMatchForDeviceType].sendWithUplink !==
                    'disabled'
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
            this.log.error(`error at ${activeFunction}: ${error}`);
        }
    }

    async getNextSend(deviceDirectory) {
        const idFolder = `${deviceDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
        return await this.getStateAsync(`${idFolder}.hex`);
    }

    async writeNextSend(changeInfo, payloadInHex) {
        const idFolderNextSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
        if (
            changeInfo.bestMatchForDeviceType &&
            this.downlinkConfighandler?.activeDownlinkConfigs[changeInfo.bestMatchForDeviceType].sendWithUplink ===
                'enabled & collect'
        ) {
            const nextSend = await this.getStateAsync(`${idFolderNextSend}.hex`);
            if (nextSend?.val !== '0') {
                payloadInHex = nextSend?.val + payloadInHex;
            }
        }
        await this.setState(`${idFolderNextSend}.hex`, payloadInHex, true);
    }

    async sendDownlink(topic, message, changeInfo) {
        await this.mqttClient?.publish(topic, message, {});
        const idFolderNextSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkNextSend}`;
        const idFolderLastSend = `${changeInfo.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.downlinkLastSend}`;
        const nextSend = await this.getStateAsync(`${idFolderNextSend}.hex`);
        const lastSend = this.getHexpayloadFromDownlink(message);
        await this.setState(`${idFolderLastSend}.hex`, lastSend, true);
        if (nextSend && lastSend === nextSend?.val) {
            await this.setState(`${idFolderNextSend}.hex`, '0', true);
        }
    }

    getHexpayloadFromDownlink(downlinkmessage) {
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
    }

    getBaseDeviceInfo(id) {
        const activeFunction = 'getBaseDeviceInfo';
        try {
            id = this.removeNamespace(id);
            const idElements = id.split('.');
            const deviceInfo = {
                id: id,
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
            this.log.silly(`changeinfo of id ${id}, will be generated.`);
            const changeInfo = this.getBaseDeviceInfo(id);
            const myId = `${changeInfo?.objectStartDirectory}.${this.messagehandler?.directoryhandler.reachableSubfolders.configuration}.devicetype`;
            // Check for changeInfo
            if (changeInfo) {
                // Get Obect from startdirectory
                const applicationDirectoryObject = await this.getObjectAsync(changeInfo.applicationId);
                const startDirectoryObject = await this.getObjectAsync(changeInfo.objectStartDirectory);
                if (applicationDirectoryObject && startDirectoryObject) {
                    changeInfo.applicationName = applicationDirectoryObject.native.applicationName;
                    changeInfo.usedApplicationName = applicationDirectoryObject.common.name;
                    changeInfo.deviceId = startDirectoryObject.native.deviceId;
                    changeInfo.usedDeviceId = startDirectoryObject.common.name;
                }
                // Get deviceType
                const deviceTypeIdState = await this.getStateAsync(myId);
                if (deviceTypeIdState) {
                    changeInfo.deviceType = deviceTypeIdState.val;
                    if (options && options.withBestMatch) {
                        // Get best match of expert downlink
                        const bestMatchForDeviceType =
                            this.downlinkConfighandler?.getBestMatchForDeviceType(changeInfo);
                        if (bestMatchForDeviceType) {
                            changeInfo.bestMatchForDeviceType = bestMatchForDeviceType;
                            this.log.debug(
                                `best match for expertconfig of device: ${changeInfo.deviceType ? changeInfo.deviceType : 'empty devicetype'} is: ${bestMatchForDeviceType}`,
                            );
                        } else {
                            this.log.debug(
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
    async getChangeInfoFromDeviceEUI(deviceUI, subId) {
        let changeInfo = undefined;
        const adapterObjects = await this.getAdapterObjectsAsync();
        for (const adapterObject of Object.values(adapterObjects)) {
            if (adapterObject.type === 'device') {
                if (adapterObject._id.indexOf(deviceUI) !== -1) {
                    changeInfo = await this.getChangeInfo(`${adapterObject._id}.${subId}`);
                    break;
                }
            }
        }
        return changeInfo;
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */

    async onMessage(obj) {
        const activeFunction = 'onMessage';
        this.log.debug(`message received: command = ${obj.command} - message = ${JSON.stringify(obj.message)}`);
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
