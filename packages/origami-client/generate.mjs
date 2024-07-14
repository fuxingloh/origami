import { cp, rm } from 'node:fs/promises';

import openapi from '@fuxingloh/origami-openapi/openapi.json' assert { type: 'json' };
import { generate, HttpClient } from 'openapi-typescript-codegen';

await generate({
  input: openapi,
  output: './src',
  httpClient: HttpClient.FETCH,
  clientName: 'OrigamiClient',
  indent: '2',
});

// Move src to the root
await cp('./src/core', './core', { recursive: true });
await cp('./src/models', './models', { recursive: true });
await cp('./src/services', './services', { recursive: true });

// Remove src
await rm('./src', { recursive: true });
