#!/usr/bin/env node
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';

const backendRoot = path.resolve(import.meta.dirname, '..');
const openApiPath = path.resolve(backendRoot, '..', 'docs', 'openapi.yaml');

await SwaggerParser.validate(openApiPath);
console.log('OpenAPI schema validation passed.');
