'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

function setCachedExport(modulePath, exportedValue) {
    const cachedModule = require.cache[modulePath];
    if (!cachedModule) {
        throw new Error(`Module is not cached: ${modulePath}`);
    }
    cachedModule.exports = exportedValue;
}

describe('Home Assistant sensor discovery attributes', () => {
    let Bridge;
    let bridge;
    let mqttClientPath;
    let deviceHandlerPath;
    let originalMqttClient;
    let originalDeviceHandler;

    before(() => {
        mqttClientPath = require.resolve('./lib/modules/bridgeMqttclient');
        deviceHandlerPath = require.resolve('./lib/modules/bridgeDeviceHandler');
        originalMqttClient = require(mqttClientPath);
        originalDeviceHandler = require(deviceHandlerPath);
        setCachedExport(mqttClientPath, class {});
        setCachedExport(deviceHandlerPath, class {});
        Bridge = require('./lib/modules/bridge');
    });

    beforeEach(() => {
        const adapter = {
            config: {},
            namespace: 'lorawan.0',
            extendObject: sinon.stub(),
            log: { silly: sinon.stub(), error: sinon.stub() },
        };
        bridge = new Bridge(adapter);
    });

    after(() => {
        setCachedExport(mqttClientPath, originalMqttClient);
        setCachedExport(deviceHandlerPath, originalDeviceHandler);
        sinon.restore();
    });

    it('normalizes and classifies volume flow units', async () => {
        expect(bridge.normalizeUnit('l/min')).to.equal('L/min');
        expect(await bridge.getStateAttributes({ role: 'value', unit: 'l/min', type: 'number' }, 'sensor')).to.include({
            device_class: 'volume_flow_rate',
            state_class: 'measurement',
            unit_of_measurement: 'L/min',
        });
    });

    it('classifies wind direction as an angle measurement', async () => {
        expect(
            await bridge.getStateAttributes({ role: 'value.direction.wind', unit: '°', type: 'number' }, 'sensor'),
        ).to.include({
            device_class: 'wind_direction',
            state_class: 'measurement_angle',
            unit_of_measurement: '°',
        });
    });

    it('only adds the wind direction unit when none is defined', async () => {
        const existingUnit = await bridge.getStateAttributes(
            { role: 'value.direction.wind', unit: 'degree', type: 'number' },
            'sensor',
        );
        const missingUnit = await bridge.getStateAttributes(
            { role: 'value.direction.wind', type: 'number' },
            'sensor',
        );

        expect(existingUnit.unit_of_measurement).to.equal('degree');
        expect(missingUnit.unit_of_measurement).to.equal('°');
    });

    it('treats litres as an increasing water counter', async () => {
        const attributes = await bridge.getStateAttributes({ role: 'value', unit: 'l', type: 'number' }, 'sensor');
        expect(attributes).to.include({
            device_class: 'water',
            state_class: 'total_increasing',
            unit_of_measurement: 'L',
        });
    });

    it('treats cubic metres as an increasing gas counter', async () => {
        const attributes = await bridge.getStateAttributes({ role: 'value', unit: 'm3', type: 'number' }, 'sensor');
        expect(attributes).to.include({
            device_class: 'gas',
            state_class: 'total_increasing',
            unit_of_measurement: 'm³',
        });
    });

    it('does not combine remaining generic volume units with measurement', async () => {
        const attributes = await bridge.getStateAttributes({ role: 'value', unit: 'ml', type: 'number' }, 'sensor');
        expect(attributes).to.include({ device_class: 'volume', unit_of_measurement: 'mL' });
        expect(attributes).not.to.have.property('state_class');
    });

    it('uses total_increasing for an accumulated energy role', async () => {
        expect(
            await bridge.getStateAttributes({ role: 'value.energy', unit: 'kwh', type: 'number' }, 'sensor'),
        ).to.include({ device_class: 'energy', state_class: 'total_increasing', unit_of_measurement: 'kWh' });
    });

    it('keeps total_increasing for energy units used by Home Assistant energy statistics', async () => {
        const attributes = await bridge.getStateAttributes({ role: 'value', unit: 'kwh', type: 'number' }, 'sensor');
        expect(attributes).to.include({
            device_class: 'energy',
            state_class: 'total_increasing',
            unit_of_measurement: 'kWh',
        });
    });

    it('does not infer a substance from a concentration unit', async () => {
        const attributes = await bridge.getStateAttributes({ role: 'value', unit: 'ppm', type: 'number' }, 'sensor');
        expect(attributes).to.include({ state_class: 'measurement', unit_of_measurement: 'ppm' });
        expect(attributes).not.to.have.property('device_class');
    });

    it('never publishes state_class for a number entity', async () => {
        const attributes = await bridge.getStateAttributes(
            { role: 'value.energy', unit: 'kWh', type: 'number' },
            'number',
        );
        expect(attributes).not.to.have.property('state_class');
    });
});
