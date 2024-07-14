import { readFileSync, writeFileSync } from 'node:fs';

// noinspection JSFileReferences
import { appRouter } from '@imagiro/imagiro-service/routers/_app.js';
import { generateOpenApiDocument } from 'trpc-openapi';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'Origami OpenAPI',
  version: version,
  baseUrl: 'https://origami.fuxing.dev/api/',
});

writeFileSync('openapi.json', JSON.stringify(openApiDocument, null, 2));
