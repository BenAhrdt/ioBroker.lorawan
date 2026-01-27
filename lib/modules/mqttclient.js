const mqtt = require('mqtt');
/**
 * this class handles the mqtt client for the adapter
 */
class mqttClientClass {
    /**
     * @param adapter adapterdate (eg. fo logging)
     * @param settings settings of the client (eg. port etc.)
     */
    constructor(adapter, settings) {
        this.adapter = adapter;
        this.mqttprefix = settings.ssl ? 'mqtts://' : 'mqtt://';
        this.client = mqtt.connect(`${this.mqttprefix}${settings.ipUrl}`, {
            port: settings.port,
            username: settings.username,
            password: settings.password,
            clientId: `iobroker_${this.adapter.namespace}`,
        });

        // Variables for correct connection (disconnection) notification / logging
        this.internalConnectionstate = false;
        this.errorCountdown = 0;
        this.numberOfErrorsToLog = 10;

        this.client.on('connect', async () => {
            if (!this.internalConnectionstate) {
                this.adapter.log.info(`Connection to LoRaWAN is active.`);
                if (this.adapter.config.notificationActivation === 'notification') {
                    this.adapter.registerNotification(
                        'lorawan',
                        'LoRaWAN Network Service connected',
                        `${this.adapter.i18nTranslation['LoRaWAN Network Service is connected']}.\nURL: ${settings.ipUrl}`,
                    );
                }
            }
            this.internalConnectionstate = true;
            const connectionInfo = await this.adapter.getConnectionInfo();
            await this.adapter.setState('info.connection', connectionInfo, true);

            this.errorCountdown = this.numberOfErrorsToLog;
            // @ts-expect-error overloadmessage from functoin getSubscribtionArray
            this.client.subscribe(this.getSubscribtionArray(), err => {
                if (err) {
                    this.adapter.log.error(`On subscribe: ${err}`);
                }
            });
        });
        this.client.on('disconnect', () => {
            if (this.internalConnectionstate) {
                this.adapter.setState('info.connection', false, true);
                this.internalConnectionstate = false;
                this.adapter.log.info(`disconnected`);
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
                this.adapter.log.info(`Connection is closed.`);
                if (this.adapter.config.notificationActivation === 'notification') {
                    this.adapter.registerNotification(
                        'lorawan',
                        'LoRaWAN Network Service disconnected',
                        `${this.adapter.i18nTranslation['LoRaWAN Network Service is disconnected']}.\nURL: ${settings.ipUrl}`,
                    );
                }
            }
            this.adapter.setState('info.connection', false, true);
            this.internalConnectionstate = false;
        });

        this.client.on('message', async (topic, message) => {
            // Check for logging
            this.adapter.log[this.adapter.logtypes.mqtt]?.(`incoming topic: ${topic}`);
            this.adapter.log[this.adapter.logtypes.mqtt]?.(`incoming message: ${message}`);
            // @ts-expect-error assignmessage in JSON.parse
            message = JSON.parse(message);

            await this.adapter.messagehandler.handleMessage(topic, message);
        });
    }
    /**
     * @param topic topic of the message
     * @param message message to the LoRaWAN device
     * @param opt optional data
     */
    async publish(topic, message, opt) {
        this.adapter.log.debug(`Publishing topic: ${topic} with message: ${message}.`);
        await this.client.publishAsync(topic, message, opt);
    }

    /**
     * shut down the mqtt client
     */
    destroy() {
        this.client.end();
    }

    /**
     * get subscribtionarray in case of origin
     */
    getSubscribtionArray() {
        switch (this.adapter.config.origin) {
            case this.adapter.origin.ttn:
                return ['v3/+/devices/+/+', 'v3/+/devices/+/down/+'];
            case this.adapter.origin.chirpstack:
                return ['application/+/device/+/event/+', 'application/+/device/+/command/down'];
        }
    }
}

module.exports = mqttClientClass;
