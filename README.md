OpenApiTransformerBase
======================

[![Build Status](https://img.shields.io/github/workflow/status/kevinoid/openapi-transformer-base/Node.js%20CI/main.svg?style=flat&label=build)](https://github.com/kevinoid/openapi-transformer-base/actions?query=branch%3Amain)
[![Coverage](https://img.shields.io/codecov/c/github/kevinoid/openapi-transformer-base.svg?style=flat)](https://codecov.io/github/kevinoid/openapi-transformer-base?branch=main)
[![Dependency Status](https://img.shields.io/david/kevinoid/openapi-transformer-base.svg?style=flat)](https://david-dm.org/kevinoid/openapi-transformer-base)
[![Supported Node Version](https://img.shields.io/node/v/openapi-transformer-base.svg?style=flat)](https://www.npmjs.com/package/openapi-transformer-base)
[![Version on NPM](https://img.shields.io/npm/v/openapi-transformer-base.svg?style=flat)](https://www.npmjs.com/package/openapi-transformer-base)

Base class for traversing or transforming [OpenAPI
2](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md)
or [OpenAPI
3](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md)
documents using a modified [visitor design
pattern](https://en.wikipedia.org/wiki/Visitor_pattern) to traverse object
types within the OpenAPI document tree.

This class is used to implement several common OpenAPI document
transformations in
[openapi-transformer](https://github.com/kevinoid/openapi-transformer).


## Introductory Examples

### Gather External Documentation

To gather all [External
Documentation](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#externalDocumentationObject)
objects in an OpenAPI 3 document using an ad-hoc (i.e. monkey-patched)
subclass:

```js
const OpenApiTransformerBase = require('openapi-transformer-base');
const { readFile } = require('fs').promises;

readFile('openapi.json', 'utf8')
  .then((openApiString) => {
    // Array which holds the collected externalDocs
    const allExternalDocs = [];

    // Create ad-hoc subclass of OpenApiTransformerBase to collect externalDocs
    const transformer = new OpenApiTransformerBase();
    transformer.transformExternalDocs = (externalDocs) => {
      allExternalDocs.push(externalDocs);
      return externalDocs;
    };

    // Parse, then traverse the OpenAPI document
    const openApi = JSON.parse(openApiString);
    transformer.transformOpenApi(openApi);

    console.log('All External Documentation:', allExternalDocs);
  });
```

### Change Integer to Number Schema Type

Since [`type: integer` is an OpenAPI-specific
extension](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#data-types)
of [`type` in JSON
Schema](https://json-schema.org/draft/2019-09/json-schema-validation.html#rfc.section.6.1.1),
it may be desirable to change schemas with `type: integer` to `type: number`
with `multipleOf: 1` for use by JSON Schema tools:

```js
const OpenApiTransformerBase = require('openapi-transformer-base');
const { readFile } = require('fs').promises;

class OpenApiIntegerTypeTransformer extends OpenApiTransformerBase {
  transformSchema(schema) {
    // Perform any other transformations on this schema or its child objects
    let newSchema = super.transformSchema(schema);

    if (newSchema.type === 'integer') {
      newSchema = {
        ...newSchema,
        type: 'number',
        multipleOf: 1,
      };
    }

    return newSchema;
  }
}

readFile('openapi.json', 'utf8')
  .then((openApiString) => {
    const openApi = JSON.parse(openApiString);

    const transformer = new OpenApiIntegerTypeTransformer();
    const newOpenApi = transformer.transformOpenApi(openApi);
    console.log('Transformed OpenAPI Document:', newOpenApi);
  });
```

More examples can be found in the [test
specifications](https://kevinoid.github.io/openapi-transformer-base/spec).


## API Docs

See the [JSDoc API
Documentation](https://kevinoid.github.io/openapi-transformer-base/api).


## Contributing

Contributions are appreciated.  Contributors agree to abide by the [Contributor
Covenant Code of
Conduct](https://www.contributor-covenant.org/version/1/4/code-of-conduct.html).
If this is your first time contributing to a Free and Open Source Software
project, consider reading [How to Contribute to Open
Source](https://opensource.guide/how-to-contribute/)
in the Open Source Guides.

If the desired change is large, complex, backwards-incompatible, can have
significantly differing implementations, or may not be in scope for this
project, opening an issue before writing the code can avoid frustration and
save a lot of time and effort.


## License

This project is available under the terms of the [MIT License](LICENSE.txt).
See the [summary at TLDRLegal](https://tldrlegal.com/license/mit-license).
