import { defineConfig, devices } from '@playwright/test';

// Portas próprias dos testes: nunca colidem com o `npm run start:dev` / `npm run dev` do dia a dia.
const BACKEND_PORT = 3100;
const FRONTEND_PORT = 5183;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

/**
 * Testes de tela contra o sistema de verdade: backend compilado (backend/dist) ligado ao banco
 * de TESTE (oficinasync_test) + frontend em modo dev. Pré-requisitos locais:
 *   1. docker compose up -d sqlserver minio   (na raiz)
 *   2. cd backend && npm run build
 *   3. cd frontend/oficinasync-web && npm install
 * Rodar: cd ui-tests && npm run test:ui
 */
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: FRONTEND_URL,
    locale: 'pt-BR',
    // o service worker do PWA (ativo no dev) só atrapalharia a previsibilidade dos testes
    serviceWorkers: 'block',
    storageState: 'e2e/.auth/state.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // câmera simulada: a abertura de OS tira as fotos com a câmera embutida na página (getUserMedia)
        permissions: ['camera'],
        launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
      },
    },
  ],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../backend',
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        PORT: String(BACKEND_PORT),
        DB_NAME: 'oficinasync_test',
        MINIO_BUCKET: 'oficinasync-test',
        CORS_ORIGINS: FRONTEND_URL,
        FRONTEND_URL,
        // a bateria inteira passa de 60 req/min (limite global por IP); login continua com 5/min
        THROTTLE_LIMIT: '1000',
      },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      cwd: '../frontend/oficinasync-web',
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: BACKEND_URL },
    },
  ],
});
