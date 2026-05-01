import { defineConfig } from 'orval';

export default defineConfig({
  smlsApi: {
    input: {
      target: '../backend/openapi.json',
      filters: {
        mode: 'exclude',
        tags: [/^POS:/],
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
