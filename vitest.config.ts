import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
