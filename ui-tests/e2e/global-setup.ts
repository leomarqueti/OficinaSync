import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '../../backend');
const BACKEND_URL = 'http://localhost:3100';
const FRONTEND_ORIGIN = 'http://localhost:5183';

/**
 * 1) cria uma oficina + dono NOVOS no banco de teste (backend/test/ui-seed.ts);
 * 2) faz UM login pela API e salva o token como storageState — os testes já começam logados.
 *    (o login é limitado a 5 por minuto por IP; por isso só o login.spec.ts usa a tela de login.)
 */
export default async function globalSetup() {
  const output = execSync('npx ts-node -r tsconfig-paths/register test/ui-seed.ts', {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const line = output.split('\n').find((l) => l.startsWith('UI_SEED '));
  if (!line) throw new Error(`ui-seed não devolveu credenciais. Saída:\n${output}`);
  const owner = JSON.parse(line.slice('UI_SEED '.length)) as {
    email: string;
    password: string;
    tenantName: string;
  };

  process.env.UI_EMAIL = owner.email;
  process.env.UI_PASSWORD = owner.password;
  process.env.UI_TENANT_NAME = owner.tenantName;

  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
  });
  if (!response.ok) {
    throw new Error(`login do seed falhou: ${response.status} ${await response.text()}`);
  }
  const { access_token } = (await response.json()) as { access_token: string };

  const authDir = path.resolve(here, '.auth');
  mkdirSync(authDir, { recursive: true });
  writeFileSync(
    path.join(authDir, 'state.json'),
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: FRONTEND_ORIGIN,
          localStorage: [{ name: 'token', value: access_token }],
        },
      ],
    }),
  );
}
