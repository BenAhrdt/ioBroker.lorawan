'use strict';

/* global describe, it */

const { expect } = require('chai');

const Bridge = require('../lib/modules/bridge');

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
});
