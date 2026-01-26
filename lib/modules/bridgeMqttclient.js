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

        this.filter = { incomming: '', outgoing: '' };

        // Prefix for publish and subscribe
        this.BridgePrefix = `${this.adapter.namespace}/`.replace(/\./g, '_');

        // Variables for correct connection (disconnection) notification / logging
        this.internalConnectionstate = false;
        this.errorCountdown = 0;
        this.numberOfErrorsToLog = 10;

        this.client.on('connect', async () => {
            // Assign filter, if present
            if (await this.adapter.objectExists('bridge.debug.incommingTopicFilter')) {
                this.filter.incomming = (await this.adapter.getStateAsync('bridge.debug.incommingTopicFilter')).val;
            }
            if (await this.adapter.objectExists('bridge.debug.outgoingTopicFilter')) {
                this.filter.outgoing = (await this.adapter.getStateAsync('bridge.debug.outgoingTopicFilter')).val;
            }
            if (!this.internalConnectionstate) {
                this.adapter.log.info(`Connection to Bridge is active.`);
            }
            await this.adapter.setState('info.bridgeConnection', true, true);
            this.errorCountdown = this.numberOfErrorsToLog;
            this.internalConnectionstate = true;
            const connectionInfo = await this.adapter.getConnectionInfo();
            await this.adapter.setState('info.connection', connectionInfo, true);

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
            const notificationId = `${this.adapter.namespace}.${this.adapter.bridge.Words.notification}${this.adapter.bridge.GeneralId}`;
            await this.adapter.bridge?.publishNotification(
                notificationId,
                `${this.adapter.i18nTranslation['connection to bridge is activ']}. Adapterversion: ${this.adapter.version}`,
                this.adapter.bridge?.Notificationlevel.bridgeConnection,
                false,
            );
        });

        this.client.on('disconnect', async () => {
            if (this.internalConnectionstate) {
                this.adapter.setState('info.bridgeConnection', false, true);
                this.internalConnectionstate = false;
                this.adapter.log.info(`Bridge disconnected`);
                this.adapter.bridge.clearAllSchedules();
                await this.adapter.setState('info.connection', false, true);
            }
        });
        this.client.on('error', err => {
            if (this.errorCountdown === 0) {
                this.adapter.log.error(`bridgeMqttClientClass error: ${err}`);
                this.errorCountdown = this.numberOfErrorsToLog;
            } else {
                this.errorCountdown--;
            }
        });

        this.client.on('close', async () => {
            if (this.internalConnectionstate) {
                this.adapter.log.info(`Connection to Bridge is closed.`);
            }
            await this.adapter.setState('info.bridgeConnection', false, true);
            if (this.adapter.config.notificationActivation === 'notification') {
                this.adapter.registerNotification(
                    'lorawan',
                    'Bridge disconnected',
                    this.adapter.i18nTranslation['connection to bridge is closed'],
                );
            }
            const connectionInfo = await this.adapter.getConnectionInfo();
            await this.adapter.setState('info.connection', connectionInfo, true);
            this.internalConnectionstate = false;
        });

        this.client.on('message', async (topic, message) => {
            this.adapter.log.debug(`incomming bridge topic: ${topic}`);
            this.adapter.log.debug(`incomming bridge message: ${message}`);

            // String zuweisen, wenn JSON.parse ein Fehler auswirft.
            let payload = message.toString('utf8');

            // Write into debug
            if (await this.adapter.objectExists('bridge.debug.incommingTopic')) {
                if (topic.includes(this.filter.incomming)) {
                    await this.adapter.setState('bridge.debug.incommingTopic', topic, true);
                    await this.adapter.setState('bridge.debug.incommingPayload', payload, true);
                }
            }

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

        // Write into debug
        if (await this.adapter.objectExists('bridge.debug.outgoingTopic')) {
            if (topic.includes(this.filter.outgoing)) {
                await this.adapter.setState('bridge.debug.outgoingTopic', topic, true);
                await this.adapter.setState('bridge.debug.outgoingPayload', message, true);
            }
        }

        await this.client.publishAsync(topic, message, opt);
    }

    /**
     * @param name name of the filter element
     * @param val value of the filter alement
     */
    setFilter(name, val) {
        this.filter[name] = val;
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
        return [`${this.BridgePrefix}+/set`, `${this.BridgePrefix}+/+/set`];
    }
}

module.exports = bridgeMqttClientClass;
