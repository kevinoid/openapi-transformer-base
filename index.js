/**
 * @copyright Copyright 2019-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module openapi-transformer-base
 */

'use strict';

const { METHODS } = require('http');
const { debuglog } = require('util');

const toJsonPointer = require('./lib/to-json-pointer.js');
const visit = require('./visit.js');

const { isArray } = Array;

const debug = debuglog('openapi-transformer-base');

/** HTTP method names which are properties of a Path Item Object that have
 * Operation Object values.
 *
 * @private
 */
const httpMethodSet = new Set(METHODS);

/** Transforms a value which has type object<string,ValueType> but is not
 * defined as Map[string,ValueType] in OpenAPI.
 *
 * Note: This is currently used for schema properties, where #transformMap()
 * often complicates transformations due to differences with Map[string,Schema]
 * on definitions/components.schema and complicates optimizations.
 *
 * @private
 * @template ValueType, TransformedType
 * @this {!OpenApiTransformerBase}
 * @param {!object<string,ValueType>|*} obj Map-like object to transform.
 * @param {function(this:!OpenApiTransformerBase, ValueType): TransformedType
 * } transform Method which transforms values in obj.
 * @param {string} logName Name of object being transformed (for logging).
 * @param {boolean=} skipExtensions If true, do not call transform on {@link
 * https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.2.md#specificationExtensions
 * Specification Extensions} (i.e.  properties starting with "x-").
 * Such properties are copied to the returned object without transformation.
 * @returns {!object<string,TransformedType>|*} If obj is a Map, a plain object
 * with the same own enumerable string-keyed properties as obj with values
 * returned by transform.  Otherwise, obj is returned unchanged.
 */
function transformMapLike(obj, transform, logName, skipExtensions) {
  if (typeof obj !== 'object' || obj === null) {
    this.warn(`Ignoring non-object ${logName}`, obj);
    return obj;
  }

  if (isArray(obj)) {
    // Note: This function is only called for values specified as Map[X,Y]
    // in the OpenAPI Specification.  Array values are invalid and it would
    // be unsafe to assume that their contents are type Y.  Return unchanged.
    this.warn(`Ignoring non-object ${logName}`, obj);
    return obj;
  }

  const newObj = { ...obj };
  for (const [propName, propValue] of Object.entries(obj)) {
    if (propValue !== undefined
      && (!skipExtensions || !propName.startsWith('x-'))) {
      newObj[propName] = visit(this, transform, propName, propValue);
    }
  }

  return newObj;
}

/** Base class for traversing or transforming OpenAPI 2.x or 3.x documents
 * using a modified visitor design pattern to traverse object types within
 * the OpenAPI document tree.
 *
 * This class uses the following conventions:
 *
 * <ul>
 * <li>Objects passed as arguments are never modified by this class.
 *   Subclasses are encouraged to maintain this invariant by returning modified
 *   copies rather than modifying the argument objects.</li>
 * <li>JSON References, if present, are passed to the transform method for
 *   the type required by their position.  (e.g. a schema $ref is passed to
 *   {@link transformSchema}).</li>
 * <li>Properties which are not defined in the OpenAPI specification are
 *   preserved in returned objects unchanged. (e.g. <code>x-</code> extension
 *   properties)</li>
 * <li>The order that properties are visited is not defined and may change
 *   in future versions.</li>
 * <li>The behavior of this class is not conditional on the declared OpenAPI
 *   version in the document.  It will traverse properties which are present,
 *   regardless of whether they are specified in the declared version.</li>
 * <li>Callers may begin traversal at any point in the document (e.g. by
 *   calling {@link transformSchema} directly, instead of transitively through
 *   {@link transformOpenApi}).</li>
 * <li>No validation is performed on the OpenAPI document and every attempt is
 *   made to handle invalid values gracefully.  Child classes should be
 *   prepared for arguments with any type or value if the document may not be
 *   valid.</li>
 * <li>Minimal effort is made to handle or preserve values which are not
 *   representable in JSON (e.g. Date, RegExp, non-Object.prototype, Symbol
 *   and non-enumerable properties, etc.), which are usually treated as generic
 *   objects.</li>
 * <li>One exception to the previous point: transform methods are not called on
 *   <code>undefined</code> values, which are treated like missing properties
 *   except that they are copied to the transformed object to preserve the
 *   object shape.</li>
 * <li>Returned values are added to the transformed object, regardless of value.
 *   Therefore, unless overridden, returned objects will have the same
 *   properties as the original object, some of which may be undefined.</li>
 * </ul>
 */
class OpenApiTransformerBase {
  constructor() {
    /** Property names traversed in current transformation.
     *
     * @type {!Array<string>}
     */
    Object.defineProperty(this, 'transformPath', { value: [] });
  }

  /** Transforms an <code>Array[ValueType]</code> using a given transform
   * method.
   *
   * @template ValueType, TransformedType
   * @param {!Array<ValueType>|*} arr Array to transform.
   * @param {function(this:!OpenApiTransformerBase, ValueType): TransformedType
   * } transform Method which transforms values in arr.
   * @returns {!Array<TransformedType>|*} If arr is an Array, the result of
   * Array#map(transform).  Otherwise, obj is returned unchanged.
   */
  transformArray(arr, transform) {
    if (!isArray(arr)) {
      this.warn('Ignoring non-Array', arr);
      return arr;
    }

    return arr.map(transform, this);
  }

  /** Transforms a <code>Map[string, ValueType]</code> using a given transform
   * method.
   *
   * Similar to modify-values and _.mapValues from lodash.
   *
   * Unlike the above:
   * <ul>
   * <li>If the first argument is not an object, it is returned unchanged.</li>
   * <li>If the first argument is an Array, it is returned unchanged.</li>
   * <li>If the first argument is a non-null object, the returned object will
   * be a new object with prototype Object.prototype and properties matching
   * the first argument with transformed values.</li>
   * </ul>
   *
   * @template ValueType, TransformedType
   * @param {!object<string,ValueType>|*} obj Map to transform.
   * @param {function(this:!OpenApiTransformerBase, ValueType): TransformedType
   * } transform Method which transforms values in obj.
   * @returns {!object<string,TransformedType>|*} If obj is a Map, a plain
   * object with the same own enumerable string-keyed properties as obj with
   * values returned by transform.  Otherwise, obj is returned unchanged.
   */
  transformMap(obj, transform) {
    return transformMapLike.call(this, obj, transform, 'Map');
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#discriminatorObject
   * Discriminator Object}.
   *
   * @param {!object} discriminator Discriminator Object.
   * @returns {!object} Transformed Discriminator Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformDiscriminator(discriminator) {
    return discriminator;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#exampleObject
   * OpenAPI 2.0 Example Object}.
   *
   * @param {!object} example OpenAPI 2.0 Example Object.
   * @returns {!object} Transformed Example Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExample(example) {
    return example;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject
   * OpenAPI 3.x Example Object}.
   *
   * @param {!object} example OpenAPI 3.x Example Object.
   * @returns {!object} Transformed Example Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExample3(example) {
    return example;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject
   * External Documentation Object}.
   *
   * @param {!object} externalDocs External Documentation Object.
   * @returns {!object} Transformed External Documentation Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExternalDocs(externalDocs) {
    return externalDocs;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#xmlObject
   * XML Object}.
   *
   * @param {!object} xml XML Object.
   * @returns {!object} Transformed XML Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformXml(xml) {
    return xml;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject
   * Schema Object}.
   *
   * Note: For OpenAPI 2.0 documents, consider overriding
   * {@see transformParameter}, {@see transformItems}, and
   * {@see transformHeader} to transform all schema-like objects.
   *
   * @param {!object} schema Schema Object.
   * @returns {!object} Transformed Schema Object.
   */
  transformSchema(schema) {
    if (typeof schema !== 'object' || schema === null || isArray(schema)) {
      // Note: JSON Schema Core draft-handrews-json-schema-02 (referenced by
      // current/ OpenAPI 3.1 drafts) defines true and false as valid schemas
      // with true equivalent to {} and false equivalent to {not:{}}
      // https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.section.4.3.2
      if (typeof schema !== 'boolean') {
        this.warn('Ignoring non-object Schema', schema);
      }

      return schema;
    }

    const newSchema = { ...schema };
    const {
      contains,
      dependentSchemas,
      discriminator,
      externalDocs,
      items,
      patternProperties,
      properties,
      propertyNames,
      unevaluatedItems,
      unevaluatedProperties,
      xml,
    } = schema;

    if (discriminator !== undefined) {
      newSchema.discriminator = visit(
        this,
        this.transformDiscriminator,
        'discriminator',
        discriminator,
      );
    }

    if (externalDocs !== undefined) {
      newSchema.externalDocs = visit(
        this,
        this.transformExternalDocs,
        'externalDocs',
        externalDocs,
      );
    }

    if (xml !== undefined) {
      newSchema.xml = visit(this, this.transformXml, 'xml', xml);
    }

    if (items !== undefined) {
      // Note: OpenAPI 3.0 disallows Arrays, 2.0 and 3.1 drafts allow it
      if (isArray(items)) {
        newSchema.items = this.transformArray(items, this.transformSchema);
      } else {
        newSchema.items = visit(this, this.transformSchema, 'items', items);
      }
    }

    for (const schemaProp of ['if', 'then', 'else', 'not']) {
      const subSchema = schema[schemaProp];
      if (subSchema !== undefined) {
        newSchema[schemaProp] = visit(
          this,
          this.transformSchema,
          'subSchema',
          subSchema,
        );
      }
    }

    if (properties !== undefined) {
      newSchema.properties = visit(
        this,
        this.transformSchemaProperties,
        'properties',
        properties,
      );
    }

    if (patternProperties !== undefined) {
      newSchema.patternProperties = visit(
        this,
        transformMapLike,
        'patternProperties',
        patternProperties,
        this.transformSchema,
        'Schema',
      );
    }

    if (unevaluatedProperties !== undefined) {
      newSchema.unevaluatedProperties = visit(
        this,
        this.transformSchema,
        'unevaluatedProperties',
        unevaluatedProperties,
      );
    }

    if (propertyNames !== undefined) {
      newSchema.propertyNames = visit(
        this,
        this.transformSchema,
        'propertyNames',
        propertyNames,
      );
    }

    // Note: JSON Schema Core draft-handrews-json-schema-02 (referenced by
    // current/ OpenAPI 3.1 drafts) defines true and false as valid schemas
    // with true equivalent to {} and false equivalent to {not:{}}
    // https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.section.4.3.2
    // so they are now passed to transformSchema.
    for (const schemaProp of ['additionalItems', 'additionalProperties']) {
      const additionalItemsProps = schema[schemaProp];
      if (additionalItemsProps !== undefined) {
        newSchema[schemaProp] = visit(
          this,
          this.transformSchema,
          schemaProp,
          additionalItemsProps,
        );
      }
    }

    if (unevaluatedItems !== undefined) {
      newSchema.unevaluatedItems =
        visit(this, this.transformSchema, 'unevaluatedItems', unevaluatedItems);
    }

    if (dependentSchemas !== undefined) {
      newSchema.dependentSchemas = visit(
        this,
        transformMapLike,
        'dependentSchemas',
        dependentSchemas,
        this.transformSchema,
        'Schema',
      );
    }

    if (contains !== undefined) {
      newSchema.contains = visit(
        this,
        this.transformSchema,
        'contains',
        contains,
      );
    }

    for (const schemaProp of ['allOf', 'anyOf', 'oneOf']) {
      const subSchemas = schema[schemaProp];
      if (subSchemas !== undefined) {
        newSchema[schemaProp] = visit(
          this,
          this.transformArray,
          schemaProp,
          subSchemas,
          this.transformSchema,
        );
      }
    }

    // Note: The examples property is an Array of values, as defined by JSON
    // Schema, and is therefore not suitable for any transformExample* method.
    // See https://github.com/OAI/OpenAPI-Specification/issues/2094

    return newSchema;
  }

  /** Transforms {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject
   * Schema Object} properties.
   *
   * @param {!object} properties Schema Object properties.
   * @returns {!object} Transformed Schema Object properties.
   */
  transformSchemaProperties(properties) {
    return transformMapLike.call(
      this,
      properties,
      this.transformSchema,
      'Schema properties',
    );
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#itemsObject
   * Items Object}.
   *
   * Note: Items Object is a subset of Schema Object with the addition of
   * collectionFormat.
   *
   * @param {!object} items Items Object.
   * @returns {!object} Transformed Items Object.
   */
  transformItems(items) {
    if (typeof items !== 'object' || items === null || isArray(items)) {
      this.warn('Ignoring non-object Items', items);
      return items;
    }

    if (items.items === undefined) {
      return items;
    }

    return {
      ...items,
      items: visit(this, this.transformItems, 'items', items.items),
    };
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#headerObject
   * Header Object}.
   *
   * @param {!object} header Header Object.
   * @returns {!object} Transformed Header Object.
   */
  transformHeader(header) {
    if (typeof header !== 'object'
      || header === null
      || isArray(header)) {
      this.warn('Ignoring non-object Header', header);
      return header;
    }

    const newHeader = { ...header };

    if (header.items !== undefined) {
      newHeader.items = visit(this, this.transformItems, 'items', header.items);
    }

    if (header.schema !== undefined) {
      newHeader.schema = visit(
        this,
        this.transformSchema,
        'schema',
        header.schema,
      );
    }

    return newHeader;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#encodingObject
   * Encoding Object}.
   *
   * @param {!object} encoding Encoding Object.
   * @returns {!object} Transformed Encoding Object.
   */
  transformEncoding(encoding) {
    if (typeof encoding !== 'object'
      || encoding === null
      || isArray(encoding)) {
      this.warn('Ignoring non-object Encoding', encoding);
      return encoding;
    }

    if (encoding.headers === undefined) {
      return encoding;
    }

    return {
      ...encoding,
      headers: visit(
        this,
        this.transformMap,
        'headers',
        encoding.headers,
        this.transformHeader,
      ),
    };
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#linkObject
   * Link Object}.
   *
   * @param {!object} link Link Object.
   * @returns {!object} Transformed Link Object.
   */
  transformLink(link) {
    if (typeof link !== 'object'
      || link === null
      || isArray(link)) {
      this.warn('Ignoring non-object Link', link);
      return link;
    }

    if (link.server === undefined) {
      return link;
    }

    return {
      ...link,
      server: visit(this, this.transformServer, 'server', link.server),
    };
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#mediaTypeObject
   * Media Type Object}.
   *
   * @param {!object} mediaType Media Type Object.
   * @returns {!object} Transformed Media Type Object.
   */
  transformMediaType(mediaType) {
    if (typeof mediaType !== 'object'
      || mediaType === null
      || isArray(mediaType)) {
      this.warn('Ignoring non-object Media Type', mediaType);
      return mediaType;
    }

    const newMediaType = { ...mediaType };

    if (mediaType.schema !== undefined) {
      newMediaType.schema = visit(
        this,
        this.transformSchema,
        'schema',
        mediaType.schema,
      );
    }

    if (mediaType.examples !== undefined) {
      newMediaType.examples = visit(
        this,
        this.transformMap,
        'examples',
        mediaType.examples,
        this.transformExample3,
      );
    }

    if (mediaType.encoding !== undefined) {
      newMediaType.encoding = visit(
        this,
        this.transformMap,
        'encoding',
        mediaType.encoding,
        this.transformEncoding,
      );
    }

    return newMediaType;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
   * Response Object}.
   *
   * @param {!object} response Response Object.
   * @returns {!object} Transformed Response Object.
   */
  transformResponse(response) {
    if (typeof response !== 'object'
      || response === null
      || isArray(response)) {
      this.warn('Ignoring non-object Response', response);
      return response;
    }

    const newResponse = { ...response };

    if (response.headers !== undefined) {
      newResponse.headers = visit(
        this,
        this.transformMap,
        'headers',
        response.headers,
        this.transformHeader,
      );
    }

    if (response.content !== undefined) {
      newResponse.content = visit(
        this,
        this.transformMap,
        'content',
        response.content,
        this.transformMediaType,
      );
    }

    if (response.links !== undefined) {
      newResponse.links = visit(
        this,
        this.transformMap,
        'links',
        response.links,
        this.transformLink,
      );
    }

    if (response.schema !== undefined) {
      newResponse.schema = visit(
        this,
        this.transformSchema,
        'schema',
        response.schema,
      );
    }

    if (response.examples !== undefined) {
      newResponse.examples = visit(
        this,
        this.transformExample,
        'examples',
        response.examples,
      );
    }

    return newResponse;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject
   * Parameter Object}.
   *
   * Note: In OpenAPI 2.0, Parameter Object shares many properties with
   * Schema Object (when <code>.in !== 'body'</code>).
   *
   * @param {!object} parameter Parameter Object.
   * @returns {!object} Transformed Parameter Object.
   */
  transformParameter(parameter) {
    if (typeof parameter !== 'object'
      || parameter === null
      || isArray(parameter)) {
      this.warn('Ignoring non-object Parameter', parameter);
      return parameter;
    }

    const newParameter = { ...parameter };

    if (parameter.content !== undefined) {
      newParameter.content = visit(
        this,
        this.transformMap,
        'content',
        parameter.content,
        this.transformMediaType,
      );
    }

    if (parameter.schema !== undefined) {
      newParameter.schema = visit(
        this,
        this.transformSchema,
        'schema',
        parameter.schema,
      );
    }

    if (parameter.items !== undefined) {
      newParameter.items = visit(
        this,
        this.transformItems,
        'items',
        parameter.items,
      );
    }

    if (parameter.examples !== undefined) {
      newParameter.examples = visit(
        this,
        this.transformMap,
        'examples',
        parameter.examples,
        this.transformExample3,
      );
    }

    return newParameter;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responsesObject
   * Responses Object}.
   *
   * @param {!object} responses Responses Object.
   * @returns {!object} Transformed Response Object.
   */
  transformResponses(responses) {
    if (!responses || typeof responses !== 'object' || isArray(responses)) {
      this.warn('Ignoring non-object Responses', responses);
      return responses;
    }

    const newResponses = { ...responses };
    for (const prop of Object.keys(responses)) {
      // Only "default", HTTP response codes, and HTTP response code patterns
      // are defined to contain Response Object.  Other properties may be
      // extensions or defined as something else in future OpenAPI versions.
      //
      // Match using pattern similar to one mentioned in
      // https://github.com/OAI/OpenAPI-Specification/issues/2471#issuecomment-781362295
      // Be lenient about upper/lowercase, and single x in last 2 positions.
      // Although lowercase and single x are not valid, the risk of being
      // anything other than a response object is low enough to justify.
      if (prop === 'default' || /^[1-5][0-9Xx][0-9Xx]$/.test(prop)) {
        const response = responses[prop];
        if (response !== undefined) {
          newResponses[prop] = visit(
            this,
            this.transformResponse,
            prop,
            response,
          );
        }
      } else if (prop !== '$ref' && !prop.startsWith('x-')) {
        this.warn('Ignoring unrecognized property of Responses', prop);
      }
    }

    return newResponses;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#callbackObject
   * Callback Object}.
   *
   * @param {!object} callback Callback Object.
   * @returns {!object} Transformed Callback Object.
   */
  transformCallback(callback) {
    return transformMapLike.call(
      this,
      callback,
      this.transformPathItem,
      'Callback',
      true,
    );
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#requestBodyObject
   * Request Body Object}.
   *
   * @param {!object} requestBody Request Body Object.
   * @returns {!object} Transformed Request Body Object.
   */
  transformRequestBody(requestBody) {
    if (typeof requestBody !== 'object'
      || requestBody === null
      || isArray(requestBody)) {
      this.warn('Ignoring non-object Request Body', requestBody);
      return requestBody;
    }

    if (requestBody.content === undefined) {
      return requestBody;
    }

    return {
      ...requestBody,
      content: visit(
        this,
        this.transformMap,
        'content',
        requestBody.content,
        this.transformMediaType,
      ),
    };
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject
   * Operation Object}.
   *
   * @param {!object} operation Operation Object.
   * @returns {!object} Transformed Operation Object.
   */
  transformOperation(operation) {
    if (typeof operation !== 'object'
      || operation === null
      || isArray(operation)) {
      this.warn('Ignoring non-object Operation', operation);
      return operation;
    }

    const newOperation = { ...operation };

    if (operation.externalDocs !== undefined) {
      newOperation.externalDocs = visit(
        this,
        this.transformExternalDocs,
        'externalDocs',
        operation.externalDocs,
      );
    }

    if (operation.parameters !== undefined) {
      newOperation.parameters =
        this.transformArray(operation.parameters, this.transformParameter);
    }

    if (operation.requestBody !== undefined) {
      newOperation.requestBody = visit(
        this,
        this.transformRequestBody,
        'requestBody',
        operation.requestBody,
      );
    }

    if (operation.responses !== undefined) {
      newOperation.responses = visit(
        this,
        this.transformResponses,
        'responses',
        operation.responses,
      );
    }

    if (operation.callbacks !== undefined) {
      newOperation.callbacks = visit(
        this,
        this.transformMap,
        'callbacks',
        operation.callbacks,
        this.transformCallback,
      );
    }

    if (operation.security !== undefined) {
      newOperation.security = this.transformArray(
        operation.security,
        this.transformSecurityRequirement,
      );
    }

    if (operation.servers !== undefined) {
      newOperation.servers =
        this.transformArray(operation.servers, this.transformServer);
    }

    return newOperation;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject
   * Path Item Object}.
   *
   * @param {!object} pathItem Path Item Object.
   * @returns {!object} Transformed Path Item Object.
   */
  transformPathItem(pathItem) {
    if (typeof pathItem !== 'object'
      || pathItem === null
      || isArray(pathItem)) {
      this.warn('Ignoring non-object Path Item', pathItem);
      return pathItem;
    }

    const newPathItem = { ...pathItem };

    if (pathItem.servers !== undefined) {
      newPathItem.servers =
        this.transformArray(pathItem.servers, this.transformServer);
    }

    if (pathItem.parameters !== undefined) {
      newPathItem.parameters =
        this.transformArray(pathItem.parameters, this.transformParameter);
    }

    for (const method of Object.keys(pathItem)) {
      const operation = pathItem[method];
      if (operation !== undefined && httpMethodSet.has(method.toUpperCase())) {
        newPathItem[method] = visit(
          this,
          this.transformOperation,
          method,
          operation,
        );
      } else if (method !== '$ref'
        && method !== 'description'
        && method !== 'parameters'
        && method !== 'servers'
        && method !== 'summary'
        && !method.startsWith('x-')) {
        this.warn('Ignoring unrecognized property of Path Item', method);
      }
    }

    return newPathItem;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathsObject
   * Paths Object}.
   *
   * Note: Paths Object may be traversed from the x-ms-paths property in
   * addition to the paths property of the OpenAPI Object.
   *
   * @param {!object} paths Paths Object.
   * @returns {!object} Transformed Paths Object.
   */
  transformPaths(paths) {
    return transformMapLike.call(
      this,
      paths,
      this.transformPathItem,
      'Paths',
      true,
    );
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#componentsObject
   * Components Object}.
   *
   * @param {!object} components Components Object.
   * @returns {!object} Transformed Components Object.
   */
  transformComponents(components) {
    if (typeof components !== 'object'
      || components === null
      || isArray(components)) {
      this.warn('Ignoring non-object Components', components);
      return components;
    }

    const newComponents = { ...components };

    if (components.schemas !== undefined) {
      newComponents.schemas = visit(
        this,
        this.transformMap,
        'schemas',
        components.schemas,
        this.transformSchema,
      );
    }

    if (components.responses !== undefined) {
      newComponents.responses = visit(
        this,
        this.transformMap,
        'responses',
        components.responses,
        this.transformResponse,
      );
    }

    if (components.parameters !== undefined) {
      newComponents.parameters = visit(
        this,
        this.transformMap,
        'parameters',
        components.parameters,
        this.transformParameter,
      );
    }

    if (components.examples !== undefined) {
      newComponents.examples = visit(
        this,
        this.transformMap,
        'examples',
        components.examples,
        this.transformExample3,
      );
    }

    if (components.requestBodies !== undefined) {
      newComponents.requestBodies = visit(
        this,
        this.transformMap,
        'requestBodies',
        components.requestBodies,
        this.transformRequestBody,
      );
    }

    if (components.headers !== undefined) {
      newComponents.headers = visit(
        this,
        this.transformMap,
        'headers',
        components.headers,
        this.transformHeader,
      );
    }

    if (components.securitySchemes !== undefined) {
      newComponents.securitySchemes = visit(
        this,
        this.transformMap,
        'securitySchemes',
        components.securitySchemes,
        this.transformSecurityScheme,
      );
    }

    if (components.links !== undefined) {
      newComponents.links = visit(
        this,
        this.transformMap,
        'links',
        components.links,
        this.transformLink,
      );
    }

    if (components.callbacks !== undefined) {
      newComponents.callbacks = visit(
        this,
        this.transformMap,
        'callbacks',
        components.callbacks,
        this.transformCallback,
      );
    }

    if (components.pathItems !== undefined) {
      newComponents.pathItems = visit(
        this,
        this.transformMap,
        'pathItems',
        components.pathItems,
        this.transformPathItem,
      );
    }

    return newComponents;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverVariableObject
   * Server Variable Object}.
   *
   * @param {!object} serverVariable Server Variable Object.
   * @returns {!object} Transformed Server Variable Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformServerVariable(serverVariable) {
    return serverVariable;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverObject
   * Server Object}.
   *
   * @param {!object} server Server Object.
   * @returns {!object} Transformed Server Object.
   */
  transformServer(server) {
    if (typeof server !== 'object' || server === null || isArray(server)) {
      this.warn('Ignoring non-object Server', server);
      return server;
    }

    if (server.variables === undefined) {
      return server;
    }

    return {
      ...server,
      variables: visit(
        this,
        this.transformMap,
        'variables',
        server.variables,
        this.transformServerVariable,
      ),
    };
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject
   * OAuth Flow Object}.
   *
   * @param {!object} flow OAuth Flow Object.
   * @returns {!object} Transformed OAuth Flow Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformOAuthFlow(flow) {
    return flow;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowsObject
   * OAuth Flows Object}.
   *
   * @param {!object} flows OAuth Flows Object.
   * @returns {!object} Transformed OAuth Flows Object.
   */
  transformOAuthFlows(flows) {
    if (typeof flows !== 'object' || flows === null || isArray(flows)) {
      this.warn('Ignoring non-object OAuth Flows', flows);
      return flows;
    }

    const newFlows = { ...flows };

    if (flows.implicit) {
      newFlows.implicit = visit(
        this,
        this.transformOAuthFlow,
        'implicit',
        flows.implicit,
      );
    }

    if (flows.password) {
      newFlows.password = visit(
        this,
        this.transformOAuthFlow,
        'password',
        flows.password,
      );
    }

    if (flows.clientCredentials) {
      newFlows.clientCredentials = visit(
        this,
        this.transformOAuthFlow,
        'clientCredentials',
        flows.clientCredentials,
      );
    }

    if (flows.authorizationCode) {
      newFlows.authorizationCode = visit(
        this,
        this.transformOAuthFlow,
        'authorizationCode',
        flows.authorizationCode,
      );
    }

    return newFlows;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securitySchemeObject
   * Security Scheme Object}.
   *
   * @param {!object} securityScheme Security Scheme Object.
   * @returns {!object} Transformed Security Scheme Object.
   */
  transformSecurityScheme(securityScheme) {
    if (typeof securityScheme !== 'object'
      || securityScheme === null
      || isArray(securityScheme)) {
      this.warn('Ignoring non-object Security Scheme', securityScheme);
      return securityScheme;
    }

    if (securityScheme.flows === undefined) {
      return securityScheme;
    }

    return {
      ...securityScheme,
      flows: visit(
        this,
        this.transformOAuthFlows,
        'flows',
        securityScheme.flows,
      ),
    };
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securityRequirementObject
   * Security Requirement Object}.
   *
   * @param {!object} securityRequirement Security Requirement Object.
   * @returns {!object} Transformed Security Requirement Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformSecurityRequirement(securityRequirement) {
    return securityRequirement;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#tagObject
   * Tag Object}.
   *
   * @param {!object} tag Tag Object.
   * @returns {!object} Transformed Tag Object.
   */
  transformTag(tag) {
    if (typeof tag !== 'object' || tag === null || isArray(tag)) {
      this.warn('Ignoring non-object Tag', tag);
      return tag;
    }

    if (tag.externalDocs === undefined) {
      return tag;
    }

    return {
      ...tag,
      externalDocs: visit(
        this,
        this.transformExternalDocs,
        'externalDocs',
        tag.externalDocs,
      ),
    };
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#contactObject
   * Contact Object}.
   *
   * @param {!object} contact Contact Object.
   * @returns {!object} Transformed Contact Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformContact(contact) {
    return contact;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#licenseObject
   * License Object}.
   *
   * @param {!object} license License Object.
   * @returns {!object} Transformed License Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformLicense(license) {
    return license;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#infoObject
   * Info Object}.
   *
   * @param {!object} info Info Object.
   * @returns {!object} Transformed Info Object.
   */
  transformInfo(info) {
    if (typeof info !== 'object' || info === null || isArray(info)) {
      this.warn('Ignoring non-object Info', info);
      return info;
    }

    const newInfo = { ...info };

    if (info.contact !== undefined) {
      newInfo.contact = visit(
        this,
        this.transformContact,
        'contact',
        info.contact,
      );
    }

    if (info.license !== undefined) {
      newInfo.license = visit(
        this,
        this.transformLicense,
        'license',
        info.license,
      );
    }

    return info;
  }

  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oasObject
   * OpenAPI 3.0 Object} or {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#swagger-object
   * OpenAPI 2.0 (fka Swagger) Object}.
   *
   * @param {!object} openApi OpenAPI Object.
   * @returns {!object} Transformed OpenAPI Object.
   */
  transformOpenApi(openApi) {
    if (typeof openApi !== 'object' || openApi === null || isArray(openApi)) {
      this.warn('Ignoring non-object OpenAPI', openApi);
      return openApi;
    }

    const newOpenApi = {
      ...openApi,
    };

    if (openApi.info !== undefined) {
      newOpenApi.info = visit(this, this.transformInfo, 'info', openApi.info);
    }

    if (openApi.servers !== undefined) {
      newOpenApi.servers =
        this.transformArray(openApi.servers, this.transformServer);
    }

    // https://github.com/Azure/autorest/blob/master/docs/extensions/readme.md#x-ms-parameterized-host
    const xMsParameterizedHost = openApi['x-ms-parameterized-host'];
    if (typeof xMsParameterizedHost === 'object'
      && xMsParameterizedHost !== null) {
      const { parameters } = xMsParameterizedHost;
      if (parameters !== undefined) {
        newOpenApi['x-ms-parameterized-host'] = {
          ...xMsParameterizedHost,
          parameters: this.transformArray(parameters, this.transformParameter),
        };
      }
    }

    // Note: Transform components and definitions before properties likely
    // to have $refs pointing to them (to simplify renaming).
    // TODO: Guarantee this as part of the API?  Document in JSDoc comment.
    if (openApi.components !== undefined) {
      newOpenApi.components = visit(
        this,
        this.transformComponents,
        'components',
        openApi.components,
      );
    }

    if (openApi.definitions !== undefined) {
      newOpenApi.definitions = visit(
        this,
        this.transformMap,
        'definitions',
        openApi.definitions,
        this.transformSchema,
      );
    }

    if (openApi.parameters !== undefined) {
      newOpenApi.parameters = visit(
        this,
        this.transformMap,
        'parameters',
        openApi.parameters,
        this.transformParameter,
      );
    }

    if (openApi.responses !== undefined) {
      newOpenApi.responses = visit(
        this,
        this.transformMap,
        'responses',
        openApi.responses,
        this.transformResponse,
      );
    }

    if (openApi.paths !== undefined) {
      newOpenApi.paths = visit(
        this,
        this.transformPaths,
        'paths',
        openApi.paths,
      );
    }

    // https://github.com/Azure/autorest/tree/master/docs/extensions#x-ms-paths
    if (openApi['x-ms-paths'] !== undefined) {
      newOpenApi['x-ms-paths'] = visit(
        this,
        this.transformPaths,
        'x-ms-paths',
        openApi['x-ms-paths'],
      );
    }

    if (openApi.webhooks !== undefined) {
      newOpenApi.webhooks = visit(
        this,
        this.transformMap,
        'webhooks',
        openApi.webhooks,
        this.transformPathItem,
      );
    }

    if (openApi.security !== undefined) {
      newOpenApi.security = this.transformArray(
        openApi.security,
        this.transformSecurityRequirement,
      );
    }

    if (openApi.tags !== undefined) {
      newOpenApi.tags = this.transformArray(openApi.tags, this.transformTag);
    }

    if (openApi.externalDocs !== undefined) {
      newOpenApi.externalDocs = visit(
        this,
        this.transformExternalDocs,
        'externalDocs',
        openApi.externalDocs,
      );
    }

    return newOpenApi;
  }

  /** Logs a warning about the transformation.
   *
   * Logs to util.debuglog('openapi-transformer-base') by default.  Designed
   * to be overridden and/or reassigned to log as appropriate for projects
   * which use this class.
   *
   * @param {string|*} message Message with zero or more substitution strings,
   * or first value to log.
   * @param {*} values Additional values to log.  Applied to substitution
   * string in message, if one matches, otherwise appended.
   */
  warn(message, ...values) {
    // Note: debug.enabled defined on Node.js v14.9.0 and later
    if (debug.enabled !== false) {
      debug(message, ...values, 'at', toJsonPointer(this.transformPath));
    }
  }
}

module.exports = OpenApiTransformerBase;
