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
 * Like _.mapValues from lodash
 * Like https://github.com/sindresorhus/modify-values
 *
 * Unlike the above:
 * - If the first argument is not an object, it is returned unchanged.
 * - If the first argument is an Array, a native Array is returned.
 * - The returned object will have the same prototype as the first argument.
 *
 * @private
 * @template T
 * @param {T} obj Object for which to map values.
 * @param {function(*): *} transform Function which maps input to output values.
 * @param {*} thisArg Value passed to `transform` as `this`.
 * @return {T} Object with same prototype and keys as `obj`, where the
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

    // Note: OpenAPI 3.0 disallows Arrays, 2.0 and 3.1 drafts allow it
    const { items } = schema;
    if (items !== undefined) {
      if (Array.isArray(items)) {
        newSchema.items =
          mapValues(items, this.transformSchema, this);
      } else {
        newSchema.items = this.transformSchema(items);
      }
    }

    ['if', 'then', 'else', 'not'].forEach((schemaProp) => {
      const subSchema = schema[schemaProp];
      if (subSchema !== undefined) {
        newSchema[schemaProp] = this.transformSchema(subSchema);
      }
    });

    if (schema.properties !== undefined) {
      newSchema.properties =
        mapValues(schema.properties, this.transformSchema, this);
    }

    // Note: additionalProperties can be boolean or schema (before OpenAPI 3.1)
    // additionalItems can be boolean or schema in all OpenAPI versions
    ['additionalItems', 'additionalProperties'].forEach((schemaProp) => {
      const additionalItemsProps = schema[schemaProp];
      if (additionalItemsProps !== undefined
        && typeof additionalItemsProps !== 'boolean') {
        newSchema[schemaProp] = this.transformSchema(additionalItemsProps);
      }
    });

    if (schema.unevaluatedItems !== undefined) {
      newSchema.unevaluatedItems =
        this.transformSchema(schema.unevaluatedItems);
    }

    if (schema.dependentSchemas !== undefined) {
      newSchema.dependentSchemas =
        mapValues(schema.dependentSchemas, this.transformSchema, this);
    }

    if (schema.contains !== undefined) {
      newSchema.contains = this.transformSchema(schema.contains);
    }

    ['allOf', 'anyOf', 'oneOf'].forEach((schemaProp) => {
      const subSchemas = schema[schemaProp];
      if (subSchemas !== undefined) {
        newSchema[schemaProp] =
          mapValues(subSchemas, this.transformSchema, this);
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
      headers: mapValues(encoding.headers, this.transformHeader, this),
    };
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
        mapValues(mediaType.encoding, this.transformEncoding, this);
    }

    return newMediaType;
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
   * @param {!Object} parameter Parameter Object.
   * @return {!Object} Transformed Parameter Object.
   */
  transformParameter(parameter) {
    if (typeof parameter !== 'object' || parameter === null) {
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
   * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#callbackObject
   * Callback Object}.
   *
   * @param {!Object} callback Callback Object.
   * @return {!Object} Transformed Callback Object.
   */
  transformCallback(callback) {
    return mapValues(callback, this.transformPathItem, this);
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
      content: mapValues(requestBody.content, this.transformMediaType, this),
    };
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
        mapValues(operation.parameters, this.transformParameter, this);
    }

    if (operation.requestBody && operation.requestBody.content) {
      newOperation.requestBody =
        this.transformRequestBody(operation.requestBody);
    }

    if (operation.responses !== undefined) {
      newOperation.responses =
        mapValues(operation.responses, this.transformResponse, this);
    }

    if (operation.callbacks !== undefined) {
      newOperation.callbacks =
        mapValues(operation.callbacks, this.transformCallback, this);
    }

    if (operation.security !== undefined) {
      newOperation.security = mapValues(
        operation.security,
        this.transformSecurityRequirement,
        this,
      );
    }

    if (operation.servers !== undefined) {
      newOperation.servers = mapValues(
        operation.servers,
        this.transformServer,
        this,
      );
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
        mapValues(pathItem.parameters, this.transformParameter, this);
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
      variables:
        mapValues(server.variables, this.transformServerVariable, this),
    };
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
      newOpenApi.servers =
        mapValues(openApi.servers, this.transformServer, this);
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

    if (openApi.security !== undefined) {
      newOpenApi.security = mapValues(
        openApi.security,
        this.transformSecurityRequirement,
        this,
      );
    }

    if (openApi.tags !== undefined) {
      newOpenApi.tags = mapValues(openApi.tags, this.transformTag, this);
    }

    if (openApi.externalDocs !== undefined) {
      newOpenApi.externalDocs =
        this.transformExternalDocs(openApi.externalDocs);
    }

    return newOpenApi;
  }
}

module.exports = OpenApiTransformerBase;
