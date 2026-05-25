import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // index.ts is the stdio MCP entry point: it wires tools to the transport and
      // is exercised at runtime, not by unit tests (tests mock at the client boundary).
      exclude: ['src/index.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
