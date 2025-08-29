import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, '../test/setup.ts')],
    include: ['test/unit/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'test-output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: '../test-output/coverage',
      exclude: [
        'node_modules/',
        'test/',
        'test-output/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.{idea,git,cache,output,temp}/**'
      ],
      clean: true,
      cleanOnRerun: true,
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    },
    outputFile: {
      junit: '../test-output/reports/junit.xml',
      json: '../test-output/reports/results.json'
    },
    reporters: ['default', 'junit', 'json'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    threads: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '~': path.resolve(__dirname, '../'),
      '@test': path.resolve(__dirname, '../test')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  }
});