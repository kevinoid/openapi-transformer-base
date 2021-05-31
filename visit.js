/**
 * @copyright Copyright 2021 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module "openapi-transformer-base/visit.js"
 */

'use strict';

const assert = require('assert');

/** Convert an Array of property names to a JSON Pointer (RFC 6901).
 *
 * @private
 * @param {!Array<string>} propPath Property names.
 * @returns {string} JSON Pointer.
 */
function toJsonPointer(propPath) {
  // eslint-disable-next-line prefer-template
  return '/' + propPath
    // TODO [engine:node@>=15]: .replaceAll()
    .map((p) => p.replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/');
}

/** Visits a property being transformed by an OpenApiTransformerBase by adding
 * its name to transformPath while calling a given method with a given value.
 *
 * @template ArgsType, TransformedType
 * @param {!module:openapi-transformer-base} transformer Transformer on which
 * transformPath will be modified.
 * @param {function(this:!module:openapi-transformer-base, ...ArgsType):
 * TransformedType} method Method to be called.
 * @param {string} propName Name of property being visited.
 * @param {ArgsType} args Argument to method (usually property value).
 * @returns {TransformedType} Result of calling method on args.
 */
module.exports =
function visit(transformer, method, propName, ...args) {
  transformer.transformPath.push(propName);

  let handlingException = false;
  try {
    return method.apply(transformer, args);
  } catch (err) {
    handlingException = true;
    if (err instanceof Error && !hasOwnProperty.call(err, 'transformPath')) {
      err.transformPath = [...transformer.transformPath];
      err.message +=
        ` (while transforming ${toJsonPointer(err.transformPath)})`;
    }

    throw err;
  } finally {
    const popProp = transformer.transformPath.pop();

    // Avoid clobbering an exception which is already propagating
    if (!handlingException) {
      assert.strictEqual(popProp, propName);
    }
  }
};
