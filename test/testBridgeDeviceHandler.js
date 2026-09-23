'use strict';

/* global afterEach, beforeEach, describe, it */

const { expect } = require('chai');
const sinon = require('sinon');

const BridgeDeviceHandler = require('../lib/modules/bridgeDeviceHandler');

function createEntity(deviceId, state, available, domain = 'sensor') {
    return {
        entity_id: `${domain}.${deviceId}`,
        unique_id: `${domain}_${deviceId}`,
        friendly_name: `${deviceId} state`,
        domain,
        state,
        available,
        device: {
            id: deviceId,
            name: deviceId,
            manufacturer: 'test',
            model: 'test',
        },
    };
}

describe('Bridge device availability', () => {
    let adapter;
    let handler;

    beforeEach(() => {
        adapter = {
            config: {},
            namespace: 'lorawan.0',
            extendObject: sinon.stub().resolves(),
            setState: sinon.stub().resolves(),
            getStateAsync: sinon.stub().resolves({ val: 'http://localhost' }),
            getObjectAsync: sinon.stub().resolves(undefined),
            objectExists: sinon.stub().returns(true),
            log: { silly: sinon.stub(), warn: sinon.stub(), error: sinon.stub() },
        };
        handler = new BridgeDeviceHandler(adapter);
    });

    afterEach(() => sinon.restore());

    it('aggregates availability for every message and lets it recover on the next message', async () => {
        await handler.generateDeviceStructure({
            entities: {
                first: createEntity('device', '10', false),
                second: createEntity('device', '20', true),
            },
        });

        expect(adapter.setState).to.have.been.calledWith('lorawan.0.bridge.devices.device.available', false, true);

        adapter.setState.resetHistory();
        await handler.generateDeviceStructure({
            entities: {
                first: createEntity('device', '10', true),
                second: createEntity('device', '20', true),
            },
        });

        expect(adapter.setState).to.have.been.calledWith('lorawan.0.bridge.devices.device.available', true, true);
    });

    it('ignores button availability for the device aggregate', async () => {
        await handler.generateDeviceStructure({
            entities: {
                button: createEntity('device', 'on', false, 'button'),
                sensor: createEntity('device', '10', true),
            },
        });

        expect(adapter.setState).to.have.been.calledWith('lorawan.0.bridge.devices.device.available', true, true);
    });

    it('keeps the existing state type and ignores an incompatible unavailable value', async () => {
        const stateId = 'lorawan.0.bridge.devices.device.sensor.device';
        adapter.getObjectAsync.withArgs(stateId).resolves({ common: { type: 'number' } });

        await handler.generateDeviceStructure({
            entities: {
                sensor: createEntity('device', 'unavailable', true),
            },
        });

        expect(adapter.extendObject).to.have.been.calledWith(
            stateId,
            sinon.match({ common: sinon.match({ type: 'number' }) }),
        );
        expect(adapter.setState).not.to.have.been.calledWith(stateId, 'unavailable', true);
    });
});
