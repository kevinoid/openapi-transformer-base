/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @private
 */

'use strict';

const assert = require('node:assert');

const sinon = require('sinon');

const OpenApiTransformerBase = require('../index.js');
const visit = require('../visit.js');

describe('visit', () => {
  it('calls method with 1 arg', () => {
    const transformer = new OpenApiTransformerBase();
    const method = sinon.spy();
    const arg = {};
    visit(transformer, method, 'propName', arg);
    sinon.assert.calledWithExactly(method, arg);
    sinon.assert.calledOnce(method);
    sinon.assert.alwaysCalledOn(method, transformer);
  });

  it('calls method with 2 args', () => {
    const transformer = new OpenApiTransformerBase();
    const method = sinon.spy();
    const arg1 = {};
    const arg2 = {};
    visit(transformer, method, 'propName', arg1, arg2);
    sinon.assert.calledWithExactly(method, arg1, arg2);
    sinon.assert.calledOnce(method);
    sinon.assert.alwaysCalledOn(method, transformer);
  });

  it('returns value from method', () => {
    const transformer = new OpenApiTransformerBase();
    const retval = {};
    const method = () => retval;
    assert.strictEqual(visit(transformer, method, 'propName'), retval);
  });

  it('adds propName to #transformPath during visit', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    let called = false;
    function method() {
      assert(!called);
      called = true;
      assert.deepStrictEqual(transformPath, [propName]);
    }
    visit(transformer, method, propName);
    assert(called);
    assert.deepStrictEqual(transformPath, []);
  });

  it('removes propName from #transformPath on exception', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    const errTest = new Error('test');
    function method() {
      throw errTest;
    }
    try {
      visit(transformer, method, propName);
      assert.fail();
    } catch (err) {
      assert.strictEqual(err, errTest);
      assert.deepStrictEqual(transformPath, []);
    }
  });

  it('adds copy of #transformPath to Error exception', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    const errTest = new Error('test');
    function method() {
      throw errTest;
    }
    try {
      visit(transformer, method, propName);
      assert.fail();
    } catch (err) {
      assert.strictEqual(err, errTest);
      assert.deepStrictEqual(err.transformPath, ['propName']);
      assert.deepStrictEqual(transformPath, []);
    }
  });

  it('does not set #transformPath on non-Error exception', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    const errTest = {};
    function method() {
      throw errTest;
    }
    try {
      visit(transformer, method, propName);
      assert.fail();
    } catch (err) {
      assert.strictEqual(err, errTest);
      assert(!Object.hasOwn(err, 'transformPath'));
      assert.deepStrictEqual(transformPath, []);
    }
  });

  it('does not clobber exception if #transformPath is inconsistent', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    const errTest = new Error('test');
    function method() {
      transformPath.push('surprise');
      throw errTest;
    }
    try {
      visit(transformer, method, propName);
      assert.fail();
    } catch (err) {
      assert.strictEqual(err, errTest);
    }
  });

  it('does not clobber exception if #transformPath is empty', () => {
    const transformer = new OpenApiTransformerBase();
    const { transformPath } = transformer;
    assert.deepStrictEqual(transformPath, []);
    const propName = 'propName';
    const errTest = new Error('test');
    function method() {
      transformPath.pop();
      throw errTest;
    }
    try {
      visit(transformer, method, propName);
      assert.fail();
    } catch (err) {
      assert.strictEqual(err, errTest);
    }
  });
});
