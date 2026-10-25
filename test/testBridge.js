'use strict';

/* global describe, it */

const { expect } = require('chai');

const Bridge = require('../lib/modules/bridge');
const BridgeDevices = require('../lib/modules/deviceManager/bridgeDevices');

function createBridgeForStateAttributes() {
    return {
        adapter: {
            log: {
                silly: () => {},
                error: () => {},
            },
        },
        unitMap: {},
        normalizeUnit: unit => (unit || '').trim(),
    };
}

describe('Bridge Home Assistant discovery attributes', () => {
    it('does not add via_device when the device is the adapter bridge itself', async () => {
        const bridge = {
            adapter: {
                namespace: 'lorawan.0',
                version: '1.0.0',
                config: { BridgeDevicesToGenerate: [] },
                logtypes: { bridgeDiscovery: 'bridgeDiscovery' },
                log: { silly: () => {}, bridgeDiscovery: () => {}, error: () => {} },
            },
            normalizeString: Bridge.prototype.normalizeString,
            Timeoutput: {
                Argument: 'de-DE',
                Format: { year: 'numeric', month: '2-digit', day: '2-digit' },
            },
            discoveredDevices: { lorawan_0: {} },
            oldDiscoveredDevices: {},
            DiscoveredIds: {},
            DiscoveredUniqueId: {},
            bridgeMqttClient: { publish: async () => {} },
            scheduleDiscoveredIdsWrite: () => {},
            schedulePublishedIdsWrite: () => {},
            scheduleSubscribedTopicsWrite: () => {},
            emit: () => {},
        };
        const discoveryObject = {
            topic: 'homeassistant/sensor/lorawan_0/config',
            payload: {
                unique_id: 'lorawan_0_state',
                device: { identifiers: ['lorawan_0'], name: 'lorawan.0' },
            },
            informations: {},
        };

        await Bridge.prototype.publishDiscovery.call(bridge, 'lorawan.0.state', discoveryObject);

        expect(discoveryObject.payload.device).not.to.have.property('via_device');
    });

    it('adds the adapter namespace as via_device for other devices', async () => {
        const bridge = {
            adapter: {
                namespace: 'lorawan.0',
                version: '1.0.0',
                config: { BridgeDevicesToGenerate: [] },
                logtypes: { bridgeDiscovery: 'bridgeDiscovery' },
                log: { silly: () => {}, bridgeDiscovery: () => {}, error: () => {} },
            },
            normalizeString: Bridge.prototype.normalizeString,
            Timeoutput: {
                Argument: 'de-DE',
                Format: { year: 'numeric', month: '2-digit', day: '2-digit' },
            },
            discoveredDevices: { sensor_1: {} },
            oldDiscoveredDevices: {},
            DiscoveredIds: {},
            DiscoveredUniqueId: {},
            bridgeMqttClient: { publish: async () => {} },
            scheduleDiscoveredIdsWrite: () => {},
            schedulePublishedIdsWrite: () => {},
            scheduleSubscribedTopicsWrite: () => {},
            emit: () => {},
        };
        const discoveryObject = {
            topic: 'homeassistant/sensor/sensor_1/config',
            payload: {
                unique_id: 'sensor_1_state',
                device: { identifiers: ['sensor_1'], name: 'sensor.1' },
            },
            informations: {},
        };

        await Bridge.prototype.publishDiscovery.call(bridge, 'sensor.1.state', discoveryObject);

        expect(discoveryObject.payload.device).to.include({ via_device: 'lorawan_0' });
    });

    it('adds the state topic as json attributes topic for json states', async () => {
        const bridge = createBridgeForStateAttributes();
        const stateTopic = 'lorawan_1/geburtstag/alias_0_allgemein_geburtstag_json/state';

        const attributes = await Bridge.prototype.getStateAttributes.call(
            bridge,
            { role: 'json', type: 'string' },
            'sensor',
            stateTopic,
        );

        expect(attributes).to.deep.include({ json_attributes_topic: stateTopic });
    });

    it('does not add a json attributes topic for other roles', async () => {
        const bridge = createBridgeForStateAttributes();

        const attributes = await Bridge.prototype.getStateAttributes.call(
            bridge,
            { role: 'value.temperature', type: 'number' },
            'sensor',
            'lorawan_1/temperature/state',
        );

        expect(attributes).not.to.have.property('json_attributes_topic');
    });

    it('reports the configured ID when a light state is missing', async () => {
        const missingId = 'alias.0.living_room.light_brightness';
        const warnings = [];
        const bridge = {
            adapter: {
                getForeignStateAsync: async () => null,
                log: { warn: message => warnings.push(message) },
            },
        };

        const value = await Bridge.prototype.getForeignStateValueForPublish.call(
            bridge,
            missingId,
            'light attribute "brightness" for "light-id"',
        );

        expect(value).to.equal(undefined);
        expect(warnings).to.have.lengthOf(1);
        expect(warnings[0]).to.include(missingId);
        expect(warnings[0]).to.include('brightness');
    });

    it('identifies missing bridge objects by configured light attribute', () => {
        const missingId = 'alias.0.living_room.light_brightness';
        const bridgeDevices = new BridgeDevices({});

        const missing = bridgeDevices.getMissingForeignObjects({
            ids: { [missingId]: { object: null } },
            discovery: [{ ids: { brightness: missingId } }],
        });

        expect(missing).to.deep.equal([{ id: missingId, attributes: ['brightness'] }]);
    });

    it('ignores adapter-owned and generated virtual bridge IDs', () => {
        const missingId = 'alias.0.living_room.light_brightness';
        const bridgeDevices = new BridgeDevices({ namespace: 'lorawan.1' });

        const missing = bridgeDevices.getMissingForeignObjects({
            ids: {
                [missingId]: { object: null },
                'alias.0.Garage.Garagentor.SET.virtual_position': { object: null },
                'lorawan.1.application.devices.device.downlink.control.virtual_mode': { object: null },
                'lorawan.1.notification.general': { object: null },
            },
            discovery: [
                {
                    ids: {
                        brightness: missingId,
                        simulatePosition: 'alias.0.Garage.Garagentor.SET.virtual_position',
                        mode: 'lorawan.1.application.devices.device.downlink.control.virtual_mode',
                        notification: 'lorawan.1.notification.general',
                    },
                },
            ],
        });

        expect(missing).to.deep.equal([{ id: missingId, attributes: ['brightness'] }]);
    });

    it('keeps a bridge device visible when a configured object is missing', async () => {
        const missingId = 'alias.0.living_room.light_brightness';
        const warnings = [];
        const bridgeDevices = new BridgeDevices({
            namespace: 'lorawan.0',
            config: { BridgeType: 'HA' },
            getStateAsync: async () => ({ val: 'http://localhost' }),
            objectStore: {
                bridge: {
                    devices: {
                        livingRoom: {
                            name: 'Living room',
                            discovery: [{ from: 'foreignDevices', ids: { brightness: missingId } }],
                            ids: { [missingId]: { object: null } },
                            entityType: { light: 1 },
                            informations: {},
                        },
                    },
                    receivedDeviceInfos: {},
                },
            },
            logtypes: { deviceManager: 'deviceManager', listDevices: 'listDevices' },
            log: {
                deviceManager: () => {},
                listDevices: () => {},
                warn: message => warnings.push(message),
            },
        });

        const devices = await bridgeDevices.listDevices();

        expect(devices).to.have.lengthOf(1);
        expect(devices[0]).to.include({ id: 'livingRoom', hasDetails: false });
        expect(warnings[0]).to.include(missingId);
    });
});
