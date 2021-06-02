/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @private
 */

'use strict';

const assert = require('assert');

const toJsonPointer = require('../../lib/to-json-pointer.js');

describe('toJsonPointer', () => {
  for (const [propPath, ptr] of [
    [[], '/'],
    [['a'], '/a'],
    [['a', 'b'], '/a/b'],
    [['/'], '/~1'],
    [['~'], '/~0'],
    [['/a'], '/~1a'],
    [['~a'], '/~0a'],
    [['a/'], '/a~1'],
    [['a~'], '/a~0'],
    [['a/b'], '/a~1b'],
    [['a~b'], '/a~0b'],
    [['a~0b'], '/a~00b'],
    [['a~1b'], '/a~01b'],
    [['a/~b'], '/a~1~0b'],
    [['a~/b'], '/a~0~1b'],
  ]) {
    it(`converts ${JSON.stringify(propPath)} to ${ptr}`, () => {
      assert.strictEqual(toJsonPointer(propPath), ptr);
    });
  }

  it('throws TypeError with no argument', () => {
    assert.throws(
      () => toJsonPointer(),
      TypeError,
    );
  });

  it('throws TypeError with string argument', () => {
    assert.throws(
      () => toJsonPointer('foo'),
      TypeError,
    );
  });

  it('throws TypeError with number path item', () => {
    assert.throws(
      () => toJsonPointer([1]),
      TypeError,
    );
  });

  it('throws TypeError with object path item', () => {
    assert.throws(
      () => toJsonPointer([{}]),
      TypeError,
    );
  });
});
