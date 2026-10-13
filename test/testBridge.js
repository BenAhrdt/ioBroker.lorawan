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
