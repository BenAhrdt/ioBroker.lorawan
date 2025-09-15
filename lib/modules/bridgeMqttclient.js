const mqtt = require('mqtt');
/**
 * this class handles the mqtt client for the adapter
 */
class bridgeMqttClientClass {
    /**
     * @param adapter adapterdate (eg. fo logging)
     * @param settings settings of the client (eg. port etc.)
     */
    constructor(adapter, settings) {
        this.adapter = adapter;
        this.mqttprefix = settings.Bridgessl ? 'mqtts://' : 'mqtt://';
        this.client = mqtt.connect(`${this.mqttprefix}${settings.BridgeipUrl}`, {
            port: settings.Bridgeport,
            username: settings.Bridgeusername,
            password: settings.Bridgepassword,
            clientId: `iobroker_${this.adapter.namespace}.bridge`,
        });

        // Prefix for publish and subscrip
        this.BridgePrefix = `${this.adapter.namespace}/`.replace(/\./g, '_');

        // Variables for correct connection (disconnection) notification / logging
        this.internalConnectionstate = false;
        this.errorCountdown = 0;
        this.numberOfErrorsToLog = 10;

        this.client.on('connect', async () => {
            if (!this.internalConnectionstate) {
                this.adapter.log.info(`Connection to Bridge is active.`);
            }
            this.adapter.setState('info.bridgeConnection', true, true);
            this.internalConnectionstate = true;
            this.errorCountdown = this.numberOfErrorsToLog;

            // Start subscribing
            this.client.subscribe(this.getSubscribtionArray(), err => {
                if (err) {
                    this.adapter.log.error(`On subscribe: ${err}`);
                }
            });

            await this.adapter.bridge.checkAllStatesForBridgeWork({ forceDiscovery: true });
            this.adapter.bridge.createScheduleJobs();
            if (this.adapter.config.notificationActivation === 'notification') {
                this.adapter.registerNotification(
                    'lorawan',
                    'Bridge connected',
                    this.adapter.i18nTranslation['connection to bridge is activ'],
                );
            }
            const notificationId = `${this.adapter.bridge.Words.notification}${this.adapter.bridge.GeneralId}`;
            await this.adapter.bridge?.publishNotification(
                notificationId,
                this.adapter.i18nTranslation['connection to bridge is activ'],
                this.adapter.bridge?.Notificationlevel.bridgeConnection,
                false,
            );
        });

        this.client.on('disconnect', () => {
            if (this.internalConnectionstate) {
                this.adapter.setState('info.bridgeConnection', false, true);
                this.internalConnectionstate = false;
                this.adapter.log.info(`Bridge disconnected`);
                this.adapter.bridge.clearAllSchedules();
            }
        });
        this.client.on('error', err => {
            if (this.errorCountdown === 0) {
                this.adapter.log.error(`${err}`);
                this.errorCountdown = this.numberOfErrorsToLog;
            } else {
                this.errorCountdown--;
            }
        });

        this.client.on('close', () => {
            if (this.internalConnectionstate) {
                this.adapter.log.info(`Connection to Bridge is closed.`);
            }
            this.adapter.setState('info.bridgeConnection', false, true);
            if (this.adapter.config.notificationActivation === 'notification') {
                this.adapter.registerNotification(
                    'lorawan',
                    'Bridge disconnected',
                    this.adapter.i18nTranslation['connection to bridge is closed'],
                );
            }
            this.internalConnectionstate = false;
        });

        this.client.on('message', async (topic, message) => {
            this.adapter.log.debug(`incomming bridge topic: ${topic}`);
            this.adapter.log.debug(`incomming bridge message: ${message}`);

            let payload = message.toString('utf8');
            // Message Parsen => Wenn nicht pasebar, dann string weitergeben
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                payload = JSON.parse(message);
            } catch {
                this.adapter.log.debug(`The Message ${message} is not parsabele. Work with string`);
            }
            await this.adapter.bridge.handleMessage(topic, payload);
        });
    }
    /**
     * @param topic topic of the message
     * @param message message to the LoRaWAN device
     * @param opt optional data
     */
    async publish(topic, message, opt) {
        this.adapter.log.debug(`Publishing bridge topic: ${topic} with message: ${message}.`);
        await this.client.publishAsync(topic, message, opt);
    }

    /**
     * shut down the mqtt client
     */
    destroy() {
        this.client.end();
    }

    /**
     * get subscribtionarray
     */
    getSubscribtionArray() {
        // Subscribe to the ending of set (with different counts of sublevels 2 -10)
        return [`${this.BridgePrefix}+/+/set`];
    }
}

module.exports = bridgeMqttClientClass;
