/**
 * @copyright Copyright 2019-2020 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */

'use strict';

/** HTTP method names which are properties of a Path Item Object that have
 * Operation Object values.
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
 * Like _.mapValues from lodash.
 *
 * @private
 * @param {!Object} obj Object for which to map values.
 * @param {function(*): *} transform Function which maps input to output values.
 * @param {*} thisArg Value passed to `transform` as `this`.
 * @return {!Object} Object with same prototype and keys as `obj`, where the
 * value for each key is the result of calling `transform` on `obj[key]`.
 */
function mapValues(obj, transform, thisArg) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  return Object.keys(obj)
    .reduce(
      (newObj, propName) => {
        newObj[propName] = transform.call(thisArg, obj[propName]);
        return newObj;
      },
      Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj)),
    );
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
 * <li>Properties with value <code>undefined</code> are not transformed (since
 *   <code>undefined</code> is not directly representable in JSON, it has no
 *   defined significance in OpenAPI).</li>
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
   * @param {!Object} discriminator Discriminator Object.
   * @return {!Object} Transformed Discriminator Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformDiscriminator(discriminator) {
    return discriminator;
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#exampleObject
   * OpenAPI 2.0 Example Object}.
   *
   * @param {!Object} example OpenAPI 2.0 Example Object.
   * @return {!Object} Transformed Example Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExample(example) {
    return example;
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject
   * OpenAPI 3.x Example Object}.
   *
   * @param {!Object} example OpenAPI 3.x Example Object.
   * @return {!Object} Transformed Example Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExample3(example) {
    return example;
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#exampleObject
   * OpenAPI 3.x Example Object}.
   *
   * This occurs for components.examples, parameter.examples, and
   * mediaType.examples.  Note that it does not occur as schema.examples,
   * which is an Array of values (not Example Objects), as defined by JSON
   * Schema.  See
   * https://github.com/OAI/OpenAPI-Specification/issues/2094
   *
   * @param {!Object<string,!Object>} examples Map from string to OpenAPI 3.x
   * Example Object.
   * @return {!Object<string,!Object>} Transformed Map of Example Objects.
   */
  transformExample3Map(examples) {
    return mapValues(examples, this.transformExample3, this);
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject
   * External Documentation Object}.
   *
   * @param {!Object} externalDocs External Documentation Object.
   * @return {!Object} Transformed External Documentation Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformExternalDocs(externalDocs) {
    return externalDocs;
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#xmlObject
   * XML Object}.
   *
   * @param {!Object} xml XML Object.
   * @return {!Object} Transformed XML Object.
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
   * @param {!Object} schema Schema Object.
   * @return {!Object} Transformed Schema Object.
   */
  transformSchema(schema) {
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }

    const newSchema = { ...schema };

    if (schema.discriminator !== undefined) {
      newSchema.discriminator =
        this.transformDiscriminator(schema.discriminator);
    }

    if (schema.externalDocs !== undefined) {
      newSchema.externalDocs = this.transformExternalDocs(schema.externalDocs);
    }

    if (schema.xml !== undefined) {
      newSchema.xml = this.transformXml(schema.xml);
    }

    ['additionalProperties', 'items', 'not'].forEach((schemaProp) => {
      const subSchema = schema[schemaProp];
      if (subSchema && typeof subSchema === 'object') {
        newSchema[schemaProp] = this.transformSchema(subSchema);
      }
    });

    if (schema.properties !== undefined) {
      newSchema.properties = this.transformSchemaMap(schema.properties);
    }

    ['allOf', 'anyOf', 'oneOf'].forEach((schemaProp) => {
      const subSchemas = schema[schemaProp];
      if (subSchemas !== undefined) {
        newSchema[schemaProp] = this.transformSchemaArray(subSchemas);
      }
    });

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
   * @param {!Object} items Items Object.
   * @return {!Object} Transformed Items Object.
   */
  transformItems(items) {
    if (typeof items !== 'object'
      || items === null
      || items.items === undefined) {
      return items;
    }

    return {
      ...items,
      items: this.transformItems(items.items),
    };
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject
   * Schema Object}.
   *
   * This occurs for schema.allOf, schema.anyOf, schema.oneOf.
   *
   * @param {!Array<!Object>} schemas Array of Schema Object.
   * @return {!Array<!Object>} Transformed Array of Schema Objects.
   */
  transformSchemaArray(schemas) {
    return mapValues(schemas, this.transformSchema, this);
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#schemaObject
   * Schema Object}.
   *
   * This occurs for components.schemas, definitions, and properties of a
   * schema.
   *
   * @param {!Object<string,!Object>} schemas Map from string to Schema
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Schema Objects.
   */
  transformSchemaMap(schemas) {
    return mapValues(schemas, this.transformSchema, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#headerObject
   * Header Object}.
   *
   * @param {!Object} header Header Object.
   * @return {!Object} Transformed Header Object.
   */
  transformHeader(header) {
    if (typeof header !== 'object'
      || header === null
      || header.schema === undefined) {
      return header;
    }

    return {
      ...header,
      schema: this.transformSchema(header.schema),
    };
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#headerObject
   * Header Object}.
   *
   * This occurs for components.headers, encoding.headers, and
   * response.headers.
   *
   * @param {!Object<string,!Object>} headers Map from string to Header Object.
   * @return {!Object<string,!Object>} Transformed Map of Header Objects.
   */
  transformHeaderMap(headers) {
    return mapValues(headers, this.transformHeader, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#encodingObject
   * Encoding Object}.
   *
   * @param {!Object} encoding Encoding Object.
   * @return {!Object} Transformed Encoding Object.
   */
  transformEncoding(encoding) {
    if (typeof encoding !== 'object'
      || encoding === null
      || encoding.headers === undefined) {
      return encoding;
    }

    return {
      ...encoding,
      headers: this.transformHeaderMap(encoding.headers),
    };
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#encodingObject
   * Encoding Object}.
   *
   * This occurs for mediaType.encoding.
   *
   * @param {!Object<string,!Object>} encodings Map from string to Encoding
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Encoding Objects.
   */
  transformEncodingMap(encodings) {
    return mapValues(encodings, this.transformEncoding, this);
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#linkObject
   * Link Object}.
   *
   * @param {!Object} link Link Object.
   * @return {!Object} Transformed Link Object.
   */
  transformLink(link) {
    if (typeof link !== 'object'
      || link === null
      || link.server === undefined) {
      return link;
    }

    return {
      ...link,
      server: this.transformServer(link.server),
    };
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#linkObject
   * Link Object}.
   *
   * This occurs for components.links and response.links.
   *
   * @param {!Object<string,!Object>} links Map from string to Link Object.
   * @return {!Object<string,!Object>} Transformed Map of Link Objects.
   */
  transformLinkMap(links) {
    return mapValues(links, this.transformLink, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#mediaTypeObject
   * Media Type Object}.
   *
   * @param {!Object} mediaType Media Type Object.
   * @return {!Object} Transformed Media Type Object.
   */
  transformMediaType(mediaType) {
    if (typeof mediaType !== 'object' || mediaType === null) {
      return mediaType;
    }

    const newMediaType = { ...mediaType };

    if (mediaType.schema !== undefined) {
      newMediaType.schema = this.transformSchema(mediaType.schema);
    }

    if (mediaType.encoding !== undefined) {
      newMediaType.encoding =
        this.transformEncodingMap(mediaType.encoding);
    }

    return newMediaType;
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#mediaTypeObject
   * Media Type Object}.
   *
   * This occurs for response.content, parameter.content, and
   * requestBody.content.
   *
   * @param {!Object<string,!Object>} mediaTypes Map from string to Media Type
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Media Type Object.
   */
  transformMediaTypeMap(mediaTypes) {
    return mapValues(mediaTypes, this.transformMediaType, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
   * Response Object}.
   *
   * @param {!Object} response Response Object.
   * @return {!Object} Transformed Response Object.
   */
  transformResponse(response) {
    if (typeof response !== 'object' || response === null) {
      return response;
    }

    const newResponse = { ...response };

    if (response.headers !== undefined) {
      newResponse.headers = this.transformHeaderMap(response.headers);
    }

    if (response.content !== undefined) {
      newResponse.content = this.transformMediaTypeMap(response.content);
    }

    if (response.links !== undefined) {
      newResponse.links = this.transformLinkMap(response.links);
    }

    if (response.schema !== undefined) {
      newResponse.schema = this.transformSchema(response.schema);
    }

    if (response.examples !== undefined) {
      newResponse.examples = this.transformExample(response.examples);
    }

    return newResponse;
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
   * Response Object}.
   *
   * This occurs for operation.responses, components.responses, and
   * openApi.responses.
   *
   * @param {!Object<string,!Object>} mediaTypes Map from string to Response
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Response Object.
   */
  transformResponseMap(responses) {
    return mapValues(responses, this.transformResponse, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject
   * Parameter Object}.
   *
   * Note: In OpenAPI 2.0, Parameter Object shares many properties with
   * Schema Object (when <code>.in !== 'body'</code>).
   *
   * @param {!Object} parameter Parameter Object.
   * @return {!Object} Transformed Parameter Object.
   */
  transformParameter(parameter) {
    if (typeof parameter !== 'object' || parameter === null) {
      return parameter;
    }

    const newParameter = { ...parameter };

    if (parameter.content !== undefined) {
      newParameter.content = this.transformMediaTypeMap(parameter.content);
    }

    if (parameter.schema !== undefined) {
      newParameter.schema = this.transformSchema(parameter.schema);
    }

    if (parameter.items !== undefined) {
      newParameter.items = this.transformItems(parameter.items);
    }

    if (parameter.examples !== undefined) {
      newParameter.examples = this.transformExample3Map(parameter.examples);
    }

    return newParameter;
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject
   * Parameter Object}.
   *
   * This occurs for operation.parameters and pathItem.parameters.
   *
   * @param {!Array<!Object>} parameters Array of Parameter Object.
   * @return {!Array<!Object>} Transformed Array of Parameter Object.
   */
  transformParameterArray(parameters) {
    return mapValues(parameters, this.transformParameter, this);
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterObject
   * Parameter Object}.
   *
   * This occurs for components.parameters and openApi.parameters.
   *
   * @param {!Object<string,!Object>} parameters Map from string to Parameter
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Parameter Object.
   */
  transformParameterMap(parameters) {
    return mapValues(parameters, this.transformParameter, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#callbackObject
   * Callback Object}.
   *
   * @param {!Object} callback Callback Object.
   * @return {!Object} Transformed Callback Object.
   */
  transformCallback(callback) {
    return mapValues(callback, this.transformPathItem, this);
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#callbackObject
   * Callback Object}.
   *
   * This occurs for operation.callbacks.
   *
   * @param {!Object<string,!Object>} callbacks Map from string to Callback
   * Object.
   * @return {!Object<string,!Object>} Transformed Map of Callback Object.
   */
  transformCallbackMap(callbacks) {
    return mapValues(callbacks, this.transformCallback, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#requestBodyObject
   * Request Body Object}.
   *
   * @param {!Object} requestBody Request Body Object.
   * @return {!Object} Transformed Request Body Object.
   */
  transformRequestBody(requestBody) {
    if (typeof requestBody !== 'object'
      || requestBody === null
      || requestBody.content === undefined) {
      return requestBody;
    }

    return {
      ...requestBody,
      content: this.transformMediaTypeMap(requestBody.content),
    };
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#requestBodyObject
   * Request Body Object}.
   *
   * This occurs for components.requestBodies.
   *
   * @param {!Object<string,!Object>} requestBodies Map from string to Request
   * Body Object.
   * @return {!Object<string,!Object>} Transformed Map of Request Body Object.
   */
  transformRequestBodyMap(requestBodies) {
    return mapValues(requestBodies, this.transformRequestBody, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject
   * Operation Object}.
   *
   * @param {!Object} operation Operation Object.
   * @return {!Object} Transformed Operation Object.
   */
  transformOperation(operation) {
    if (typeof operation !== 'object' || operation === null) {
      return operation;
    }

    const newOperation = { ...operation };

    if (operation.externalDocs !== undefined) {
      newOperation.externalDocs =
        this.transformExternalDocs(operation.externalDocs);
    }

    if (operation.parameters !== undefined) {
      newOperation.parameters =
        this.transformParameterArray(operation.parameters);
    }

    if (operation.requestBody && operation.requestBody.content) {
      newOperation.requestBody =
        this.transformRequestBody(operation.requestBody);
    }

    if (operation.responses !== undefined) {
      newOperation.responses = this.transformResponseMap(operation.responses);
    }

    if (operation.callbacks !== undefined) {
      newOperation.callbacks = this.transformCallbackMap(operation.callbacks);
    }

    return newOperation;
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject
   * Path Item Object}.
   *
   * @param {!Object} pathItem Path Item Object.
   * @return {!Object} Transformed Path Item Object.
   */
  transformPathItem(pathItem) {
    if (typeof pathItem !== 'object' || pathItem === null) {
      return pathItem;
    }

    const newPathItem = { ...pathItem };

    if (pathItem.parameters !== undefined) {
      newPathItem.parameters =
        this.transformParameterArray(pathItem.parameters);
    }

    PATH_METHODS.forEach((method) => {
      if (hasOwnProperty.call(pathItem, method)) {
        newPathItem[method] = this.transformOperation(pathItem[method]);
      }
    });

    return newPathItem;
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathsObject
   * Paths Object}.
   *
   * @param {!Object} paths Paths Object.
   * @return {!Object} Transformed Paths Object.
   */
  transformPaths(paths) {
    return mapValues(paths, this.transformPathItem, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#componentsObject
   * Components Object}.
   *
   * @param {!Object} components Components Object.
   * @return {!Object} Transformed Components Object.
   */
  transformComponents(components) {
    if (typeof components !== 'object' || components === null) {
      return components;
    }

    const newComponents = { ...components };

    if (components.schemas !== undefined) {
      newComponents.schemas = this.transformSchemaMap(components.schemas);
    }

    if (components.responses !== undefined) {
      newComponents.responses = this.transformResponseMap(components.responses);
    }

    if (components.parameters !== undefined) {
      newComponents.parameters =
        this.transformParameterMap(components.parameters);
    }

    if (components.examples !== undefined) {
      newComponents.examples = this.transformExample3Map(components.examples);
    }

    if (components.requestBodies !== undefined) {
      newComponents.requestBodies =
        this.transformRequestBodyMap(components.requestBodies);
    }

    if (components.headers !== undefined) {
      newComponents.headers = this.transformHeaderMap(components.headers);
    }

    if (components.securitySchemes !== undefined) {
      newComponents.securitySchemes =
        this.transformSecuritySchemeMap(components.securitySchemes);
    }

    if (components.links !== undefined) {
      newComponents.links = this.transformLinkMap(components.links);
    }

    if (components.callbacks !== undefined) {
      newComponents.callbacks = this.transformCallbackMap(components.callbacks);
    }

    return newComponents;
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverVariableObject
   * Server Variable Object}.
   *
   * @param {!Object} serverVariable Server Variable Object.
   * @return {!Object} Transformed Server Variable Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformServerVariable(serverVariable) {
    return serverVariable;
  }


  /** Transforms a Map from string to {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverVariableObject
   * Server Variable Object}.
   *
   * This occurs for server.variables.
   *
   * @param {!Object<string,!Object>} serverVariables Map from string to
   * Server Variable Object.
   * @return {!Object<string,!Object>} Transformed Map of Server Variable
   * Object.
   */
  transformServerVariableMap(serverVariables) {
    return mapValues(serverVariables, this.transformServerVariable, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverObject
   * Server Object}.
   *
   * @param {!Object} server Server Object.
   * @return {!Object} Transformed Server Object.
   */
  transformServer(server) {
    if (typeof server !== 'object'
      || server === null
      || server.variables === undefined) {
      return server;
    }

    return {
      ...server,
      variables: this.transformServerVariableMap(server.variables),
    };
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#serverObject
   * Server Object}.
   *
   * This occurs for components.servers.
   *
   * @param {!Array<!Object>} servers Array of Server Object.
   * @return {!Object<string,!Object>} Transformed Array of Server Object.
   */
  transformServers(servers) {
    return mapValues(servers, this.transformServer, this);
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowObject
   * OAuth Flow Object}.
   *
   * @param {!Object} flow OAuth Flow Object.
   * @return {!Object} Transformed OAuth Flow Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformOAuthFlow(flow) {
    return flow;
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oauthFlowsObject
   * OAuth Flows Object}.
   *
   * @param {!Object} flows OAuth Flows Object.
   * @return {!Object} Transformed OAuth Flows Object.
   */
  transformOAuthFlows(flows) {
    if (typeof flows !== 'object' || flows === null) {
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
   * @param {!Object} securityScheme Security Scheme Object.
   * @return {!Object} Transformed Security Scheme Object.
   */
  transformSecurityScheme(securityScheme) {
    if (typeof securityScheme !== 'object'
      || securityScheme === null
      || securityScheme.flows === undefined) {
      return securityScheme;
    }

    return {
      ...securityScheme,
      flows: this.transformOAuthFlows(securityScheme.flows),
    };
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securitySchemeObject
   * Security Scheme Object}.
   *
   * This occurs for components.security.
   *
   * @param {!Array<!Object>} securitySchemes Array of Security
   * Scheme Object.
   * @return {!Object<string,!Object>} Transformed Array of Security
   * Scheme Object.
   */
  transformSecuritySchemes(securitySchemes) {
    return mapValues(securitySchemes, this.transformSecurityScheme, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securityRequirementObject
   * Security Requirement Object}.
   *
   * @param {!Object} securityRequirement Security Requirement Object.
   * @return {!Object} Transformed Security Requirement Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformSecurityRequirement(securityRequirement) {
    return securityRequirement;
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#securityRequirementObject
   * Security Requirement Object}.
   *
   * This occurs for components.security.
   *
   * @param {!Array<!Object>} securityRequirements Array of Security
   * Requirement Object.
   * @return {!Object<string,!Object>} Transformed Array of Security
   * Requirement Object.
   */
  transformSecurityRequirements(securityRequirements) {
    return mapValues(
      securityRequirements,
      this.transformSecurityRequirement,
      this,
    );
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#tagObject
   * Tag Object}.
   *
   * @param {!Object} tag Tag Object.
   * @return {!Object} Transformed Tag Object.
   */
  transformTag(tag) {
    if (typeof tag !== 'object'
      || tag === null
      || tag.externalDocs === undefined) {
      return tag;
    }

    return {
      ...tag,
      externalDocs: this.transformExternalDocs(tag.externalDocs),
    };
  }


  /** Transforms an Array of {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#tagObject
   * Tag Object}.
   *
   * This occurs for components.tags.
   *
   * @param {!Array<!Object>} tags Array of Tag Object.
   * @return {!Object<string,!Object>} Transformed Array of Tag Object.
   */
  transformTags(tags) {
    return mapValues(tags, this.transformTag, this);
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#contactObject
   * Contact Object}.
   *
   * @param {!Object} contact Contact Object.
   * @return {!Object} Transformed Contact Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformContact(contact) {
    return contact;
  }


  /** Transforms a {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#licenseObject
   * License Object}.
   *
   * @param {!Object} license License Object.
   * @return {!Object} Transformed License Object.
   */
  // eslint-disable-next-line class-methods-use-this
  transformLicense(license) {
    return license;
  }


  /** Transforms an {@link
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#infoObject
   * Info Object}.
   *
   * @param {!Object} info Info Object.
   * @return {!Object} Transformed Info Object.
   */
  transformInfo(info) {
    if (typeof info !== 'object' || info === null) {
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
   * @param {!Object} openApi OpenAPI Object.
   * @return {!Object} Transformed OpenAPI Object.
   */
  transformOpenApi(openApi) {
    if (typeof openApi !== 'object' || openApi === null) {
      return openApi;
    }

    const newOpenApi = {
      ...openApi,
    };

    if (openApi.info !== undefined) {
      newOpenApi.info = this.transformInfo(openApi.info);
    }

    if (openApi.servers !== undefined) {
      newOpenApi.servers = this.transformServers(openApi.servers);
    }

    if (openApi.components !== undefined) {
      newOpenApi.components = this.transformComponents(openApi.components);
    }

    if (openApi.definitions !== undefined) {
      newOpenApi.definitions = this.transformSchemaMap(openApi.definitions);
    }

    if (openApi.parameters !== undefined) {
      newOpenApi.parameters = this.transformParameterMap(openApi.parameters);
    }

    if (openApi.responses !== undefined) {
      newOpenApi.responses = this.transformResponseMap(openApi.responses);
    }

    if (openApi.paths !== undefined) {
      newOpenApi.paths = this.transformPaths(openApi.paths);
    }

    if (openApi.security !== undefined) {
      newOpenApi.security =
        this.transformSecurityRequirementMap(openApi.security);
    }

    if (openApi.tags !== undefined) {
      newOpenApi.tags = this.transformTagMap(openApi.tags);
    }

    if (openApi.externalDocs !== undefined) {
      newOpenApi.externalDocs =
        this.transformExternalDocs(openApi.externalDocs);
    }

    return newOpenApi;
  }
}

module.exports = OpenApiTransformerBase;
