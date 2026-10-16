import { defineConfig } from 'vitest/config';

// Só a lógica pura do frontend (src/lib). Os testes de tela ficam em e2e/ e rodam no Playwright.
export default defineConfig({
  test: {
    include: ['unit/**/*.test.ts'],
    environment: 'node',
  },
});
