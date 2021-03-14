/**
 * @copyright Copyright 2019-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 * @module openapi-transformer-base
 */

'use strict';

const { isArray } = Array;

/** HTTP method names which are properties of a Path Item Object that have
 * Operation Object values.
 *
 * @private
 */
const PATH_METHODS = [
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
];

/** Creates a copy of an object with values from a transform function.
 *
 * i.e. Array.prototype.map for objects.
 * Like _.mapValues from lodash
 * Like https://github.com/sindresorhus/modify-values
 *
 * Unlike the above:
 * - If the first argument is not an object, it is returned unchanged.
 * - If the first argument is an Array, it is returned unchanged.
 * - If the first argument is a non-null object, the returned object will be
 *   a new object with prototype Object.prototype and properties matching the
 *   first argument with transformed values.
 *
 * @private
 * @template T
 * @param {T} obj Object for which to map values.
 * @param {function(*): *} transform Function which maps input to output values.
 * @param {*} thisArg Value passed to `transform` as `this`.
 * @returns {T} Object with same prototype and keys as `obj`, where the
 * value for each key is the result of calling `transform` on `obj[key]`.
 */
function mapValues(obj, transform, thisArg) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (isArray(obj)) {
    // Note: This function is only called for values specified as Map[X,Y]
    // in the OpenAPI Specification.  Array values are invalid and it would
    // be unsafe to assume that their contents are type Y.  Return unchanged.
    return obj;
  }

  const newObj = { ...obj };
  for (const [propName, propValue] of Object.entries(obj)) {
    if (propValue !== undefined) {
      newObj[propName] = transform.call(thisArg, propValue);
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
   * {@see transformParameter} and {@see transformItems} to transform all
   * schema-like objects.
   *
   * @param {!object} schema Schema Object.
   * @returns {!object} Transformed Schema Object.
   */
  transformSchema(schema) {
    if (typeof schema !== 'object' || schema === null || isArray(schema)) {
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
      newSchema.discriminator = this.transformDiscriminator(discriminator);
    }

    if (externalDocs !== undefined) {
      newSchema.externalDocs = this.transformExternalDocs(externalDocs);
    }

    if (xml !== undefined) {
      newSchema.xml = this.transformXml(xml);
    }

    if (items !== undefined) {
      // Note: OpenAPI 3.0 disallows Arrays, 2.0 and 3.1 drafts allow it
      if (isArray(items)) {
        newSchema.items = items.map(this.transformSchema, this);
      } else {
        newSchema.items = this.transformSchema(items);
      }
    }

    for (const schemaProp of ['if', 'then', 'else', 'not']) {
      const subSchema = schema[schemaProp];
      if (subSchema !== undefined) {
        newSchema[schemaProp] = this.transformSchema(subSchema);
      }
    }

    if (properties !== undefined) {
      newSchema.properties =
        mapValues(properties, this.transformSchema, this);
    }

    if (patternProperties !== undefined) {
      newSchema.patternProperties =
        mapValues(patternProperties, this.transformSchema, this);
    }

    if (unevaluatedProperties !== undefined) {
      newSchema.unevaluatedProperties =
        this.transformSchema(unevaluatedProperties);
    }

    if (propertyNames !== undefined) {
      newSchema.propertyNames = this.transformSchema(propertyNames);
    }

    // Note: JSON Schema Core draft-handrews-json-schema-02 (referenced by
    // current/ OpenAPI 3.1 drafts) defines true and false as valid schemas
    // with true equivalent to {} and false equivalent to {not:{}}
    // https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.section.4.3.2
    // so they are now passed to transformSchema.
    for (const schemaProp of ['additionalItems', 'additionalProperties']) {
      const additionalItemsProps = schema[schemaProp];
      if (additionalItemsProps !== undefined) {
        newSchema[schemaProp] = this.transformSchema(additionalItemsProps);
      }
    }

    if (unevaluatedItems !== undefined) {
      newSchema.unevaluatedItems =
        this.transformSchema(unevaluatedItems);
    }

    if (dependentSchemas !== undefined) {
      newSchema.dependentSchemas =
        mapValues(dependentSchemas, this.transformSchema, this);
    }

    if (contains !== undefined) {
      newSchema.contains = this.transformSchema(contains);
    }

    for (const schemaProp of ['allOf', 'anyOf', 'oneOf']) {
      const subSchemas = schema[schemaProp];
      if (isArray(subSchemas)) {
        newSchema[schemaProp] = subSchemas.map(this.transformSchema, this);
      }
    }

    // Note: The examples property is an Array of values, as defined by JSON
    // Schema, and is therefore not suitable for any transformExample* method.
    // See https://github.com/OAI/OpenAPI-Specification/issues/2094

    return newSchema;
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
    if (typeof items !== 'object'
      || items === null
      || isArray(items)
      || items.items === undefined) {
      return items;
    }

    return {
      ...items,
      items: this.transformItems(items.items),
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
      || isArray(header)
      || header.schema === undefined) {
      return header;
    }

    return {
      ...header,
      schema: this.transformSchema(header.schema),
    };
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
      || isArray(encoding)
      || encoding.headers === undefined) {
      return encoding;
    }

    return {
      ...encoding,
      headers: mapValues(encoding.headers, this.transformHeader, this),
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
      || isArray(link)
      || link.server === undefined) {
      return link;
    }

    return {
      ...link,
      server: this.transformServer(link.server),
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
      return mediaType;
    }

    const newMediaType = { ...mediaType };

    if (mediaType.schema !== undefined) {
      newMediaType.schema = this.transformSchema(mediaType.schema);
    }

    if (mediaType.encoding !== undefined) {
      newMediaType.encoding =
        mapValues(mediaType.encoding, this.transformEncoding, this);
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
      return response;
    }

    const newResponse = { ...response };

    if (response.headers !== undefined) {
      newResponse.headers =
        mapValues(response.headers, this.transformHeader, this);
    }

    if (response.content !== undefined) {
      newResponse.content =
        mapValues(response.content, this.transformMediaType, this);
    }

    if (response.links !== undefined) {
      newResponse.links =
        mapValues(response.links, this.transformLink, this);
    }

    if (response.schema !== undefined) {
      newResponse.schema = this.transformSchema(response.schema);
    }

    if (response.examples !== undefined) {
      newResponse.examples = this.transformExample(response.examples);
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
      return parameter;
    }

    const newParameter = { ...parameter };

    if (parameter.content !== undefined) {
      newParameter.content =
        mapValues(parameter.content, this.transformMediaType, this);
    }

    if (parameter.schema !== undefined) {
      newParameter.schema = this.transformSchema(parameter.schema);
    }

    if (parameter.items !== undefined) {
      newParameter.items = this.transformItems(parameter.items);
    }

    if (parameter.examples !== undefined) {
      newParameter.examples =
        mapValues(parameter.examples, this.transformExample3, this);
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
      if (prop === 'default' || /^[1-5]([0-9][0-9]|XX)$/.test(prop)) {
        const response = responses[prop];
        if (response !== undefined) {
          newResponses[prop] = this.transformResponse(response);
        }
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
    return mapValues(callback, this.transformPathItem, this);
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
      || isArray(requestBody)
      || requestBody.content === undefined) {
      return requestBody;
    }

    return {
      ...requestBody,
      content: mapValues(requestBody.content, this.transformMediaType, this),
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
      return operation;
    }

    const newOperation = { ...operation };

    if (operation.externalDocs !== undefined) {
      newOperation.externalDocs =
        this.transformExternalDocs(operation.externalDocs);
    }

    if (isArray(operation.parameters)) {
      newOperation.parameters =
        operation.parameters.map(this.transformParameter, this);
    }

    if (operation.requestBody && operation.requestBody.content) {
      newOperation.requestBody =
        this.transformRequestBody(operation.requestBody);
    }

    if (operation.responses !== undefined) {
      newOperation.responses = this.transformResponses(operation.responses);
    }

    if (operation.callbacks !== undefined) {
      newOperation.callbacks =
        mapValues(operation.callbacks, this.transformCallback, this);
    }

    if (isArray(operation.security)) {
      newOperation.security =
        operation.security.map(this.transformSecurityRequirement, this);
    }

    if (isArray(operation.servers)) {
      newOperation.servers = operation.servers.map(this.transformServer, this);
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
      return pathItem;
    }

    const newPathItem = { ...pathItem };

    if (isArray(pathItem.parameters)) {
      newPathItem.parameters =
        pathItem.parameters.map(this.transformParameter, this);
    }

    for (const method of PATH_METHODS) {
      const operation = pathItem[method];
      if (operation !== undefined) {
        newPathItem[method] = this.transformOperation(operation);
      }
    }

    return newPathItem;
  }

  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathsObject
   * Paths Object}.
   *
   * @param {!object} paths Paths Object.
   * @returns {!object} Transformed Paths Object.
   */
  transformPaths(paths) {
    return mapValues(paths, this.transformPathItem, this);
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
      return components;
    }

    const newComponents = { ...components };

    if (components.schemas !== undefined) {
      newComponents.schemas =
        mapValues(components.schemas, this.transformSchema, this);
    }

    if (components.responses !== undefined) {
      newComponents.responses =
        mapValues(components.responses, this.transformResponse, this);
    }

    if (components.parameters !== undefined) {
      newComponents.parameters =
        mapValues(components.parameters, this.transformParameter, this);
    }

    if (components.examples !== undefined) {
      newComponents.examples =
        mapValues(components.examples, this.transformExample3, this);
    }

    if (components.requestBodies !== undefined) {
      newComponents.requestBodies =
        mapValues(components.requestBodies, this.transformRequestBody, this);
    }

    if (components.headers !== undefined) {
      newComponents.headers =
        mapValues(components.headers, this.transformHeader, this);
    }

    if (components.securitySchemes !== undefined) {
      newComponents.securitySchemes = mapValues(
        components.securitySchemes,
        this.transformSecurityScheme,
        this,
      );
    }

    if (components.links !== undefined) {
      newComponents.links =
        mapValues(components.links, this.transformLink, this);
    }

    if (components.callbacks !== undefined) {
      newComponents.callbacks =
        mapValues(components.callbacks, this.transformCallback, this);
    }

    if (components.pathItems !== undefined) {
      newComponents.pathItems =
        mapValues(components.pathItems, this.transformPathItem, this);
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
    if (typeof server !== 'object'
      || server === null
      || isArray(server)
      || server.variables === undefined) {
      return server;
    }

    return {
      ...server,
      variables:
        mapValues(server.variables, this.transformServerVariable, this),
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
      return flows;
    }

    const newFlows = { ...flows };

    if (flows.implicit) {
      newFlows.implicit = this.transformOAuthFlow(flows.implicit);
    }

    if (flows.password) {
      newFlows.password = this.transformOAuthFlow(flows.password);
    }

    if (flows.clientCredentials) {
      newFlows.clientCredentials =
        this.transformOAuthFlow(flows.clientCredentials);
    }

    if (flows.authorizationCode) {
      newFlows.authorizationCode =
        this.transformOAuthFlow(flows.authorizationCode);
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
      || isArray(securityScheme)
      || securityScheme.flows === undefined) {
      return securityScheme;
    }

    return {
      ...securityScheme,
      flows: this.transformOAuthFlows(securityScheme.flows),
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
    if (typeof tag !== 'object'
      || tag === null
      || isArray(tag)
      || tag.externalDocs === undefined) {
      return tag;
    }

    return {
      ...tag,
      externalDocs: this.transformExternalDocs(tag.externalDocs),
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
      return info;
    }

    const newInfo = { ...info };

    if (info.contact !== undefined) {
      newInfo.contact = this.transformContact(info.contact);
    }

    if (info.license !== undefined) {
      newInfo.license = this.transformLicense(info.license);
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
      return openApi;
    }

    const newOpenApi = {
      ...openApi,
    };

    if (openApi.info !== undefined) {
      newOpenApi.info = this.transformInfo(openApi.info);
    }

    if (isArray(openApi.servers)) {
      newOpenApi.servers = openApi.servers.map(this.transformServer, this);
    }

    if (openApi.components !== undefined) {
      newOpenApi.components = this.transformComponents(openApi.components);
    }

    if (openApi.definitions !== undefined) {
      newOpenApi.definitions =
        mapValues(openApi.definitions, this.transformSchema, this);
    }

    if (openApi.parameters !== undefined) {
      newOpenApi.parameters =
        mapValues(openApi.parameters, this.transformParameter, this);
    }

    if (openApi.responses !== undefined) {
      newOpenApi.responses =
        mapValues(openApi.responses, this.transformResponse, this);
    }

    if (openApi.paths !== undefined) {
      newOpenApi.paths = this.transformPaths(openApi.paths);
    }

    if (openApi.webhooks !== undefined) {
      newOpenApi.webhooks =
        mapValues(openApi.webhooks, this.transformPathItem, this);
    }

    if (isArray(openApi.security)) {
      newOpenApi.security =
        openApi.security.map(this.transformSecurityRequirement, this);
    }

    if (isArray(openApi.tags)) {
      newOpenApi.tags = openApi.tags.map(this.transformTag, this);
    }

    if (openApi.externalDocs !== undefined) {
      newOpenApi.externalDocs =
        this.transformExternalDocs(openApi.externalDocs);
    }

    return newOpenApi;
  }
}

module.exports = OpenApiTransformerBase;
