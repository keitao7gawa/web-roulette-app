import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
    },
  },
  css: {
    // Disable reading root PostCSS config during tests
    postcss: {
      plugins: [],
    },
  },
});
