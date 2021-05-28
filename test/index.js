/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @private
 */

'use strict';

const assert = require('assert');
const deepFreeze = require('deep-freeze');
const sinon = require('sinon');
const { inspect } = require('util');

const OpenApiTransformerBase = require('..');

/* Specification Extension Property Ambiguity:
 * There is some ambiguity between whether an x- property should be
 * treated as a Specification Extension (of unknown type), or as a value with
 * the same type as other properties on objects specified as Map[X,Y].
 * For example, is #/components/schemas/x-myschema a Schema Object or a
 * Specification Extension of unknown type?
 * The code currently treats such values as having the same type as other
 * properties, based on my reading of the OpenApi Specification, which does
 * not note "This object MAY be extended with Specification Extensions" on
 * Map objects.
 */

function assertOnlyCalledMethods(obj, onlyMethods) {
  const onlyMethodsSet = new Set(onlyMethods);
  const unseenMethodsSet = new Set(onlyMethodsSet);
  // Note: sinon stubs methods using a non-enumerable value descriptor
  for (const desc of Object.values(Object.getOwnPropertyDescriptors(obj))) {
    const method = desc.value;
    // Identify stubs using logic like sinon verifyIsStub
    // https://github.com/sinonjs/sinon/blob/v10.0.1/lib/sinon/assert.js#L21
    if (typeof method === 'function' && typeof method.getCall === 'function') {
      if (onlyMethodsSet.has(method)) {
        unseenMethodsSet.delete(method);
      } else {
        sinon.assert.notCalled(method);
      }
    }
  }

  assert.deepStrictEqual(
    [...unseenMethodsSet],
    [],
    'methods passed to assertOnlyCalledMethods not on obj',
  );
}

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

    it('calls transformPathItem on each value', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const callback = deepFreeze({
        'http://example.com': {},
        '$request.body#/url': {},
      });
      assert.deepStrictEqual(t.transformCallback(callback), callback);
      const values = Object.values(callback);
      sinon.assert.calledWith(t.transformPathItem, values[0]);
      sinon.assert.calledWith(t.transformPathItem, values[1]);
      sinon.assert.calledTwice(t.transformPathItem);
      sinon.assert.alwaysCalledOn(t.transformPathItem, t);
      sinon.assert.calledOnce(t.transformCallback);
      assertOnlyCalledMethods(t, [t.transformCallback, t.transformPathItem]);
    });

    // x- extension properties could be anything, don't assume a Response.
    it('does not call transformPathItem on x- properties', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const callback = deepFreeze({ 'x-test': {} });
      assert.deepStrictEqual(t.transformCallback(callback), callback);
      sinon.assert.calledOnce(t.transformCallback);
      assertOnlyCalledMethods(t, [t.transformCallback]);
    });
  });

  describe('#transformComponents()', () => {
    methodPreservesArgumentType('transformComponents');

    it('calls transformMap on schemas', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ schemas: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.schemas,
        t.transformSchema,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on responses', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ responses: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.responses,
        t.transformResponse,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on parameters', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ parameters: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.parameters,
        t.transformParameter,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on examples', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ examples: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.examples,
        t.transformExample3,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on requestBodies', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ requestBodies: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.requestBodies,
        t.transformRequestBody,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on headers', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ headers: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.headers,
        t.transformHeader,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on securitySchemes', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ securitySchemes: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.securitySchemes,
        t.transformSecurityScheme,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on links', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ links: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.links,
        t.transformLink,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on callbacks', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ callbacks: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.callbacks,
        t.transformCallback,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });

    it('calls transformMap on pathItems', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const components = deepFreeze({ pathItems: {} });
      assert.deepStrictEqual(t.transformComponents(components), components);
      sinon.assert.calledWith(
        t.transformMap,
        components.pathItems,
        t.transformPathItem,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformComponents);
      assertOnlyCalledMethods(t, [t.transformComponents, t.transformMap]);
    });
  });

  describe('#transformContact()', () => {
    methodPreservesArgumentType('transformContact');
  });

  describe('#transformDiscriminator()', () => {
    methodPreservesArgumentType('transformDiscriminator');
  });

  describe('#transformEncoding()', () => {
    methodPreservesArgumentType('transformEncoding');

    it('calls transformMap on headers', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const encoding = deepFreeze({ headers: {} });
      assert.deepStrictEqual(t.transformEncoding(encoding), encoding);
      sinon.assert.calledWith(
        t.transformMap,
        encoding.headers,
        t.transformHeader,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformEncoding);
      assertOnlyCalledMethods(t, [t.transformEncoding, t.transformMap]);
    });
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

    it('calls transformItems on items', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const header = deepFreeze({ items: {} });
      assert.deepStrictEqual(t.transformHeader(header), header);
      sinon.assert.calledWith(t.transformItems, header.items);
      sinon.assert.calledOnce(t.transformItems);
      sinon.assert.alwaysCalledOn(t.transformItems, t);
      sinon.assert.calledOnce(t.transformHeader);
      assertOnlyCalledMethods(t, [t.transformHeader, t.transformItems]);
    });

    it('calls transformSchema on schema', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const header = deepFreeze({ schema: {} });
      assert.deepStrictEqual(t.transformHeader(header), header);
      sinon.assert.calledWith(t.transformSchema, header.schema);
      sinon.assert.calledOnce(t.transformSchema);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      sinon.assert.calledOnce(t.transformHeader);
      assertOnlyCalledMethods(t, [t.transformHeader, t.transformSchema]);
    });
  });

  describe('#transformInfo()', () => {
    methodPreservesArgumentType('transformInfo');

    it('calls transformContact on contact', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const info = deepFreeze({ contact: {} });
      assert.deepStrictEqual(t.transformInfo(info), info);
      sinon.assert.calledWith(t.transformContact, info.contact);
      sinon.assert.calledOnce(t.transformContact);
      sinon.assert.alwaysCalledOn(t.transformContact, t);
      sinon.assert.calledOnce(t.transformInfo);
      assertOnlyCalledMethods(t, [t.transformInfo, t.transformContact]);
    });

    it('calls transformLicense on license', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const info = deepFreeze({ license: {} });
      assert.deepStrictEqual(t.transformInfo(info), info);
      sinon.assert.calledWith(t.transformLicense, info.license);
      sinon.assert.calledOnce(t.transformLicense);
      sinon.assert.alwaysCalledOn(t.transformLicense, t);
      sinon.assert.calledOnce(t.transformInfo);
      assertOnlyCalledMethods(t, [t.transformInfo, t.transformLicense]);
    });
  });

  describe('#transformItems()', () => {
    methodPreservesArgumentType('transformItems');

    it('calls transformItems recursively on items', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const items = deepFreeze({ items: {} });
      assert.deepStrictEqual(t.transformItems(items), items);
      sinon.assert.calledWith(t.transformItems, items.items);
      sinon.assert.calledTwice(t.transformItems);
      sinon.assert.alwaysCalledOn(t.transformItems, t);
      assertOnlyCalledMethods(t, [t.transformItems]);
    });

    it('does not call transformItems on undefined items', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const items = deepFreeze({ items: undefined });
      assert.deepStrictEqual(t.transformItems(items), items);
      sinon.assert.calledOnce(t.transformItems);
      assertOnlyCalledMethods(t, [t.transformItems]);
    });
  });

  describe('#transformLicense()', () => {
    methodPreservesArgumentType('transformLicense');
  });

  describe('#transformLink()', () => {
    methodPreservesArgumentType('transformLink');

    it('calls transformServer on server', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const link = deepFreeze({ server: {} });
      assert.deepStrictEqual(t.transformLink(link), link);
      sinon.assert.calledWith(t.transformServer, link.server);
      sinon.assert.calledOnce(t.transformServer);
      sinon.assert.alwaysCalledOn(t.transformServer, t);
      sinon.assert.calledOnce(t.transformLink);
      assertOnlyCalledMethods(t, [t.transformLink, t.transformServer]);
    });

    it('does not call transformServer on undefined server', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const link = deepFreeze({ server: undefined });
      assert.deepStrictEqual(t.transformLink(link), link);
      sinon.assert.calledOnce(t.transformLink);
      assertOnlyCalledMethods(t, [t.transformLink]);
    });
  });

  describe('#transformMap()', () => {
    methodPreservesArgumentType('transformServer');

    it('calls its second argument on each property', () => {
      const mapper = sinon.stub().returns(true);
      const obj = deepFreeze({
        a: 1,
        b: 2,
      });
      const t = sinon.spy(new OpenApiTransformerBase());
      assert.deepStrictEqual(t.transformMap(obj, mapper), {
        a: true,
        b: true,
      });
      sinon.assert.calledWith(mapper, 1);
      sinon.assert.calledWith(mapper, 2);
      sinon.assert.calledTwice(mapper);
      sinon.assert.alwaysCalledOn(mapper, t);
      sinon.assert.calledOnce(t.transformMap);
      assertOnlyCalledMethods(t, [t.transformMap]);
    });

    // See: Specification Extension Property Ambiguity above
    it('calls its second argument on x- properties', () => {
      const mapper = sinon.stub().returns(true);
      const obj = deepFreeze({ 'x-test': 1 });
      const t = sinon.spy(new OpenApiTransformerBase());
      assert.deepStrictEqual(t.transformMap(obj, mapper), { 'x-test': true });
      sinon.assert.calledWith(mapper, 1);
      sinon.assert.calledOnce(mapper);
      sinon.assert.alwaysCalledOn(mapper, t);
      sinon.assert.calledOnce(t.transformMap);
      assertOnlyCalledMethods(t, [t.transformMap]);
    });

    // Treat undefined the same as missing properties (as most recent ES
    // features/APIs)
    it('does not call its second argument on undefined values', () => {
      const mapper = sinon.stub().returns(true);
      const obj = deepFreeze({
        a: 1,
        b: undefined,
      });
      const t = sinon.spy(new OpenApiTransformerBase());
      assert.deepStrictEqual(t.transformMap(obj, mapper), {
        a: true,
        b: undefined,
      });
      sinon.assert.calledWith(mapper, 1);
      sinon.assert.calledOnce(mapper);
      sinon.assert.alwaysCalledOn(mapper, t);
      sinon.assert.calledOnce(t.transformMap);
      assertOnlyCalledMethods(t, [t.transformMap]);
    });

    // Prototypes other than Object.prototype do not occur for JSON values,
    // so is unexpected in input and output.
    it('does not map object prototype', () => {
      const mapper = sinon.stub().returns(true);
      const obj = Object.create({ a: 1 });
      obj.b = 2;
      deepFreeze(obj);
      const t = sinon.spy(new OpenApiTransformerBase());
      assert.deepStrictEqual(t.transformMap(obj, mapper), { b: true });
      sinon.assert.calledWith(mapper, 2);
      sinon.assert.calledOnce(mapper);
      sinon.assert.alwaysCalledOn(mapper, t);
      sinon.assert.calledOnce(t.transformMap);
      assertOnlyCalledMethods(t, [t.transformMap]);
    });

    // If an Array appears where a Map should, it's not something defined by
    // OAS.  Better to leave it as-is.
    it('does not map Array values', () => {
      const mapper = sinon.stub().returns(true);
      const obj = deepFreeze([1, 2]);
      const t = sinon.spy(new OpenApiTransformerBase());
      assert.deepStrictEqual(t.transformMap(obj, mapper), obj);
      sinon.assert.notCalled(mapper);
      sinon.assert.calledOnce(t.transformMap);
      assertOnlyCalledMethods(t, [t.transformMap]);
    });
  });

  describe('#transformMediaType()', () => {
    methodPreservesArgumentType('transformMediaType');

    it('calls transformSchema on schema', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const mediatype = deepFreeze({ schema: {} });
      assert.deepStrictEqual(t.transformMediaType(mediatype), mediatype);
      sinon.assert.calledWith(t.transformSchema, mediatype.schema);
      sinon.assert.calledOnce(t.transformSchema);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      sinon.assert.calledOnce(t.transformMediaType);
      assertOnlyCalledMethods(t, [t.transformMediaType, t.transformSchema]);
    });

    it('calls transformMap on examples', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const mediatype = deepFreeze({ examples: {} });
      assert.deepStrictEqual(t.transformMediaType(mediatype), mediatype);
      sinon.assert.calledWith(
        t.transformMap,
        mediatype.examples,
        t.transformExample3,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformMediaType);
      assertOnlyCalledMethods(t, [t.transformMediaType, t.transformMap]);
    });

    it('calls transformMap on encodings', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const mediatype = deepFreeze({ encoding: {} });
      assert.deepStrictEqual(t.transformMediaType(mediatype), mediatype);
      sinon.assert.calledWith(
        t.transformMap,
        mediatype.encoding,
        t.transformEncoding,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformMediaType);
      assertOnlyCalledMethods(t, [t.transformMediaType, t.transformMap]);
    });
  });

  describe('#transformOAuthFlow()', () => {
    methodPreservesArgumentType('transformOAuthFlow');
  });

  describe('#transformOAuthFlows()', () => {
    methodPreservesArgumentType('transformOAuthFlows');

    it('calls transformOAuthFlow on implicit', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const oAuthFlows = deepFreeze({ implicit: {} });
      assert.deepStrictEqual(t.transformOAuthFlows(oAuthFlows), oAuthFlows);
      sinon.assert.calledWith(t.transformOAuthFlow, oAuthFlows.implicit);
      sinon.assert.calledOnce(t.transformOAuthFlow);
      sinon.assert.alwaysCalledOn(t.transformOAuthFlow, t);
      sinon.assert.calledOnce(t.transformOAuthFlows);
      assertOnlyCalledMethods(t, [t.transformOAuthFlows, t.transformOAuthFlow]);
    });

    it('calls transformOAuthFlow on password', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const oAuthFlows = deepFreeze({ password: {} });
      assert.deepStrictEqual(t.transformOAuthFlows(oAuthFlows), oAuthFlows);
      sinon.assert.calledWith(t.transformOAuthFlow, oAuthFlows.password);
      sinon.assert.calledOnce(t.transformOAuthFlow);
      sinon.assert.alwaysCalledOn(t.transformOAuthFlow, t);
      sinon.assert.calledOnce(t.transformOAuthFlows);
      assertOnlyCalledMethods(t, [t.transformOAuthFlows, t.transformOAuthFlow]);
    });

    it('calls transformOAuthFlow on clientCredentials', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const oAuthFlows = deepFreeze({ clientCredentials: {} });
      assert.deepStrictEqual(t.transformOAuthFlows(oAuthFlows), oAuthFlows);
      sinon.assert.calledWith(
        t.transformOAuthFlow,
        oAuthFlows.clientCredentials,
      );
      sinon.assert.calledOnce(t.transformOAuthFlow);
      sinon.assert.alwaysCalledOn(t.transformOAuthFlow, t);
      sinon.assert.calledOnce(t.transformOAuthFlows);
      assertOnlyCalledMethods(t, [t.transformOAuthFlows, t.transformOAuthFlow]);
    });

    it('calls transformOAuthFlow on authorizationCode', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const oAuthFlows = deepFreeze({ authorizationCode: {} });
      assert.deepStrictEqual(t.transformOAuthFlows(oAuthFlows), oAuthFlows);
      sinon.assert.calledWith(
        t.transformOAuthFlow,
        oAuthFlows.authorizationCode,
      );
      sinon.assert.calledOnce(t.transformOAuthFlow);
      sinon.assert.alwaysCalledOn(t.transformOAuthFlow, t);
      sinon.assert.calledOnce(t.transformOAuthFlows);
      assertOnlyCalledMethods(t, [t.transformOAuthFlows, t.transformOAuthFlow]);
    });
  });

  describe('#transformOpenApi()', () => {
    methodPreservesArgumentType('transformOpenApi');

    it('calls transformInfo on info', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ info: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformInfo, openApi.info);
      sinon.assert.calledOnce(t.transformInfo);
      sinon.assert.alwaysCalledOn(t.transformInfo, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformInfo]);
    });

    it('calls transformExternalDocs on externalDocs', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ externalDocs: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformExternalDocs, openApi.externalDocs);
      sinon.assert.calledOnce(t.transformExternalDocs);
      sinon.assert.alwaysCalledOn(t.transformExternalDocs, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformExternalDocs]);
    });

    it('calls transformServer on servers', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ servers: [{}, {}] });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformServer.getCall(0), openApi.servers[0]);
      sinon.assert.calledWith(t.transformServer.getCall(1), openApi.servers[1]);
      sinon.assert.calledTwice(t.transformServer);
      sinon.assert.alwaysCalledOn(t.transformServer, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformServer]);
    });

    it('calls transformComponents on components', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ components: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformComponents, openApi.components);
      sinon.assert.calledOnce(t.transformComponents);
      sinon.assert.alwaysCalledOn(t.transformComponents, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformComponents]);
    });

    it('calls transformMap on definitions', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ definitions: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(
        t.transformMap,
        openApi.definitions,
        t.transformSchema,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformMap]);
    });

    it('calls transformMap on parameters', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ parameters: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(
        t.transformMap,
        openApi.parameters,
        t.transformParameter,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformMap]);
    });

    it('calls transformParameter on x-ms-parameterized-host parameters', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameters = [{}, {}];
      const openApi = deepFreeze({
        'x-ms-parameterized-host': {
          hostTemplate: 'example.{tld}',
          parameters,
        },
      });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformParameter.getCall(0), parameters[0]);
      sinon.assert.calledWith(t.transformParameter.getCall(1), parameters[1]);
      sinon.assert.calledTwice(t.transformParameter);
      sinon.assert.alwaysCalledOn(t.transformParameter, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformParameter]);
    });

    it('calls transformResponse on responses', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ responses: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(
        t.transformMap,
        openApi.responses,
        t.transformResponse,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformMap]);
    });

    it('calls transformPaths on paths', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ paths: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformPaths, openApi.paths);
      sinon.assert.calledOnce(t.transformPaths);
      sinon.assert.alwaysCalledOn(t.transformPaths, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformPaths]);
    });

    it('calls transformPaths on x-ms-paths', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ 'x-ms-paths': {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformPaths, openApi['x-ms-paths']);
      sinon.assert.calledOnce(t.transformPaths);
      sinon.assert.alwaysCalledOn(t.transformPaths, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformPaths]);
    });

    // Added in OpenAPI 3.1
    it('calls transformMap on webhooks', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ webhooks: {} });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(
        t.transformMap,
        openApi.webhooks,
        t.transformPathItem,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformMap]);
    });

    it('calls transformSecurityRequirement on security', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({
        security: [{}, {}],
      });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(
        t.transformSecurityRequirement.getCall(0),
        openApi.security[0],
      );
      sinon.assert.calledWith(
        t.transformSecurityRequirement.getCall(1),
        openApi.security[1],
      );
      sinon.assert.calledTwice(t.transformSecurityRequirement);
      sinon.assert.alwaysCalledOn(t.transformSecurityRequirement, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [
        t.transformOpenApi,
        t.transformSecurityRequirement,
      ]);
    });

    it('calls transformTag on tags', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const openApi = deepFreeze({ tags: [{}, {}] });
      assert.deepStrictEqual(t.transformOpenApi(openApi), openApi);
      sinon.assert.calledWith(t.transformTag.getCall(0), openApi.tags[0]);
      sinon.assert.calledWith(t.transformTag.getCall(1), openApi.tags[1]);
      sinon.assert.calledTwice(t.transformTag);
      sinon.assert.alwaysCalledOn(t.transformTag, t);
      sinon.assert.calledOnce(t.transformOpenApi);
      assertOnlyCalledMethods(t, [t.transformOpenApi, t.transformTag]);
    });
  });

  describe('#transformOperation()', () => {
    methodPreservesArgumentType('transformOperation');

    it('calls transformExternalDocs on externalDocs', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const operation = deepFreeze({ externalDocs: {} });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(t.transformExternalDocs, operation.externalDocs);
      sinon.assert.calledOnce(t.transformExternalDocs);
      sinon.assert.alwaysCalledOn(t.transformExternalDocs, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [
        t.transformOperation,
        t.transformExternalDocs,
      ]);
    });

    it('calls transformParameter on each parameter', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameters = [{}, {}];
      const operation = deepFreeze({ parameters });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(t.transformParameter.getCall(0), parameters[0]);
      sinon.assert.calledWith(t.transformParameter.getCall(1), parameters[1]);
      sinon.assert.calledTwice(t.transformParameter);
      sinon.assert.alwaysCalledOn(t.transformParameter, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [t.transformOperation, t.transformParameter]);
    });

    it('calls transformRequestBody on requestBody', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const operation = deepFreeze({ requestBody: {} });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(t.transformRequestBody, operation.requestBody);
      sinon.assert.calledOnce(t.transformRequestBody);
      sinon.assert.alwaysCalledOn(t.transformRequestBody, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [
        t.transformOperation,
        t.transformRequestBody,
      ]);
    });

    it('calls transformResponses on responses', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const operation = deepFreeze({ responses: {} });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(t.transformResponses, operation.responses);
      sinon.assert.calledOnce(t.transformResponses);
      sinon.assert.alwaysCalledOn(t.transformResponses, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [t.transformOperation, t.transformResponses]);
    });

    it('calls transformMap on callbacks', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const operation = deepFreeze({ callbacks: {} });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(
        t.transformMap,
        operation.callbacks,
        t.transformCallback,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [t.transformOperation, t.transformMap]);
    });

    it('calls transformSecurityRequirement on each security', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const security = [{}, {}];
      const operation = deepFreeze({ security });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(
        t.transformSecurityRequirement.getCall(0),
        security[0],
      );
      sinon.assert.calledWith(
        t.transformSecurityRequirement.getCall(1),
        security[1],
      );
      sinon.assert.calledTwice(t.transformSecurityRequirement);
      sinon.assert.alwaysCalledOn(t.transformSecurityRequirement, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [
        t.transformOperation,
        t.transformSecurityRequirement,
      ]);
    });

    it('calls transformServer on each server', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const servers = [{}, {}];
      const operation = deepFreeze({ servers });
      assert.deepStrictEqual(t.transformOperation(operation), operation);
      sinon.assert.calledWith(t.transformServer.getCall(0), servers[0]);
      sinon.assert.calledWith(t.transformServer.getCall(1), servers[1]);
      sinon.assert.calledTwice(t.transformServer);
      sinon.assert.alwaysCalledOn(t.transformServer, t);
      sinon.assert.calledOnce(t.transformOperation);
      assertOnlyCalledMethods(t, [t.transformOperation, t.transformServer]);
    });
  });

  describe('#transformParameter()', () => {
    methodPreservesArgumentType('transformParameter');

    it('calls transformMap on content', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameter = deepFreeze({ content: {} });
      assert.deepStrictEqual(t.transformParameter(parameter), parameter);
      sinon.assert.calledWith(
        t.transformMap,
        parameter.content,
        t.transformMediaType,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformParameter);
      assertOnlyCalledMethods(t, [t.transformParameter, t.transformMap]);
    });

    it('calls transformSchema on schema', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameter = deepFreeze({ schema: {} });
      assert.deepStrictEqual(t.transformParameter(parameter), parameter);
      sinon.assert.calledWith(t.transformSchema, parameter.schema);
      sinon.assert.calledOnce(t.transformSchema);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      sinon.assert.calledOnce(t.transformParameter);
      assertOnlyCalledMethods(t, [t.transformParameter, t.transformSchema]);
    });

    it('calls transformItems on items', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameter = deepFreeze({ items: {} });
      assert.deepStrictEqual(t.transformParameter(parameter), parameter);
      sinon.assert.calledWith(t.transformItems, parameter.items);
      sinon.assert.calledOnce(t.transformItems);
      sinon.assert.alwaysCalledOn(t.transformItems, t);
      sinon.assert.calledOnce(t.transformParameter);
      assertOnlyCalledMethods(t, [t.transformParameter, t.transformItems]);
    });

    it('calls transformMap on examples', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameter = deepFreeze({ examples: {} });
      assert.deepStrictEqual(t.transformParameter(parameter), parameter);
      sinon.assert.calledWith(
        t.transformMap,
        parameter.examples,
        t.transformExample3,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformParameter);
      assertOnlyCalledMethods(t, [t.transformParameter, t.transformMap]);
    });
  });

  describe('#transformPathItem()', () => {
    methodPreservesArgumentType('transformPathItem');

    it('calls transformParameter on each parameter', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const parameters = [{}, {}];
      const pathItem = deepFreeze({ parameters });
      assert.deepStrictEqual(t.transformPathItem(pathItem), pathItem);
      sinon.assert.calledWith(t.transformParameter.getCall(0), parameters[0]);
      sinon.assert.calledWith(t.transformParameter.getCall(1), parameters[1]);
      sinon.assert.calledTwice(t.transformParameter);
      sinon.assert.alwaysCalledOn(t.transformParameter, t);
      sinon.assert.calledOnce(t.transformPathItem);
      assertOnlyCalledMethods(t, [t.transformPathItem, t.transformParameter]);
    });

    it('calls transformServer on each server', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const servers = [{}, {}];
      const pathItem = deepFreeze({ servers });
      assert.deepStrictEqual(t.transformPathItem(pathItem), pathItem);
      sinon.assert.calledWith(t.transformServer.getCall(0), servers[0]);
      sinon.assert.calledWith(t.transformServer.getCall(1), servers[1]);
      sinon.assert.calledTwice(t.transformServer);
      sinon.assert.alwaysCalledOn(t.transformServer, t);
      sinon.assert.calledOnce(t.transformPathItem);
      assertOnlyCalledMethods(t, [t.transformPathItem, t.transformServer]);
    });

    for (const method of [
      'delete',
      'get',
      'head',
      'options',
      'patch',
      'post',
      'put',
      'trace',
    ]) {
      it(`calls transformOperation on ${method}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const operation = {};
        const pathItem = deepFreeze({ [method]: operation });
        assert.deepStrictEqual(t.transformPathItem(pathItem), pathItem);
        sinon.assert.calledWith(t.transformOperation, operation);
        sinon.assert.calledOnce(t.transformOperation);
        sinon.assert.alwaysCalledOn(t.transformOperation, t);
        sinon.assert.calledOnce(t.transformPathItem);
        assertOnlyCalledMethods(t, [t.transformPathItem, t.transformOperation]);
      });

      // This is a non-standard extension, which seems reasonably unambiguous
      const methodUpper = method.toUpperCase();
      it(`calls transformOperation on ${methodUpper}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const operation = {};
        const pathItem = deepFreeze({ [methodUpper]: operation });
        assert.deepStrictEqual(t.transformPathItem(pathItem), pathItem);
        sinon.assert.calledWith(t.transformOperation, operation);
        sinon.assert.calledOnce(t.transformOperation);
        sinon.assert.alwaysCalledOn(t.transformOperation, t);
        sinon.assert.calledOnce(t.transformPathItem);
        assertOnlyCalledMethods(t, [t.transformPathItem, t.transformOperation]);
      });
    }

    it('does not call transformOperation on non-method props', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const pathItem = deepFreeze({
        summary: {},
        description: {},
        'x-get': {},
      });
      assert.deepStrictEqual(t.transformPathItem(pathItem), pathItem);
      sinon.assert.calledOnce(t.transformPathItem);
      assertOnlyCalledMethods(t, [t.transformPathItem]);
    });
  });

  describe('#transformPaths()', () => {
    methodPreservesArgumentType('transformPaths');

    it('calls transformPathItem on each value for / props', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const paths = deepFreeze({
        '/path1': {},
        '/path2': {},
      });
      assert.deepStrictEqual(t.transformPaths(paths), paths);
      const values = Object.values(paths);
      sinon.assert.calledWith(t.transformPathItem, values[0]);
      sinon.assert.calledWith(t.transformPathItem, values[1]);
      sinon.assert.calledTwice(t.transformPathItem);
      sinon.assert.alwaysCalledOn(t.transformPathItem, t);
      sinon.assert.calledOnce(t.transformPaths);
      assertOnlyCalledMethods(t, [t.transformPaths, t.transformPathItem]);
    });

    // FIXME: Paths Object is only specified to contain properties starting
    // with "/" and specification extensions ("x-").  Should non-/ properties
    // be transformed?  Do so for now.
    it('calls transformPathItem on each value for non-/ props', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const paths = deepFreeze({
        path1: {},
        path2: {},
      });
      assert.deepStrictEqual(t.transformPaths(paths), paths);
      const values = Object.values(paths);
      sinon.assert.calledWith(t.transformPathItem, values[0]);
      sinon.assert.calledWith(t.transformPathItem, values[1]);
      sinon.assert.calledTwice(t.transformPathItem);
      sinon.assert.alwaysCalledOn(t.transformPathItem, t);
      sinon.assert.calledOnce(t.transformPaths);
      assertOnlyCalledMethods(t, [t.transformPaths, t.transformPathItem]);
    });

    // x- extension properties could be anything, don't assume a Response.
    it('does not call transformPathItem on x- properties', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const paths = deepFreeze({ 'x-test': {} });
      assert.deepStrictEqual(t.transformPaths(paths), paths);
      sinon.assert.calledOnce(t.transformPaths);
      assertOnlyCalledMethods(t, [t.transformPaths]);
    });
  });

  describe('#transformRequestBody()', () => {
    methodPreservesArgumentType('transformRequestBody');

    it('calls transformMap on content', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const requestBody = deepFreeze({ content: {} });
      assert.deepStrictEqual(t.transformRequestBody(requestBody), requestBody);
      sinon.assert.calledWith(
        t.transformMap,
        requestBody.content,
        t.transformMediaType,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformRequestBody);
      assertOnlyCalledMethods(t, [t.transformRequestBody, t.transformMap]);
    });

    it('does not call transformMap on undefined content', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const requestBody = deepFreeze({ content: undefined });
      assert.deepStrictEqual(t.transformRequestBody(requestBody), requestBody);
      sinon.assert.calledOnce(t.transformRequestBody);
      assertOnlyCalledMethods(t, [t.transformRequestBody]);
    });
  });

  describe('#transformResponse()', () => {
    methodPreservesArgumentType('transformResponse');

    it('calls transformMap on headers', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const response = deepFreeze({ headers: {} });
      assert.deepStrictEqual(t.transformResponse(response), response);
      sinon.assert.calledWith(
        t.transformMap,
        response.headers,
        t.transformHeader,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformResponse);
      assertOnlyCalledMethods(t, [t.transformResponse, t.transformMap]);
    });

    it('calls transformMap on content', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const response = deepFreeze({ content: {} });
      assert.deepStrictEqual(t.transformResponse(response), response);
      sinon.assert.calledWith(
        t.transformMap,
        response.content,
        t.transformMediaType,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformResponse);
      assertOnlyCalledMethods(t, [t.transformResponse, t.transformMap]);
    });

    it('calls transformMap on links', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const response = deepFreeze({ links: {} });
      assert.deepStrictEqual(t.transformResponse(response), response);
      sinon.assert.calledWith(
        t.transformMap,
        response.links,
        t.transformLink,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformResponse);
      assertOnlyCalledMethods(t, [t.transformResponse, t.transformMap]);
    });

    it('calls transformSchema on schema', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const response = deepFreeze({ schema: {} });
      assert.deepStrictEqual(t.transformResponse(response), response);
      sinon.assert.calledWith(t.transformSchema, response.schema);
      sinon.assert.calledOnce(t.transformSchema);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      sinon.assert.calledOnce(t.transformResponse);
      assertOnlyCalledMethods(t, [t.transformResponse, t.transformSchema]);
    });

    it('calls transformExample on examples', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const response = deepFreeze({ examples: {} });
      assert.deepStrictEqual(t.transformResponse(response), response);
      sinon.assert.calledWith(t.transformExample, response.examples);
      sinon.assert.calledOnce(t.transformExample);
      sinon.assert.alwaysCalledOn(t.transformExample, t);
      sinon.assert.calledOnce(t.transformResponse);
      assertOnlyCalledMethods(t, [t.transformResponse, t.transformExample]);
    });
  });

  describe('#transformResponses()', () => {
    methodPreservesArgumentType('transformResponses');

    it('calls transformResponse on default property', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const responses = deepFreeze({ default: {} });
      assert.deepStrictEqual(t.transformResponses(responses), responses);
      sinon.assert.calledWith(t.transformResponse, responses.default);
      sinon.assert.calledOnce(t.transformResponse);
      sinon.assert.alwaysCalledOn(t.transformResponse, t);
      sinon.assert.calledOnce(t.transformResponses);
      assertOnlyCalledMethods(t, [t.transformResponses, t.transformResponse]);
    });

    it('calls transformResponse on 200 property', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const responses = deepFreeze({ 200: {} });
      assert.deepStrictEqual(t.transformResponses(responses), responses);
      sinon.assert.calledWith(t.transformResponse, responses[200]);
      sinon.assert.calledOnce(t.transformResponse);
      sinon.assert.alwaysCalledOn(t.transformResponse, t);
      sinon.assert.calledOnce(t.transformResponses);
      assertOnlyCalledMethods(t, [t.transformResponses, t.transformResponse]);
    });

    it('calls transformResponse on 2XX property', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const responses = deepFreeze({ '2XX': {} });
      assert.deepStrictEqual(t.transformResponses(responses), responses);
      sinon.assert.calledWith(t.transformResponse, responses['2XX']);
      sinon.assert.calledOnce(t.transformResponse);
      sinon.assert.alwaysCalledOn(t.transformResponse, t);
      sinon.assert.calledOnce(t.transformResponses);
      assertOnlyCalledMethods(t, [t.transformResponses, t.transformResponse]);
    });

    // x- extension properties could be anything, don't assume a Response.
    it('does not call transformResponse on x- property', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const responses = deepFreeze({ 'x-other': {} });
      assert.deepStrictEqual(t.transformResponses(responses), responses);
      sinon.assert.notCalled(t.transformResponse);
      sinon.assert.calledOnce(t.transformResponses);
      assertOnlyCalledMethods(t, [t.transformResponses]);
    });
  });

  describe('#transformSchema()', () => {
    methodPreservesArgumentType('transformSchema');

    it('calls transformDiscriminator on discriminator', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const schema = deepFreeze({ discriminator: {} });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledWith(t.transformDiscriminator, schema.discriminator);
      sinon.assert.calledOnce(t.transformDiscriminator);
      sinon.assert.alwaysCalledOn(t.transformDiscriminator, t);
      sinon.assert.calledOnce(t.transformSchema);
      assertOnlyCalledMethods(t, [t.transformSchema, t.transformDiscriminator]);
    });

    it('calls transformExternalDocs on externalDocs', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const schema = deepFreeze({ externalDocs: {} });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledWith(t.transformExternalDocs, schema.externalDocs);
      sinon.assert.calledOnce(t.transformExternalDocs);
      sinon.assert.alwaysCalledOn(t.transformExternalDocs, t);
      sinon.assert.calledOnce(t.transformSchema);
      assertOnlyCalledMethods(t, [t.transformSchema, t.transformExternalDocs]);
    });

    it('calls transformXml on xml', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const schema = deepFreeze({ xml: {} });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledWith(t.transformXml, schema.xml);
      sinon.assert.calledOnce(t.transformXml);
      sinon.assert.alwaysCalledOn(t.transformXml, t);
      sinon.assert.calledOnce(t.transformSchema);
      assertOnlyCalledMethods(t, [t.transformSchema, t.transformXml]);
    });

    it('calls transformSchema on non-Array items', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const schema = deepFreeze({ items: {} });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledWith(t.transformSchema, schema.items);
      sinon.assert.calledTwice(t.transformSchema);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      assertOnlyCalledMethods(t, [t.transformSchema]);
    });

    // For OAS 2 and OAS 3.1, which allow Array for tuple schema
    it('calls transformSchema on each Array items element', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const items = [{}, {}];
      const schema = deepFreeze({ items });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledWith(t.transformSchema.getCall(1), items[0]);
      sinon.assert.calledWith(t.transformSchema.getCall(2), items[1]);
      sinon.assert.callCount(t.transformSchema, 3);
      sinon.assert.alwaysCalledOn(t.transformSchema, t);
      assertOnlyCalledMethods(t, [t.transformSchema]);
    });

    for (const schemaProp of [
      'additionalItems',
      'additionalProperties',
      'contains',
      'else',
      'if',
      'not',
      'propertyNames',
      'then',
      'unevaluatedItems',
      'unevaluatedProperties',
    ]) {
      it(`calls transformSchema on ${schemaProp}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const schema = deepFreeze({ [schemaProp]: {} });
        assert.deepStrictEqual(t.transformSchema(schema), schema);
        sinon.assert.calledWith(t.transformSchema, schema[schemaProp]);
        sinon.assert.calledTwice(t.transformSchema);
        sinon.assert.alwaysCalledOn(t.transformSchema, t);
        assertOnlyCalledMethods(t, [t.transformSchema]);
      });
    }

    for (const schemaMapProp of [
      'dependentSchemas',
      'patternProperties',
      'properties',
    ]) {
      it(`calls transformSchema on each value of ${schemaMapProp}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const schema = deepFreeze({
          [schemaMapProp]: {
            a: {},
            b: {},
          },
        });
        assert.deepStrictEqual(t.transformSchema(schema), schema);
        const values = Object.values(schema[schemaMapProp]);
        sinon.assert.calledWith(t.transformSchema, values[0]);
        sinon.assert.calledWith(t.transformSchema, values[1]);
        sinon.assert.callCount(t.transformSchema, 3);
        sinon.assert.alwaysCalledOn(t.transformSchema, t);
        assertOnlyCalledMethods(t, [t.transformSchema]);
      });

      // See: Specification Extension Property Ambiguity above
      it(`calls transformSchema on x- ${schemaMapProp}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const schema = deepFreeze({ [schemaMapProp]: { 'x-test': {} } });
        assert.deepStrictEqual(t.transformSchema(schema), schema);
        sinon.assert.calledWith(
          t.transformSchema,
          schema[schemaMapProp]['x-test'],
        );
        sinon.assert.calledTwice(t.transformSchema);
        assertOnlyCalledMethods(t, [t.transformSchema]);
      });
    }

    for (const schemaArrayProp of [
      'allOf',
      'anyOf',
      'oneOf',
    ]) {
      it(`calls transformSchema on each value of ${schemaArrayProp}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const schemas = [{}, {}];
        const schema = deepFreeze({ [schemaArrayProp]: schemas });
        assert.deepStrictEqual(t.transformSchema(schema), schema);
        sinon.assert.calledWith(t.transformSchema.getCall(1), schemas[0]);
        sinon.assert.calledWith(t.transformSchema.getCall(2), schemas[1]);
        sinon.assert.callCount(t.transformSchema, 3);
        sinon.assert.alwaysCalledOn(t.transformSchema, t);
        assertOnlyCalledMethods(t, [t.transformSchema]);
      });

      it(`does not transformSchema on non-Array ${schemaArrayProp}`, () => {
        const t = sinon.spy(new OpenApiTransformerBase());
        const schema = deepFreeze({ [schemaArrayProp]: { a: {} } });
        assert.deepStrictEqual(t.transformSchema(schema), schema);
        sinon.assert.calledOnce(t.transformSchema);
        assertOnlyCalledMethods(t, [t.transformSchema]);
      });
    }

    // Note: The examples property is an Array of values, as defined by JSON
    // Schema, and is therefore not suitable for any current transformExample*
    // method.  See https://github.com/OAI/OpenAPI-Specification/issues/2094
    it('does not transform examples', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const schema = deepFreeze({ examples: [{}] });
      assert.deepStrictEqual(t.transformSchema(schema), schema);
      sinon.assert.calledOnce(t.transformSchema);
      assertOnlyCalledMethods(t, [t.transformSchema]);
    });
  });

  describe('#transformSecurityRequirement()', () => {
    methodPreservesArgumentType('transformSecurityRequirement');
  });

  describe('#transformSecurityScheme()', () => {
    methodPreservesArgumentType('transformSecurityScheme');

    it('calls transformOAuthFlows on flows', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const securityScheme = deepFreeze({ flows: {} });
      assert.deepStrictEqual(
        t.transformSecurityScheme(securityScheme),
        securityScheme,
      );
      sinon.assert.calledWith(t.transformOAuthFlows, securityScheme.flows);
      sinon.assert.calledOnce(t.transformOAuthFlows);
      sinon.assert.alwaysCalledOn(t.transformOAuthFlows, t);
      sinon.assert.calledOnce(t.transformSecurityScheme);
      assertOnlyCalledMethods(t, [
        t.transformSecurityScheme,
        t.transformOAuthFlows,
      ]);
    });

    it('does not call transformOAuthFlows on undefined flows', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const securityScheme = deepFreeze({ flows: undefined });
      assert.deepStrictEqual(
        t.transformSecurityScheme(securityScheme),
        securityScheme,
      );
      sinon.assert.calledOnce(t.transformSecurityScheme);
      assertOnlyCalledMethods(t, [t.transformSecurityScheme]);
    });
  });

  describe('#transformServer()', () => {
    methodPreservesArgumentType('transformServer');

    it('calls transformMap on variables', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const server = deepFreeze({ variables: {} });
      assert.deepStrictEqual(t.transformServer(server), server);
      sinon.assert.calledWith(
        t.transformMap,
        server.variables,
        t.transformServerVariable,
      );
      sinon.assert.calledOnce(t.transformMap);
      sinon.assert.alwaysCalledOn(t.transformMap, t);
      sinon.assert.calledOnce(t.transformServer);
      assertOnlyCalledMethods(t, [t.transformServer, t.transformMap]);
    });

    it('does not call transformServerVariables on undefined variables', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const server = deepFreeze({ variables: undefined });
      assert.deepStrictEqual(t.transformServer(server), server);
      sinon.assert.calledOnce(t.transformServer);
      assertOnlyCalledMethods(t, [t.transformServer]);
    });
  });

  describe('#transformServerVariable()', () => {
    methodPreservesArgumentType('transformServerVariable');
  });

  describe('#transformTag()', () => {
    methodPreservesArgumentType('transformTag');

    it('calls transformExternalDocs on externalDocs', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const tag = deepFreeze({ externalDocs: {} });
      assert.deepStrictEqual(t.transformTag(tag), tag);
      sinon.assert.calledWith(t.transformExternalDocs, tag.externalDocs);
      sinon.assert.calledOnce(t.transformExternalDocs);
      sinon.assert.alwaysCalledOn(t.transformExternalDocs, t);
      sinon.assert.calledOnce(t.transformTag);
      assertOnlyCalledMethods(t, [t.transformTag, t.transformExternalDocs]);
    });

    it('does not call transformExternalDocs on undefined externalDocs', () => {
      const t = sinon.spy(new OpenApiTransformerBase());
      const tag = deepFreeze({ externalDocs: undefined });
      assert.deepStrictEqual(t.transformTag(tag), tag);
      sinon.assert.calledOnce(t.transformTag);
      assertOnlyCalledMethods(t, [t.transformTag]);
    });
  });

  describe('#transformXml()', () => {
    methodPreservesArgumentType('transformXml');
  });
});
