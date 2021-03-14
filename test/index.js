/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @private
 */

'use strict';

const assert = require('assert');
const { inspect } = require('util');

const OpenApiTransformerBase = require('..');

/** Tests argument handling conventions shared by all methods.
 *
 * @param {string} methodName Name of OpenApiTransformerBase method to test.
 */
function methodPreservesArgumentType(methodName) {
  for (const arg of [undefined, null, false, true, 0, 1, '', 'x']) {
    const inspectArg = inspect(arg);
    it(`transforms ${inspectArg} to ${inspectArg}`, () => {
      const transformer = new OpenApiTransformerBase();
      const result = transformer[methodName](arg);
      assert.strictEqual(result, arg);
    });
  }

  it('transforms [] to []', () => {
    const transformer = new OpenApiTransformerBase();
    const result = transformer[methodName]([]);
    assert(Array.isArray(result), 'result isArray');
    assert.strictEqual(result.length, 0);
  });

  // TODO: Do we care about preserving types not representable in JSON?
  // (e.g. Date, RegExp, Symbol, etc.)
  // TODO: Do we care about preserving the object prototype?
  // (e.g. Object.create(null) for maps)
  it('transforms {} to {}', () => {
    const transformer = new OpenApiTransformerBase();
    const result = transformer[methodName]({});
    assert.strictEqual(typeof result, 'object');
    assert.notStrictEqual(result, null);
  });
}

describe('OpenApiTransformerBase', () => {
  describe('#transformCallback()', () => {
    methodPreservesArgumentType('transformCallback');
  });

  describe('#transformComponents()', () => {
    methodPreservesArgumentType('transformComponents');
  });

  describe('#transformContact()', () => {
    methodPreservesArgumentType('transformContact');
  });

  describe('#transformDiscriminator()', () => {
    methodPreservesArgumentType('transformDiscriminator');
  });

  describe('#transformEncoding()', () => {
    methodPreservesArgumentType('transformEncoding');
  });

  describe('#transformExample()', () => {
    methodPreservesArgumentType('transformExample');
  });

  describe('#transformExample3()', () => {
    methodPreservesArgumentType('transformExample3');
  });

  describe('#transformExternalDocs()', () => {
    methodPreservesArgumentType('transformExternalDocs');
  });

  describe('#transformHeader()', () => {
    methodPreservesArgumentType('transformHeader');
  });

  describe('#transformInfo()', () => {
    methodPreservesArgumentType('transformInfo');
  });

  describe('#transformItems()', () => {
    methodPreservesArgumentType('transformItems');
  });

  describe('#transformLicense()', () => {
    methodPreservesArgumentType('transformLicense');
  });

  describe('#transformLink()', () => {
    methodPreservesArgumentType('transformLink');
  });

  describe('#transformMediaType()', () => {
    methodPreservesArgumentType('transformMediaType');
  });

  describe('#transformOAuthFlow()', () => {
    methodPreservesArgumentType('transformOAuthFlow');
  });

  describe('#transformOAuthFlows()', () => {
    methodPreservesArgumentType('transformOAuthFlows');
  });

  describe('#transformOpenApi()', () => {
    methodPreservesArgumentType('transformOpenApi');
  });

  describe('#transformOperation()', () => {
    methodPreservesArgumentType('transformOperation');
  });

  describe('#transformParameter()', () => {
    methodPreservesArgumentType('transformParameter');
  });

  describe('#transformPathItem()', () => {
    methodPreservesArgumentType('transformPathItem');
  });

  describe('#transformPaths()', () => {
    methodPreservesArgumentType('transformPaths');
  });

  describe('#transformRequestBody()', () => {
    methodPreservesArgumentType('transformRequestBody');
  });

  describe('#transformResponse()', () => {
    methodPreservesArgumentType('transformResponse');
  });

  describe('#transformResponses()', () => {
    methodPreservesArgumentType('transformResponses');
  });

  describe('#transformSchema()', () => {
    methodPreservesArgumentType('transformSchema');
  });

  describe('#transformSecurityRequirement()', () => {
    methodPreservesArgumentType('transformSecurityRequirement');
  });

  describe('#transformSecurityScheme()', () => {
    methodPreservesArgumentType('transformSecurityScheme');
  });

  describe('#transformServer()', () => {
    methodPreservesArgumentType('transformServer');
  });

  describe('#transformServerVariable()', () => {
    methodPreservesArgumentType('transformServerVariable');
  });

  describe('#transformTag()', () => {
    methodPreservesArgumentType('transformTag');
  });

  describe('#transformXml()', () => {
    methodPreservesArgumentType('transformXml');
  });
});
