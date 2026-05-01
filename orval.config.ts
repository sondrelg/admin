import { defineConfig } from 'orval';

export default defineConfig({
  smlsApi: {
    input: {
      target: '../backend/openapi.json',
      filters: {
        tags: [
          'Auth',
          'Devices',
          'Health',
          'Inventory',
          'Locations',
          'Menu',
          'Registers',
          'Staff',
          'Tax Rates',
          'Telemetry',
          'Tenants',
          'Webhooks',
        ],
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/models',
      client: 'fetch',
      baseUrl: '',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
