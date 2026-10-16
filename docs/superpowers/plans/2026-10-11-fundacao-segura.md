# Fundação segura (auditoria multi-tenant + limites de upload) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o backend seguro o bastante pra receber oficinas de fora: provar com teste automatizado que uma oficina não enxerga nem altera dados de outra, fechar os vazamentos já encontrados, e impor limite de tamanho/cota nos uploads com o vídeo de divulgação desligado por padrão.

**Architecture:** Uma suíte e2e (Jest + supertest) sobe o `AppModule` real contra um banco SQL Server de teste (`oficinasync_test`, criado sob demanda; o schema vem das migrations) e um bucket MinIO de teste, semeia duas oficinas e tenta, como a oficina A, ler/alterar tudo da B. Cada vazamento achado vira um teste vermelho → correção mínima → verde. Limites/cota ficam em funções puras testáveis em unit test (`upload-limits.ts`, `concurrency-limiter.ts`) e são plugados nos services existentes.

**Tech Stack:** NestJS 11, TypeORM 0.3 (mssql), Jest 30 + ts-jest 29.4, supertest 7, MinIO, React/Vite (só um ajuste pequeno de UI).

**Spec:** `docs/superpowers/specs/2026-10-11-lancamento-enxuto-design.md` — este plano cobre **§4.1 (auditoria) e §4.2 (limites/cota/flag)**. §4.3–4.5 (guard de assinatura, painel admin, cobrança manual) serão o **Plano B** e §4.6–4.7 (termos/landing, backup/uptime) o **Plano C**, escritos depois que este fechar (o Plano B reaproveita o harness e o `JwtAuthGuard` alterados aqui).

## Global Constraints

- Mensagens de erro ao usuário em **português**.
- Isolamento entre oficinas: resposta a recurso de outro tenant é **403 ou 404, nunca 2xx** e nunca 500.
- Limites iniciais de upload (valores do spec §4.2): **foto 15 MB, áudio 20 MB, vídeo 100 MB**; teto duro do multer = 100 MB.
- Cota de armazenamento por oficina: variável `TENANT_STORAGE_QUOTA_MB`, **default 2048** (a confirmar contra o disco real da VPS — spec §7).
- Flag `PROMO_VIDEO_ENABLED`: **default desligado**; geração de vídeo com **concorrência máxima 1** quando ligada.
- Captura de vídeo na OS (upload) continua funcionando — só a *geração* do vídeo de divulgação é desligada.
- Nada de `git add -A` / `git add .`: a árvore tem alterações não relacionadas (Android, CEP, e-mail opcional). Sempre `git add` com caminhos explícitos.
- Não apagar dados; nenhuma migration neste plano.
- Tokens antigos sem campo `scope` devem continuar válidos como `access` até expirarem (compatibilidade).

## Review Focus

1. **Token antigo sem `scope`** (emitido antes da checagem existir) deve continuar funcionando como `access` — Task 5, teste "token sem scope".
2. **Usuário sem oficina** (ativo, `tenant = null`) chamando rotas de tenant deve receber 401/403, nunca 500 nem dados — Task 5, teste "usuário sem tenant".
3. **Id inexistente** deve dar 404 (hoje alguns services lançam `Error` genérico → 500) — Task 7.
4. **Cota**: arquivo que fecha exatamente a cota é aceito, 1 byte a mais é recusado; e o consumo da oficina B não bloqueia a A; a soma deve aguentar >2 GB (overflow de `SUM(int)` no SQL Server) — Tasks 9 e 10.
5. **Limite por arquivo**: exatamente 15 MB de foto passa, 15 MB + 1 byte recusado (fronteira) — Task 9, unit test.

---

## File Structure

**Criar (backend):**
- `backend/test/jest-e2e.json` — config do Jest e2e (stub de `file-type`, 1 worker, setupFiles).
- `backend/test/stubs/file-type.ts` — stub CJS do pacote ESM-only `file-type` (detecta só PNG) pra rodar no Jest.
- `backend/test/helpers/test-env.ts` — variáveis de ambiente de teste (DB e bucket separados do dev).
- `backend/test/helpers/test-app.ts` — cria o banco de teste se faltar e sobe o `AppModule` com os mesmos pipes/interceptors do `main.ts`.
- `backend/test/helpers/seed.ts` — `createTenantWithOwner()` (tenant + dono ativo + login real).
- `backend/test/helpers/fixtures.ts` — `createWorld()` (cliente→carro→OS→etapa→mídia→teste→device), `PNG_1PX`, `pngOfSize()`, `generateCpf()`.
- `backend/test/smoke.e2e-spec.ts` — prova que o harness funciona.
- `backend/test/tenant-isolation.e2e-spec.ts` — matriz A ataca B + vazamento em listas + página pública + rotas sem token.
- `backend/test/auth-surface.e2e-spec.ts` — escopo do token, token sem scope, usuário sem tenant, `POST /users` removido.
- `backend/test/not-found.e2e-spec.ts` — ids inexistentes → 404.
- `backend/test/upload-limits.e2e-spec.ts` — foto grande → 413, cota, soma bigint, isolamento da cota.
- `backend/test/promo-video-flag.e2e-spec.ts` — flag do vídeo de divulgação e `features` na OS.
- `backend/src/modules/AuthModule/token-scope.decorator.ts` — `@RequireTokenScope()`.
- `backend/src/modules/minio/upload-limits.ts` + `upload-limits.spec.ts` — limites e cota (funções puras).
- `backend/src/modules/video/concurrency-limiter.ts` + `concurrency-limiter.spec.ts`.
- `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md` — relatório da auditoria.

**Modificar (backend):** `serviceOrder.service.ts`, `serviceOrder.controller.ts`, `jwt-auth.guard.ts`, `tenants.controller.ts`, `users.controller.ts`, `clients.service.ts`, `cars.service.ts`, `minio.service.ts`, `media.controller.ts`, `media.service.ts`, `video.service.ts`, `.env.production.example`, `.env.example`.

**Modificar (frontend):** `src/components/os/types.ts`, `src/pages/OsWorkPage.tsx`, `src/components/media/MediaCaptureField.tsx`.

**Modificar (docs):** `CLAUDE.md`.

## Pré-requisito do ambiente (rodar uma vez antes da Task 1)

O e2e precisa de SQL Server e MinIO de desenvolvimento no ar (o `docker-compose.yml` da raiz).

- [ ] **Step 0.1: Conferir infra**

Run: `docker ps --format "{{.Names}}"`
Expected: lista contendo `oficinasync-db` e `oficinasync-storage`. Se faltar algum: `docker compose up -d sqlserver minio` na raiz do projeto.

- [ ] **Step 0.2: Criar a branch de trabalho**

Run: `git switch -c feat/lancamento-enxuto-seguranca`
Expected: `Switched to a new branch`. (As alterações não commitadas de outras tarefas acompanham a branch e **não** serão incluídas nos commits deste plano, porque todo `git add` abaixo usa caminhos explícitos.)

---

### Task 1: Harness de testes e2e (Jest + supertest contra banco/MinIO de teste)

**Files:**
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/stubs/file-type.ts`
- Create: `backend/test/helpers/test-env.ts`
- Create: `backend/test/helpers/test-app.ts`
- Create: `backend/test/helpers/seed.ts`
- Test: `backend/test/smoke.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `createTestApp(): Promise<INestApplication>` (em `test-app.ts`)
  - `createTenantWithOwner(app: INestApplication, label: string): Promise<Owner>` onde `Owner = { tenant: Tenants; user: Users; email: string; password: string; token: string }` (em `seed.ts`)

- [ ] **Step 1: Escrever o smoke test (vai falhar: nada existe ainda)**

Create `backend/test/smoke.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner } from './helpers/seed';

describe('smoke do harness e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('dono semeado consegue logar e /users/me devolve a oficina dele', async () => {
    const owner = await createTenantWithOwner(app, 'smoke');

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(me.body.tenant_name).toBe(owner.tenant.name);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- smoke`
Expected: FAIL — `Cannot find module './helpers/test-app'` (e/ou config `./test/jest-e2e.json` inexistente).

- [ ] **Step 3: Criar a config do Jest e2e**

Create `backend/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^file-type$": "<rootDir>/stubs/file-type.ts" },
  "setupFiles": ["<rootDir>/helpers/test-env.ts"],
  "maxWorkers": 1,
  "testTimeout": 60000
}
```

- [ ] **Step 4: Criar o stub de `file-type`**

`file-type@22` é ESM-only e não carrega no Jest (CJS). O stub devolve só o necessário: detecta PNG pela assinatura.

Create `backend/test/stubs/file-type.ts`:

```ts
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function fileTypeFromBuffer(
  buffer: Buffer,
): Promise<{ mime: string; ext: string } | undefined> {
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mime: 'image/png', ext: 'png' };
  }
  return undefined;
}
```

- [ ] **Step 5: Criar o env de teste**

Create `backend/test/helpers/test-env.ts`:

```ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Credenciais de banco/MinIO vêm do .env de dev; só o NOME do banco e do bucket
// são trocados pra nunca tocar nos dados de desenvolvimento.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.DB_NAME = 'oficinasync_test';
process.env.MINIO_BUCKET = 'oficinasync-test';
process.env.NODE_ENV = 'test';
delete process.env.PROMO_VIDEO_ENABLED;
delete process.env.TENANT_STORAGE_QUOTA_MB;
```

- [ ] **Step 6: Criar o bootstrap do app de teste**

Create `backend/test/helpers/test-app.ts`:

```ts
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as sql from 'mssql';
import { AppModule } from '../../src/app.module';

async function ensureTestDatabase(): Promise<void> {
  const pool = await new sql.ConnectionPool({
    server: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT ?? 1433),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    database: 'master',
    options: { encrypt: false, trustServerCertificate: true },
  }).connect();

  await pool
    .request()
    .query(
      `IF DB_ID('${process.env.DB_NAME}') IS NULL CREATE DATABASE [${process.env.DB_NAME}]`,
    );
  await pool.close();
}

/** Sobe o AppModule real com os mesmos pipes/interceptors globais do main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  await ensureTestDatabase();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  await app.init();

  return app;
}
```

- [ ] **Step 7: Criar o semeador de oficina + dono**

Create `backend/test/helpers/seed.ts`:

```ts
import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Tenants } from '../../src/modules/tenants/tenants.entity';
import { Plan } from '../../src/modules/tenants/plan.enum';
import { Status } from '../../src/modules/tenants/status.enum';
import { Users } from '../../src/modules/users/users.entity';
import { UsersService } from '../../src/modules/users/users.service';

export type Owner = {
  tenant: Tenants;
  user: Users;
  email: string;
  password: string;
  token: string;
};

function randomCnpjLike(): string {
  return String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
}

/** Cria oficina + dono ativo direto no banco (sem e-mail) e faz login de verdade pra pegar o JWT. */
export async function createTenantWithOwner(
  app: INestApplication,
  label: string,
): Promise<Owner> {
  const ds = app.get(DataSource);
  const tenantRepo = ds.getRepository(Tenants);
  const userRepo = ds.getRepository(Users);

  const tenant = await tenantRepo.save(
    tenantRepo.create({
      name: `Oficina ${label} ${randomUUID().slice(0, 6)}`,
      cnpj: randomCnpjLike(),
      phone: '+5514997951011',
      plan: Plan.FULL,
      status: Status.ACTIVE,
    }),
  );

  const email = `${label}-${randomUUID().slice(0, 8)}@teste.local`;
  const password = 'Teste@12345';

  const user = await app.get(UsersService).create({
    name: `Dono ${label}`,
    email,
    password,
  });
  user.tenant = tenant;
  user.is_active = true;
  await userRepo.save(user);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return { tenant, user, email, password, token: login.body.access_token };
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `cd backend && npm run test:e2e -- smoke`
Expected: PASS, 2 testes (a primeira execução demora: cria o banco `oficinasync_test` e roda todas as migrations).

- [ ] **Step 9: Garantir que o build de produção não foi afetado**

Run: `cd backend && npm run build`
Expected: termina sem erros (`tsconfig.build.json` já exclui `test`).

- [ ] **Step 10: Commit**

```bash
git add backend/test/jest-e2e.json backend/test/stubs/file-type.ts backend/test/helpers/test-env.ts backend/test/helpers/test-app.ts backend/test/helpers/seed.ts backend/test/smoke.e2e-spec.ts
git commit -m "test: harness e2e (jest+supertest) com banco e bucket de teste separados"
```

---

### Task 2: Suíte de isolamento entre oficinas (rotas já protegidas viram teste de regressão)

**Files:**
- Create: `backend/test/helpers/fixtures.ts`
- Test: `backend/test/tenant-isolation.e2e-spec.ts`

**Interfaces:**
- Consumes: `createTestApp()`, `createTenantWithOwner()`, `Owner` (Task 1).
- Produces (em `fixtures.ts`):
  - `PNG_1PX: Buffer`, `pngOfSize(totalBytes: number): Buffer`, `generateCpf(): string`
  - `type World = { clientId: number; clientName: string; cpf: string; carId: number; plate: string; orderId: number; publicToken: string; sectionId: number; mediaId: number; testId: number; deviceId: number; deviceName: string }`
  - `createWorld(app: INestApplication, token: string): Promise<World>`

- [ ] **Step 1: Criar as fixtures**

Create `backend/test/helpers/fixtures.ts`:

```ts
import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** PNG 1x1 válido. */
export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** PNG com `totalBytes` bytes (assinatura PNG + preenchimento) — serve pra testar limites de tamanho. */
export function pngOfSize(totalBytes: number): Buffer {
  return Buffer.concat([
    PNG_1PX,
    Buffer.alloc(Math.max(0, totalBytes - PNG_1PX.length)),
  ]);
}

export function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) return generateCpf();

  const digit = (nums: number[]): number => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, n, i) => acc + n * (factor - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join('');
}

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

export type World = {
  clientId: number;
  clientName: string;
  cpf: string;
  carId: number;
  plate: string;
  orderId: number;
  publicToken: string;
  sectionId: number;
  mediaId: number;
  testId: number;
  deviceId: number;
  deviceName: string;
};

/** Cria, via API e como o dono do `token`, um cliente → carro → OS → etapa checkin → foto → teste + um device OBD. */
export async function createWorld(
  app: INestApplication,
  token: string,
): Promise<World> {
  const server = app.getHttpServer();
  const auth = { Authorization: `Bearer ${token}` };

  const clientName = `Cliente ${randomUUID().slice(0, 8)}`;
  const cpf = generateCpf();
  const client = await request(server)
    .post('/clients')
    .set(auth)
    .send({
      name: clientName,
      phone: '+5514997951011',
      cpf,
      address: 'Rua Teste, 1',
    })
    .expect(201);

  const plate = randomPlate();
  const car = await request(server)
    .post('/cars')
    .set(auth)
    .send({
      plate,
      brand: 'Chevrolet',
      model: 'Celta',
      year: 2010,
      fuel_type: 'flex',
      chassis: randomUUID().replace(/-/g, '').slice(0, 17),
      color: 'Prata',
      mileage_in: 100000,
      client_id: client.body.client_id,
    })
    .expect(201);

  const order = await request(server)
    .post('/service_orders')
    .set(auth)
    .send({ car_id: car.body.car_id, client_complaint: 'Barulho no motor' })
    .expect(201);

  const section = await request(server)
    .post('/sections')
    .set(auth)
    .send({ service_order_id: order.body.service_order_id, type: 'checkin' })
    .expect(201);

  const media = await request(server)
    .post('/medias')
    .set(auth)
    .field('section_id', String(section.body.section_id))
    .field('type', 'photo')
    .attach('file', PNG_1PX, { filename: 'a.png', contentType: 'image/png' })
    .expect(201);

  const test = await request(server)
    .post('/tests')
    .set(auth)
    .send({
      section_id: section.body.section_id,
      title: 'Teste da oficina',
      verdict: 'approved',
    })
    .expect(201);

  const deviceName = `Dongle ${randomUUID().slice(0, 6)}`;
  const device = await request(server)
    .post('/obd/devices')
    .set(auth)
    .send({ name: deviceName })
    .expect(201);

  return {
    clientId: client.body.client_id,
    clientName,
    cpf,
    carId: car.body.car_id,
    plate,
    orderId: order.body.service_order_id,
    publicToken: order.body.public_token,
    sectionId: section.body.section_id,
    mediaId: media.body.media_id,
    testId: test.body.test_id,
    deviceId: device.body.device_id,
    deviceName,
  };
}
```

- [ ] **Step 2: Escrever a suíte de isolamento**

Create `backend/test/tenant-isolation.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, PNG_1PX, type World } from './helpers/fixtures';

type Method = 'get' | 'post' | 'patch' | 'delete';
type Attack = { name: string; run: () => request.Test };

describe('isolamento entre oficinas (tenants)', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let bw: World; // dados da oficina B
  let aDeviceId: number; // dispositivo da oficina A

  const server = () => app.getHttpServer();
  const as = (owner: Owner, method: Method, path: string) =>
    request(server())[method](path).set('Authorization', `Bearer ${owner.token}`);

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'a');
    b = await createTenantWithOwner(app, 'b');
    bw = await createWorld(app, b.token);

    const aDevice = await as(a, 'post', '/obd/devices')
      .send({ name: 'Dongle A' })
      .expect(201);
    aDeviceId = aDevice.body.device_id;
  });

  afterAll(async () => {
    await app.close();
  });

  // A tenta tocar em recursos da B. Leituras primeiro, mutações destrutivas por último
  // (se a proteção falhar, o teste que falha é o sinal — e não derruba os seguintes).
  const attacks: Attack[] = [
    { name: 'GET /cars/:id', run: () => as(a, 'get', `/cars/${bw.carId}`) },
    {
      name: 'GET /service_orders/by-car/:carId',
      run: () => as(a, 'get', `/service_orders/by-car/${bw.carId}`),
    },
    {
      name: 'GET /service_orders/:id/report.pdf',
      run: () => as(a, 'get', `/service_orders/${bw.orderId}/report.pdf`),
    },
    {
      name: 'GET /tests/history',
      run: () => as(a, 'get', `/tests/history?car_id=${bw.carId}&title=teste`),
    },
    {
      name: 'GET /obd/devices/:id/latest',
      run: () => as(a, 'get', `/obd/devices/${bw.deviceId}/latest`),
    },
    {
      name: 'PATCH /cars/:id',
      run: () => as(a, 'patch', `/cars/${bw.carId}`).send({ color: 'hack' }),
    },
    {
      name: 'PATCH /clients/:id',
      run: () =>
        as(a, 'patch', `/clients/${bw.clientId}`).send({ address: 'hack' }),
    },
    {
      name: 'POST /sections na OS da B',
      run: () =>
        as(a, 'post', '/sections').send({
          service_order_id: bw.orderId,
          type: 'diagnosis',
        }),
    },
    {
      name: 'PATCH /sections/:id',
      run: () =>
        as(a, 'patch', `/sections/${bw.sectionId}`).send({ notes: 'hack' }),
    },
    {
      name: 'PATCH /sections/:id/publish',
      run: () => as(a, 'patch', `/sections/${bw.sectionId}/publish`),
    },
    {
      name: 'POST /medias na etapa da B',
      run: () =>
        as(a, 'post', '/medias')
          .field('section_id', String(bw.sectionId))
          .field('type', 'photo')
          .attach('file', PNG_1PX, { filename: 'a.png', contentType: 'image/png' }),
    },
    {
      name: 'POST /tests na etapa da B',
      run: () =>
        as(a, 'post', '/tests').send({
          section_id: bw.sectionId,
          title: 'hack',
        }),
    },
    {
      name: 'PATCH /tests/:id',
      run: () => as(a, 'patch', `/tests/${bw.testId}`).send({ notes: 'hack' }),
    },
    {
      name: 'POST /service_orders/:id/promo-video',
      run: () => as(a, 'post', `/service_orders/${bw.orderId}/promo-video`),
    },
    {
      name: 'POST /obd/devices/:id/command',
      run: () =>
        as(a, 'post', `/obd/devices/${bw.deviceId}/command`).send({
          command: 'read_dtc',
        }),
    },
    {
      name: 'PATCH /obd/devices/:id',
      run: () =>
        as(a, 'patch', `/obd/devices/${bw.deviceId}`).send({ name: 'hack' }),
    },
    {
      name: 'POST /obd/capture (device da B + OS da B)',
      run: () =>
        as(a, 'post', '/obd/capture').send({
          device_id: bw.deviceId,
          service_order_id: bw.orderId,
        }),
    },
    {
      name: 'POST /obd/capture (device da A + OS da B)',
      run: () =>
        as(a, 'post', '/obd/capture').send({
          device_id: aDeviceId,
          service_order_id: bw.orderId,
        }),
    },
    {
      name: 'PATCH /service_orders/:id/finish',
      run: () =>
        as(a, 'patch', `/service_orders/${bw.orderId}/finish`).send({
          conclusion: 'hack',
        }),
    },
    { name: 'DELETE /tests/:id', run: () => as(a, 'delete', `/tests/${bw.testId}`) },
    {
      name: 'DELETE /obd/devices/:id',
      run: () => as(a, 'delete', `/obd/devices/${bw.deviceId}`),
    },
  ];

  it.each(attacks)('A não consegue: $name (403/404)', async ({ run }) => {
    const res = await run();
    expect([403, 404]).toContain(res.status);
  });

  it('A não enxerga dados da B nas listas', async () => {
    const clients = await as(a, 'get', '/clients').expect(200);
    expect(JSON.stringify(clients.body)).not.toContain(bw.clientName);

    const cars = await as(a, 'get', '/cars').expect(200);
    expect(JSON.stringify(cars.body)).not.toContain(bw.plate);

    const orders = await as(a, 'get', '/service_orders/orders').expect(200);
    expect(JSON.stringify(orders.body)).not.toContain(bw.plate);

    const devices = await as(a, 'get', '/obd/devices').expect(200);
    expect(JSON.stringify(devices.body)).not.toContain(bw.deviceName);

    await as(a, 'get', '/invites').expect(200);
  });

  it('controle positivo: B enxerga os próprios dados (a suíte não é vazia)', async () => {
    const clients = await as(b, 'get', '/clients').expect(200);
    expect(JSON.stringify(clients.body)).toContain(bw.clientName);

    const cars = await as(b, 'get', '/cars').expect(200);
    expect(JSON.stringify(cars.body)).toContain(bw.plate);

    const devices = await as(b, 'get', '/obd/devices').expect(200);
    expect(JSON.stringify(devices.body)).toContain(bw.deviceName);

    await as(b, 'get', `/cars/${bw.carId}`).expect(200);
    await as(b, 'get', `/service_orders/by-car/${bw.carId}`).expect(200);
  });

  it('página pública não vaza CPF/e-mail do cliente nem etapa não publicada', async () => {
    const res = await request(server())
      .get(`/service_orders/public/${bw.publicToken}`)
      .expect(200);

    expect(Object.keys(res.body.client).sort()).toEqual(['name', 'phone']);
    expect(res.body.sections).toEqual([]); // checkin ainda é rascunho
    expect(JSON.stringify(res.body)).not.toContain(bw.cpf);
  });

  it.each([
    ['get', '/clients'],
    ['get', '/cars'],
    ['get', '/service_orders/orders'],
    ['get', '/service_orders/1'],
    ['get', '/obd/devices'],
    ['get', '/invites'],
    ['get', '/users/me'],
    ['post', '/medias'],
    ['post', '/tests'],
    ['post', '/sections'],
  ] as [Method, string][])('%s %s sem token → 401', async (method, path) => {
    await request(server())[method](path).expect(401);
  });
});
```

- [ ] **Step 3: Rodar a suíte**

Run: `cd backend && npm run test:e2e -- tenant-isolation`
Expected: PASS em todos os casos (as proteções dessas rotas já existem no código; a suíte as trava como regressão). O vazamento conhecido de `GET /service_orders/:id` e o de `POST /service_orders` com carro alheio entram nas Tasks 3 e 4 como testes vermelhos próprios. **Se algum caso aqui falhar**, é um vazamento real ou uma premissa errada: anote em `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md` (Task 8), corrija seguindo o mesmo padrão vermelho→verde da Task 3 antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add backend/test/helpers/fixtures.ts backend/test/tenant-isolation.e2e-spec.ts
git commit -m "test: suite de isolamento entre oficinas (A ataca B em todas as rotas autenticadas)"
```

---

### Task 3: Fechar o vazamento `GET /service_orders/:id` (qualquer logado lia qualquer OS)

**Files:**
- Modify: `backend/src/modules/serviceOrder/serviceOrder.service.ts` (método `findById`, ~linha 85)
- Modify: `backend/src/modules/serviceOrder/serviceOrder.controller.ts` (rota `@Get(':id')`, ~linha 74)
- Test: `backend/test/tenant-isolation.e2e-spec.ts`

**Interfaces:**
- Consumes: `World` (Task 2).
- Produces: `ServiceOrdersService.findById(id: number, userId: number)` (assinatura nova — o controller é o único chamador, confirmado por grep).

- [ ] **Step 1: Escrever o teste vermelho**

Em `backend/test/tenant-isolation.e2e-spec.ts`, adicionar dentro do `describe`, logo após o teste "controle positivo":

```ts
  it('GET /service_orders/:id — A não lê a OS da B, B lê a própria', async () => {
    const attack = await as(a, 'get', `/service_orders/${bw.orderId}`);
    expect([403, 404]).toContain(attack.status);
    expect(JSON.stringify(attack.body)).not.toContain(bw.cpf);

    const own = await as(b, 'get', `/service_orders/${bw.orderId}`).expect(200);
    expect(own.body.service_order_id).toBe(bw.orderId);
    expect(own.body.client.cpf).toBe(bw.cpf);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- tenant-isolation -t "GET /service_orders/:id"`
Expected: FAIL — a oficina A recebe `200` com o CPF da B (`Expected: [403, 404] / Received: 200`).

- [ ] **Step 3: Corrigir o service**

Em `backend/src/modules/serviceOrder/serviceOrder.service.ts`, substituir o início de `findById`:

```ts
  async findById(id: number) {
    const serviceOrder = await this.findEntityById(id);
```

por:

```ts
  async findById(id: number, userId: number) {
    const serviceOrder = await this.findEntityById(id);
    const user = await this.usersService.findById(userId);

    if (!user.tenant || serviceOrder.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }
```

(`ForbiddenException` e `usersService` já estão importados/injetados nesse arquivo — `finish()` usa os dois.)

- [ ] **Step 4: Corrigir o controller**

Em `backend/src/modules/serviceOrder/serviceOrder.controller.ts`, substituir:

```ts
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.serviceOrdersService.findById(id);
  }
```

por:

```ts
  findById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.serviceOrdersService.findById(id, req.user.sub);
  }
```

- [ ] **Step 5: Rodar e ver passar (suíte inteira de isolamento)**

Run: `cd backend && npm run test:e2e -- tenant-isolation`
Expected: PASS em tudo.

- [ ] **Step 6: Build**

Run: `cd backend && npm run build`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/serviceOrder/serviceOrder.service.ts backend/src/modules/serviceOrder/serviceOrder.controller.ts backend/test/tenant-isolation.e2e-spec.ts
git commit -m "fix(seguranca): GET /service_orders/:id agora valida o tenant (antes qualquer usuario logado lia qualquer OS)"
```

---

### Task 4: Fechar o vazamento `POST /service_orders` com carro de outra oficina

**Files:**
- Modify: `backend/src/modules/serviceOrder/serviceOrder.service.ts` (método `create`, ~linha 37)
- Test: `backend/test/tenant-isolation.e2e-spec.ts`

**Interfaces:**
- Consumes: `World`, `as()` (Task 2).

- [ ] **Step 1: Escrever o teste vermelho**

Em `backend/test/tenant-isolation.e2e-spec.ts`, adicionar após o teste da Task 3:

```ts
  it('POST /service_orders — A não abre OS usando o carro da B', async () => {
    const attack = await as(a, 'post', '/service_orders').send({
      car_id: bw.carId,
      client_complaint: 'tentativa de vazamento',
    });
    expect([403, 404]).toContain(attack.status);

    const own = await as(b, 'post', '/service_orders')
      .send({ car_id: bw.carId, client_complaint: 'OS legítima' })
      .expect(201);
    expect(own.body.service_order_id).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- tenant-isolation -t "POST /service_orders — A não abre"`
Expected: FAIL — A recebe `201` (OS criada na oficina A apontando pro carro e cliente da B).

- [ ] **Step 3: Corrigir o service**

Em `backend/src/modules/serviceOrder/serviceOrder.service.ts`, no método `create`, logo depois do bloco existente:

```ts
    if (!user.tenant) {
      throw new UnauthorizedException();
    }
```

adicionar:

```ts
    if (car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Esse veículo não pertence ao tenant do usuário.',
      );
    }
```

(`carsService.findById` já carrega a relação `tenant`.)

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npm run test:e2e -- tenant-isolation`
Expected: PASS em tudo.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/serviceOrder/serviceOrder.service.ts backend/test/tenant-isolation.e2e-spec.ts
git commit -m "fix(seguranca): POST /service_orders valida que o carro pertence ao tenant do usuario"
```

---

### Task 5: Escopo do token (onboarding ≠ access) + token antigo + usuário sem oficina

**Files:**
- Create: `backend/src/modules/AuthModule/token-scope.decorator.ts`
- Modify: `backend/src/modules/AuthModule/jwt-auth.guard.ts`
- Modify: `backend/src/modules/tenants/tenants.controller.ts`
- Test: `backend/test/auth-surface.e2e-spec.ts`

**Interfaces:**
- Consumes: `createTestApp`, `createTenantWithOwner`, `Owner` (Task 1); `createWorld`, `World` (Task 2).
- Produces: `RequireTokenScope(scope: 'access' | 'onboarding')` e `TOKEN_SCOPE_KEY` (em `token-scope.decorator.ts`). `JwtAuthGuard` passa a exigir `scope === 'access'` por padrão (token sem `scope` conta como `access`).

- [ ] **Step 1: Escrever os testes vermelhos**

Create `backend/test/auth-surface.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, type World } from './helpers/fixtures';
import { UsersService } from '../src/modules/users/users.service';
import { DataSource } from 'typeorm';
import { Users } from '../src/modules/users/users.entity';
import { randomUUID } from 'crypto';

describe('superfície de autenticação', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;
  let jwt: JwtService;

  const server = () => app.getHttpServer();
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    jwt = app.get(JwtService, { strict: false });
    a = await createTenantWithOwner(app, 'auth');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('token de onboarding NÃO vale nas rotas normais', async () => {
    const onboarding = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
      scope: 'onboarding',
    });

    await request(server()).get('/users/me').set(bearer(onboarding)).expect(401);
    await request(server()).get('/clients').set(bearer(onboarding)).expect(401);
    await request(server())
      .get(`/service_orders/${aw.orderId}`)
      .set(bearer(onboarding))
      .expect(401);
  });

  it('POST /tenants só aceita token de onboarding (access é recusado antes da validação)', async () => {
    await request(server())
      .post('/tenants')
      .set(bearer(a.token))
      .send({})
      .expect(401);

    const onboarding = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
      scope: 'onboarding',
    });

    // passou do guard: corpo vazio agora é barrado pela validação (400), não pelo token (401)
    await request(server())
      .post('/tenants')
      .set(bearer(onboarding))
      .send({})
      .expect(400);
  });

  it('token antigo SEM scope continua valendo como access (compatibilidade)', async () => {
    const legacy = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
    });

    await request(server()).get('/users/me').set(bearer(legacy)).expect(200);
  });

  it('usuário ativo sem oficina recebe 401/403 nas rotas de tenant — nunca 500 nem dados', async () => {
    const email = `semtenant-${randomUUID().slice(0, 8)}@teste.local`;
    const password = 'Teste@12345';
    const user = await app.get(UsersService).create({
      name: 'Sem Oficina',
      email,
      password,
    });
    user.is_active = true;
    await app.get(DataSource).getRepository(Users).save(user);

    const login = await request(server())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.access_token;

    const clients = await request(server()).get('/clients').set(bearer(token));
    expect([401, 403]).toContain(clients.status);

    const order = await request(server())
      .get(`/service_orders/${aw.orderId}`)
      .set(bearer(token));
    expect([401, 403]).toContain(order.status);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- auth-surface`
Expected: FAIL nos dois primeiros testes — token de onboarding retorna `200`/dados em `/users/me`, e o access token em `POST /tenants` não dá 401 (`Expected 401, got 400`). Os outros dois (token legado e usuário sem tenant) já passam: são travas de regressão para a mudança.

- [ ] **Step 3: Criar o decorator**

Create `backend/src/modules/AuthModule/token-scope.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';

export const TOKEN_SCOPE_KEY = 'token_scope';

/** Escopo de JWT exigido pela rota. Sem o decorator, a rota exige 'access'. */
export const RequireTokenScope = (scope: 'access' | 'onboarding') =>
  SetMetadata(TOKEN_SCOPE_KEY, scope);
```

- [ ] **Step 4: Aplicar o escopo no guard**

Substituir o conteúdo de `backend/src/modules/AuthModule/jwt-auth.guard.ts` por:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TOKEN_SCOPE_KEY } from './token-scope.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.get('authorization');

    if (!authHeader) {
      throw new UnauthorizedException('Token ausente');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato do token invalido!');
    }

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado!');
    }

    // Token de onboarding (cadastro em 2 etapas) só vale em rotas que o pedem
    // explicitamente; todas as outras exigem 'access'. Token antigo sem scope
    // conta como 'access' (compatibilidade até expirar).
    const requiredScope =
      this.reflector.getAllAndOverride<string>(TOKEN_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'access';
    const tokenScope = payload.scope ?? 'access';

    if (tokenScope !== requiredScope) {
      throw new UnauthorizedException('Token sem permissão para esta rota.');
    }

    (request as any).user = payload;

    return true;
  }
}
```

- [ ] **Step 5: Marcar `POST /tenants` como rota de onboarding**

Em `backend/src/modules/tenants/tenants.controller.ts`, adicionar o import:

```ts
import { RequireTokenScope } from '../AuthModule/token-scope.decorator';
```

e o decorator no método `create`, logo abaixo de `@UseGuards(JwtAuthGuard)`:

```ts
  @Post()
  @UseGuards(JwtAuthGuard)
  @RequireTokenScope('onboarding')
  @HttpCode(HttpStatus.CREATED)
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd backend && npm run test:e2e -- auth-surface`
Expected: PASS nos 4 testes.

- [ ] **Step 7: Rodar toda a suíte e o build**

Run: `cd backend && npm run test:e2e && npm run build`
Expected: tudo PASS, build sem erros.

- [ ] **Step 8: Conferir o fluxo real de cadastro no frontend (não pode quebrar)**

Run: `grep -rn "onboarding" frontend/oficinasync-web/src --include=*.tsx --include=*.ts`
Expected: o token de onboarding só é usado pela chamada `POST /tenants` (TenantRegisterPage). Se aparecer em qualquer outra rota, essa rota quebraria com a mudança: anote e trate antes do commit.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/AuthModule/token-scope.decorator.ts backend/src/modules/AuthModule/jwt-auth.guard.ts backend/src/modules/tenants/tenants.controller.ts backend/test/auth-surface.e2e-spec.ts
git commit -m "fix(seguranca): JwtAuthGuard exige scope access (onboarding so vale em POST /tenants)"
```

---

### Task 6: Remover `POST /users` (cadastro público sem throttle, sem uso no frontend)

**Files:**
- Modify: `backend/src/modules/users/users.controller.ts`
- Test: `backend/test/auth-surface.e2e-spec.ts`

**Interfaces:**
- Consumes: `server()`/`describe` de `auth-surface.e2e-spec.ts` (Task 5).

- [ ] **Step 1: Escrever o teste vermelho**

Em `backend/test/auth-surface.e2e-spec.ts`, adicionar dentro do `describe`:

```ts
  it('POST /users (cadastro público sem throttle) não existe mais', async () => {
    await request(server())
      .post('/users')
      .send({
        name: 'Intruso',
        email: `intruso-${randomUUID().slice(0, 8)}@teste.local`,
        password: 'Teste@12345',
      })
      .expect(404);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- auth-surface -t "POST /users"`
Expected: FAIL — retorna `201` (usuário criado sem nenhum limite de taxa).

- [ ] **Step 3: Confirmar que nada usa a rota**

Run: `grep -rn "post(\"/users\"\|'/users'\|\"/users\"" frontend/oficinasync-web/src backend/scripts`
Expected: nenhuma ocorrência (só `/users/me` e `/users/me/password` existem no frontend; o `seed-employees.ts` usa o service direto). O cadastro real é `POST /auth/register` (com throttle).

- [ ] **Step 4: Remover o handler**

Em `backend/src/modules/users/users.controller.ts`:

1. Remover do import de `@nestjs/common` o item `Post`.
2. Remover a linha `import { CreateUserDto } from './dto/create-users.dto';`.
3. Apagar o método inteiro:

```ts
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.create(createUserDto);

    return plainToInstance(ResponseUserDto, user);
  }
```

(`UsersService.create` continua existindo — o `AuthService.register` usa.)

- [ ] **Step 5: Rodar e ver passar + build**

Run: `cd backend && npm run test:e2e -- auth-surface && npm run build`
Expected: PASS, build sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/users/users.controller.ts backend/test/auth-surface.e2e-spec.ts
git commit -m "fix(seguranca): remove POST /users publico (cadastro sem throttle e sem uso no frontend)"
```

---

### Task 7: Id inexistente devolve 404 (não 500)

**Files:**
- Modify: `backend/src/modules/clients/clients.service.ts` (método `findById`, ~linha 93)
- Modify: `backend/src/modules/cars/cars.service.ts` (método `findById`, ~linha 48)
- Test: `backend/test/not-found.e2e-spec.ts`

**Interfaces:**
- Consumes: `createTestApp`, `createTenantWithOwner` (Task 1).

- [ ] **Step 1: Escrever o teste vermelho**

Create `backend/test/not-found.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';

describe('ids inexistentes', () => {
  let app: INestApplication;
  let a: Owner;

  const auth = () => ({ Authorization: `Bearer ${a.token}` });
  const MISSING = 2000000000;

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'nf');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', `/cars/${MISSING}`, undefined],
    ['patch', `/cars/${MISSING}`, { color: 'x' }],
    ['patch', `/clients/${MISSING}`, { address: 'x' }],
    ['get', `/service_orders/${MISSING}`, undefined],
    ['get', `/service_orders/by-car/${MISSING}`, undefined],
    ['get', `/tests/history?car_id=${MISSING}&title=x`, undefined],
  ] as ['get' | 'patch', string, object | undefined][])(
    '%s %s → 404',
    async (method, path, body) => {
      const req = request(app.getHttpServer())[method](path).set(auth());
      const res = body ? await req.send(body) : await req;
      expect(res.status).toBe(404);
    },
  );
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- not-found`
Expected: FAIL nos casos de carro/cliente (`Expected 404, Received 500`); `GET /service_orders/:id` já dá 404.

- [ ] **Step 3: Corrigir `ClientsService.findById`**

Em `backend/src/modules/clients/clients.service.ts`, adicionar `NotFoundException` ao import de `@nestjs/common` e trocar:

```ts
    if (!client) {
      throw new Error('Usuario nao encontrado!');
    }
```

por:

```ts
    if (!client) {
      throw new NotFoundException('Cliente não encontrado!');
    }
```

- [ ] **Step 4: Corrigir `CarsService.findById`**

Em `backend/src/modules/cars/cars.service.ts`, adicionar `NotFoundException` ao import de `@nestjs/common` (a linha atual é `import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';`) e trocar:

```ts
    if (!client) {
      throw new Error('Carro nao encontrado!');
    }
```

por:

```ts
    if (!client) {
      throw new NotFoundException('Carro não encontrado!');
    }
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && npm run test:e2e -- not-found && npm run build`
Expected: PASS nos 6 casos, build sem erros.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/clients/clients.service.ts backend/src/modules/cars/cars.service.ts backend/test/not-found.e2e-spec.ts
git commit -m "fix: id inexistente de cliente/carro devolve 404 em vez de 500"
```

---

### Task 8: Relatório da auditoria

**Files:**
- Create: `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md`

- [ ] **Step 1: Escrever o relatório**

Create `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md`:

```markdown
# Auditoria de isolamento multi-tenant — 2026-10-11

Método: leitura de todos os controllers e services + suíte e2e com duas oficinas
(`backend/test/tenant-isolation.e2e-spec.ts`, `auth-surface.e2e-spec.ts`, `not-found.e2e-spec.ts`).
Rodar: `cd backend && npm run test:e2e` (precisa de `docker compose up -d sqlserver minio`).

## Achados corrigidos

| # | Gravidade | Rota | Problema | Correção |
|---|---|---|---|---|
| 1 | CRÍTICO | `GET /service_orders/:id` | Qualquer usuário logado (de qualquer oficina) lia a OS inteira de outra: CPF, telefone e e-mail do cliente, e-mail do mecânico, URLs assinadas das mídias. Sem checagem de tenant. | Service valida `order.tenant.id === user.tenant.id` (403). |
| 2 | ALTO | `POST /service_orders` | Aceitava `car_id` de outra oficina: criava OS na oficina A ligada ao carro/cliente da B (e, somado ao #1, expunha os dados dela). | Valida o tenant do carro (403). |
| 3 | MÉDIO | `JwtAuthGuard` | Ignorava o `scope` do JWT: o token de onboarding (cadastro em 2 etapas) valia em qualquer rota. | Guard exige `access` por padrão; `POST /tenants` exige `onboarding` via `@RequireTokenScope`. Token antigo sem scope segue válido como `access`. |
| 4 | MÉDIO | `POST /users` | Cadastro público, sem throttle e sem uso no frontend (o real é `POST /auth/register`, com limite). | Rota removida. |
| 5 | BAIXO | cars/clients `findById` | Id inexistente lançava `Error` genérico → 500. | `NotFoundException` → 404. |

## Rotas verificadas sem problema (cobertas por teste de regressão)

`/cars` (GET, GET :id, PATCH), `/clients` (GET, PATCH), `/service_orders` (orders, by-car, finish, report.pdf, promo-video),
`/sections` (POST, PATCH, publish), `/medias` (POST), `/tests` (POST, PATCH, DELETE, history),
`/obd/devices` (CRUD, latest, command) e `/obd/capture`, `/invites` (GET), `/users/me`.
Todas exigem JWT (teste "sem token → 401") e validam o tenant do recurso (A não toca na B).

## Riscos aceitos (decisão consciente)

- **Página pública `/service_orders/public/:token`** expõe nome e telefone do cliente, placa e fotos publicadas a quem tem o link.
  Mitigação: token de 256 bits (`randomBytes(32)`), sem CPF/e-mail (teste garante), só etapas publicadas. É o produto.
- **Enumeração de ids** (403 para id alheio × 404 para inexistente): ids são inteiros sequenciais; o dado em si não vaza. Baixo.
- **`GET /invites/:token` e `GET /health` públicos**: o primeiro depende de token secreto; o segundo só diz "ok".
- **Upload com Content-Type mentiroso**: `MinioService` confia no `mimetype` do cliente quando o `file-type` não detecta o tipo
  (mantém compatibilidade com áudio webm do navegador). Arquivos são servidos por URL assinada do subdomínio `storage.` com o
  Content-Type salvo; risco baixo. Reavaliar se abrir upload a usuários não autenticados (hoje não abre).
- **Throttle global 60 req/min por IP** (+5/min em login/registro/esqueci-senha/aceite de convite): suficiente pra começar.

## Fora do escopo desta auditoria

Infra (firewall da VPS, portas do Docker, rotação de segredos), dependências com CVE (`npm audit`) e revisão jurídica da LGPD.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/audits/2026-10-11-multi-tenant-audit.md
git commit -m "docs: relatorio da auditoria de isolamento multi-tenant"
```

---

### Task 9: Limites de upload por tipo (funções puras + MinioService + teto do multer)

**Files:**
- Create: `backend/src/modules/minio/upload-limits.ts`
- Test: `backend/src/modules/minio/upload-limits.spec.ts`
- Modify: `backend/src/modules/minio/minio.service.ts` (imports linha 6; método `upload`, ~linha 83)
- Modify: `backend/src/modules/medias/media.controller.ts` (linha 26)
- Test: `backend/test/upload-limits.e2e-spec.ts`

**Interfaces:**
- Produces (em `upload-limits.ts`):
  - `HARD_UPLOAD_LIMIT_BYTES: number` (100 MB)
  - `uploadLimitFor(mime: string): { kind: 'foto' | 'áudio' | 'vídeo'; maxBytes: number }`
  - `checkUploadSize(mime: string, sizeBytes: number): string | null` — `null` se ok, senão a mensagem em português
  - `exceedsQuota(usedBytes: number, incomingBytes: number, quotaBytes: number): boolean` (usada na Task 10)

- [ ] **Step 1: Escrever o unit test (vermelho)**

Create `backend/src/modules/minio/upload-limits.spec.ts`:

```ts
import {
  HARD_UPLOAD_LIMIT_BYTES,
  checkUploadSize,
  exceedsQuota,
  uploadLimitFor,
} from './upload-limits';

const MB = 1024 * 1024;

describe('uploadLimitFor', () => {
  it('foto 15 MB, áudio 20 MB, vídeo 100 MB', () => {
    expect(uploadLimitFor('image/png')).toEqual({ kind: 'foto', maxBytes: 15 * MB });
    expect(uploadLimitFor('audio/mpeg')).toEqual({ kind: 'áudio', maxBytes: 20 * MB });
    expect(uploadLimitFor('video/mp4')).toEqual({ kind: 'vídeo', maxBytes: 100 * MB });
  });

  it('teto duro do multer é o maior limite (100 MB)', () => {
    expect(HARD_UPLOAD_LIMIT_BYTES).toBe(100 * MB);
  });
});

describe('checkUploadSize (fronteira)', () => {
  it('exatamente 15 MB de foto passa', () => {
    expect(checkUploadSize('image/png', 15 * MB)).toBeNull();
  });

  it('15 MB + 1 byte de foto é recusado com mensagem em português', () => {
    expect(checkUploadSize('image/png', 15 * MB + 1)).toBe(
      'Arquivo de foto muito grande. O limite é 15 MB.',
    );
  });

  it('vídeo de 100 MB passa, 100 MB + 1 não', () => {
    expect(checkUploadSize('video/mp4', 100 * MB)).toBeNull();
    expect(checkUploadSize('video/mp4', 100 * MB + 1)).toBe(
      'Arquivo de vídeo muito grande. O limite é 100 MB.',
    );
  });
});

describe('exceedsQuota (fronteira)', () => {
  it('fechar exatamente a cota é permitido; 1 byte a mais não', () => {
    expect(exceedsQuota(900, 100, 1000)).toBe(false);
    expect(exceedsQuota(900, 101, 1000)).toBe(true);
  });

  it('aguenta valores acima de 2 GB (sem overflow de int32)', () => {
    expect(exceedsQuota(4_000_000_000, 1, 4_000_000_000)).toBe(true);
    expect(exceedsQuota(3_999_999_999, 1, 4_000_000_000)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm test -- upload-limits`
Expected: FAIL — `Cannot find module './upload-limits'`.

- [ ] **Step 3: Implementar as funções puras**

Create `backend/src/modules/minio/upload-limits.ts`:

```ts
const MB = 1024 * 1024;

/** Teto duro aplicado pelo multer antes de o arquivo inteiro ir pra memória (maior limite por tipo). */
export const HARD_UPLOAD_LIMIT_BYTES = 100 * MB;

export type UploadKind = 'foto' | 'áudio' | 'vídeo';

export function uploadLimitFor(mime: string): {
  kind: UploadKind;
  maxBytes: number;
} {
  if (mime.startsWith('image/')) return { kind: 'foto', maxBytes: 15 * MB };
  if (mime.startsWith('audio/')) return { kind: 'áudio', maxBytes: 20 * MB };
  return { kind: 'vídeo', maxBytes: 100 * MB };
}

/** `null` se o tamanho está dentro do limite do tipo; senão a mensagem de erro em português. */
export function checkUploadSize(mime: string, sizeBytes: number): string | null {
  const { kind, maxBytes } = uploadLimitFor(mime);

  if (sizeBytes > maxBytes) {
    return `Arquivo de ${kind} muito grande. O limite é ${maxBytes / MB} MB.`;
  }

  return null;
}

/** Fechar exatamente a cota é permitido; passar de 1 byte já estoura. */
export function exceedsQuota(
  usedBytes: number,
  incomingBytes: number,
  quotaBytes: number,
): boolean {
  return usedBytes + incomingBytes > quotaBytes;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npm test -- upload-limits`
Expected: PASS (8 testes).

- [ ] **Step 5: Escrever o e2e de limite (vermelho)**

Create `backend/test/upload-limits.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, pngOfSize, type World } from './helpers/fixtures';

const MB = 1024 * 1024;

describe('limites de upload', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;

  const upload = (token: string, buffer: Buffer) =>
    request(app.getHttpServer())
      .post('/medias')
      .set('Authorization', `Bearer ${token}`)
      .field('section_id', String(aw.sectionId))
      .field('type', 'photo')
      .attach('file', buffer, { filename: 'a.png', contentType: 'image/png' });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'lim');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('foto pequena é aceita', async () => {
    await upload(a.token, pngOfSize(50 * 1024)).expect(201);
  });

  it('foto acima de 15 MB é recusada com 413 e mensagem em português', async () => {
    const res = await upload(a.token, pngOfSize(15 * MB + 1024)).expect(413);
    expect(res.body.message).toBe('Arquivo de foto muito grande. O limite é 15 MB.');
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- upload-limits`
Expected: FAIL — a foto de 15 MB + 1 KB retorna `201` (não há limite).

- [ ] **Step 7: Plugar o limite no `MinioService`**

Em `backend/src/modules/minio/minio.service.ts`:

1. Trocar a linha 6 por:

```ts
import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  PayloadTooLargeException,
} from '@nestjs/common';
```

2. Adicionar, junto dos outros imports (após `import { randomUUID } from 'crypto';`):

```ts
import { checkUploadSize } from './upload-limits';
```

3. No método `upload`, imediatamente depois do bloco que lança `Tipo de arquivo não permitido...` e antes de `const objectName = ...`, inserir:

```ts
    const sizeError = checkUploadSize(detectedMimeType, file.size);

    if (sizeError) {
      throw new PayloadTooLargeException(sizeError);
    }
```

- [ ] **Step 8: Plugar o teto duro no multer**

Em `backend/src/modules/medias/media.controller.ts`, adicionar o import:

```ts
import { HARD_UPLOAD_LIMIT_BYTES } from '../minio/upload-limits';
```

e trocar `@UseInterceptors(FileInterceptor('file'))` por:

```ts
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: HARD_UPLOAD_LIMIT_BYTES } }),
  )
```

- [ ] **Step 9: Rodar tudo**

Run: `cd backend && npm test -- upload-limits && npm run test:e2e -- upload-limits && npm run build`
Expected: PASS (unit + e2e), build sem erros.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/minio/upload-limits.ts backend/src/modules/minio/upload-limits.spec.ts backend/src/modules/minio/minio.service.ts backend/src/modules/medias/media.controller.ts backend/test/upload-limits.e2e-spec.ts
git commit -m "feat: limite de tamanho de upload por tipo (foto 15MB, audio 20MB, video 100MB) + teto duro no multer"
```

---

### Task 10: Cota de armazenamento por oficina

**Files:**
- Modify: `backend/src/modules/medias/media.service.ts` (imports; construtor; método `create`)
- Test: `backend/test/upload-limits.e2e-spec.ts`

**Interfaces:**
- Consumes: `exceedsQuota` (Task 9); `createWorld`, `World`, `pngOfSize`, `PNG_1PX` (Task 2).
- Produces: `MediaService.getTenantUsageBytes(tenantId: number): Promise<number>`; variável de ambiente `TENANT_STORAGE_QUOTA_MB` (default 2048).

- [ ] **Step 1: Escrever os testes vermelhos**

Em `backend/test/upload-limits.e2e-spec.ts`, adicionar os imports no topo:

```ts
import { DataSource } from 'typeorm';
import { MediaService } from '../src/modules/medias/media.service';
import { Media } from '../src/modules/medias/media.entity';
import { Sections } from '../src/modules/sections/section.entity';
```

e, dentro do `describe`, os testes:

```ts
  async function insertFakeMedia(sectionId: number, size: number) {
    const ds = app.get(DataSource);
    const section = await ds
      .getRepository(Sections)
      .findOneByOrFail({ section_id: sectionId });
    await ds.getRepository(Media).save(
      ds.getRepository(Media).create({
        type: 'photo',
        bucket: 'oficinasync-test',
        object_name: `fake/${Math.random()}`,
        mime_type: 'image/png',
        size,
        label: null,
        section,
      }),
    );
  }

  it('consumo soma bytes acima de 2 GB sem estourar int32', async () => {
    const owner = await createTenantWithOwner(app, 'big');
    const world = await createWorld(app, owner.token);
    await insertFakeMedia(world.sectionId, 2_000_000_000);
    await insertFakeMedia(world.sectionId, 2_000_000_000);

    const used = await app
      .get(MediaService)
      .getTenantUsageBytes(owner.tenant.id);

    expect(used).toBeGreaterThanOrEqual(4_000_000_000);
  });

  it('cota: upload que passa da cota é recusado (413); fechar a cota é aceito; outra oficina não é afetada', async () => {
    const full = await createTenantWithOwner(app, 'cota1');
    const fullWorld = await createWorld(app, full.token);
    const other = await createTenantWithOwner(app, 'cota2');
    const otherWorld = await createWorld(app, other.token);

    process.env.TENANT_STORAGE_QUOTA_MB = '1'; // 1 MB = 1_048_576 bytes
    try {
      // a foto semeada pelo createWorld já ocupa alguns bytes; preenche até faltar 100 KB
      const base = await app.get(MediaService).getTenantUsageBytes(full.tenant.id);
      await insertFakeMedia(fullWorld.sectionId, 1_048_576 - base - 100 * 1024);

      const send = (token: string, sectionId: number, size: number) =>
        request(app.getHttpServer())
          .post('/medias')
          .set('Authorization', `Bearer ${token}`)
          .field('section_id', String(sectionId))
          .field('type', 'photo')
          .attach('file', pngOfSize(size), {
            filename: 'a.png',
            contentType: 'image/png',
          });

      // 100 KB + 1 byte passa da cota → 413
      const over = await send(full.token, fullWorld.sectionId, 100 * 1024 + 1).expect(413);
      expect(over.body.message).toBe(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );

      // exatamente 100 KB fecha a cota → aceito
      await send(full.token, fullWorld.sectionId, 100 * 1024).expect(201);

      // a outra oficina continua livre
      await send(other.token, otherWorld.sectionId, 50 * 1024).expect(201);
    } finally {
      delete process.env.TENANT_STORAGE_QUOTA_MB;
    }
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- upload-limits`
Expected: FAIL — `getTenantUsageBytes is not a function` (e o teste de cota recebe `201` onde esperava `413`).

- [ ] **Step 3: Implementar no `MediaService`**

Em `backend/src/modules/medias/media.service.ts`:

1. Trocar o import de `@nestjs/common` por:

```ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
```

2. Adicionar o import:

```ts
import { exceedsQuota } from '../minio/upload-limits';
```

3. No construtor, acrescentar a injeção (por último):

```ts
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}
```

4. Adicionar o método (logo antes de `async create`):

```ts
  /** Bytes de mídia da oficina. CAST pra BIGINT: SUM(int) estoura em 2 GB no SQL Server. */
  async getTenantUsageBytes(tenantId: number): Promise<number> {
    const row = await this.mediaRepository
      .createQueryBuilder('m')
      .innerJoin('m.section', 's')
      .innerJoin('s.serviceOrder', 'so')
      .innerJoin('so.tenant', 't')
      .where('t.id = :tenantId', { tenantId })
      .select('COALESCE(SUM(CAST(m.size AS BIGINT)), 0)', 'total')
      .getRawOne<{ total: string | number }>();

    return Number(row?.total ?? 0);
  }
```

5. Em `create`, imediatamente depois do bloco que lança `Essa section não pertence ao tenant do usuário.` e antes de `const uploadedFile = ...`, inserir:

```ts
    const quotaBytes =
      Number(this.configService.get('TENANT_STORAGE_QUOTA_MB') ?? 2048) *
      1024 *
      1024;
    const usedBytes = await this.getTenantUsageBytes(user.tenant.id);

    if (exceedsQuota(usedBytes, file?.size ?? 0, quotaBytes)) {
      throw new PayloadTooLargeException(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npm run test:e2e -- upload-limits && npm run build`
Expected: PASS nos 4 testes do arquivo, build sem erros.

- [ ] **Step 5: Documentar a variável nos exemplos de env**

Run:
```bash
printf '\n# Cota de armazenamento de midia por oficina, em MB (default 2048)\nTENANT_STORAGE_QUOTA_MB=2048\n' >> backend/.env.production.example
printf '\n# Cota de armazenamento de midia por oficina, em MB (default 2048)\nTENANT_STORAGE_QUOTA_MB=2048\n' >> backend/.env.example
```
Expected: sem saída; `tail -3 backend/.env.example` mostra as 2 linhas novas.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/medias/media.service.ts backend/test/upload-limits.e2e-spec.ts backend/.env.production.example backend/.env.example
git commit -m "feat: cota de armazenamento de midia por oficina (TENANT_STORAGE_QUOTA_MB, default 2GB)"
```

---

### Task 11: Vídeo de divulgação desligado por padrão + concorrência 1 + UI

**Files:**
- Create: `backend/src/modules/video/concurrency-limiter.ts`
- Test: `backend/src/modules/video/concurrency-limiter.spec.ts`
- Modify: `backend/src/modules/video/video.service.ts` (linha 1; classe; `triggerPromoVideo`)
- Modify: `backend/src/modules/serviceOrder/serviceOrder.service.ts` (resposta de `findById`)
- Modify: `frontend/oficinasync-web/src/components/os/types.ts` (~linha 53)
- Modify: `frontend/oficinasync-web/src/pages/OsWorkPage.tsx` (~linhas 359–385)
- Modify: `frontend/oficinasync-web/src/components/media/MediaCaptureField.tsx`
- Modify: `backend/.env.production.example`, `backend/.env.example`
- Test: `backend/test/promo-video-flag.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `class ConcurrencyLimiter { constructor(max: number); tryAcquire(): boolean; release(): void }`
  - `GET /service_orders/:id` passa a devolver `features: { promo_video: boolean }`
  - Variável `PROMO_VIDEO_ENABLED` (`'true'` liga; qualquer outra coisa = desligado)

- [ ] **Step 1: Unit test do limitador (vermelho)**

Create `backend/src/modules/video/concurrency-limiter.spec.ts`:

```ts
import { ConcurrencyLimiter } from './concurrency-limiter';

describe('ConcurrencyLimiter', () => {
  it('com max 1: o primeiro adquire, o segundo é recusado, depois de liberar volta a adquirir', () => {
    const limiter = new ConcurrencyLimiter(1);

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);

    limiter.release();
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('release a mais não deixa o contador negativo (não "cria" vagas)', () => {
    const limiter = new ConcurrencyLimiter(1);

    limiter.release();
    limiter.release();

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm test -- concurrency-limiter`
Expected: FAIL — `Cannot find module './concurrency-limiter'`.

- [ ] **Step 3: Implementar o limitador**

Create `backend/src/modules/video/concurrency-limiter.ts`:

```ts
/** Limita quantas tarefas pesadas (ffmpeg) rodam ao mesmo tempo no processo. */
export class ConcurrencyLimiter {
  private running = 0;

  constructor(private readonly max: number) {}

  tryAcquire(): boolean {
    if (this.running >= this.max) return false;
    this.running += 1;
    return true;
  }

  release(): void {
    this.running = Math.max(0, this.running - 1);
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npm test -- concurrency-limiter`
Expected: PASS (2 testes).

- [ ] **Step 5: Teste e2e da flag (vermelho)**

Create `backend/test/promo-video-flag.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, type World } from './helpers/fixtures';

describe('vídeo de divulgação atrás de flag', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;

  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'flag');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    delete process.env.PROMO_VIDEO_ENABLED;
    await app.close();
  });

  it('desligado por padrão: 403 e a OS informa features.promo_video = false', async () => {
    delete process.env.PROMO_VIDEO_ENABLED;

    const res = await request(app.getHttpServer())
      .post(`/service_orders/${aw.orderId}/promo-video`)
      .set(auth())
      .expect(403);
    expect(res.body.message).toBe(
      'A geração de vídeo de divulgação não está disponível no seu plano.',
    );

    const order = await request(app.getHttpServer())
      .get(`/service_orders/${aw.orderId}`)
      .set(auth())
      .expect(200);
    expect(order.body.features).toEqual({ promo_video: false });
  });

  it('ligado: passa da flag (e cai na regra seguinte: sem vídeo na OS → 400) e features.promo_video = true', async () => {
    process.env.PROMO_VIDEO_ENABLED = 'true';

    const res = await request(app.getHttpServer())
      .post(`/service_orders/${aw.orderId}/promo-video`)
      .set(auth())
      .expect(400);
    expect(res.body.message).toBe('Nenhum vídeo enviado nas etapas desta OS ainda.');

    const order = await request(app.getHttpServer())
      .get(`/service_orders/${aw.orderId}`)
      .set(auth())
      .expect(200);
    expect(order.body.features).toEqual({ promo_video: true });
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- promo-video-flag`
Expected: FAIL — o primeiro teste recebe `400` (hoje não há flag) e `features` é `undefined`.

- [ ] **Step 7: Implementar a flag e o limitador no `VideoService`**

Em `backend/src/modules/video/video.service.ts`:

1. Trocar a linha 1 por:

```ts
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
```

2. Adicionar o import (junto dos outros imports do topo):

```ts
import { ConcurrencyLimiter } from './concurrency-limiter';
```

3. Dentro da classe `VideoService`, antes do construtor, adicionar:

```ts
  // ffmpeg é pesado: no máximo 1 geração por vez neste processo.
  private readonly limiter = new ConcurrencyLimiter(1);
```

4. Em `triggerPromoVideo`, logo depois do bloco do tenant (`Essa ordem de serviço não pertence ao tenant do usuário.`) e **antes** de `const hasVideo`, inserir:

```ts
    if (process.env.PROMO_VIDEO_ENABLED !== 'true') {
      throw new ForbiddenException(
        'A geração de vídeo de divulgação não está disponível no seu plano.',
      );
    }
```

5. Substituir o trecho final do método:

```ts
    await this.serviceOrdersService.setPromoVideoStatus(
      orderId,
      PromoVideoStatus.PROCESSING,
    );

    this.generate(orderId, userId).catch((error) => {
      console.error('Erro ao gerar vídeo de divulgação', error);
    });

    return PromoVideoStatus.PROCESSING;
```

por:

```ts
    if (!this.limiter.tryAcquire()) {
      throw new HttpException(
        'Já existe um vídeo sendo gerado. Tente de novo em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      await this.serviceOrdersService.setPromoVideoStatus(
        orderId,
        PromoVideoStatus.PROCESSING,
      );
    } catch (error) {
      this.limiter.release();
      throw error;
    }

    this.generate(orderId, userId)
      .catch((error) => {
        console.error('Erro ao gerar vídeo de divulgação', error);
      })
      .finally(() => this.limiter.release());

    return PromoVideoStatus.PROCESSING;
```

- [ ] **Step 8: Expor `features` na OS**

Em `backend/src/modules/serviceOrder/serviceOrder.service.ts`, no objeto retornado por `findById`, logo depois da linha `public_url: ...,` adicionar:

```ts
      features: {
        promo_video: process.env.PROMO_VIDEO_ENABLED === 'true',
      },
```

- [ ] **Step 9: Rodar e ver passar (backend completo)**

Run: `cd backend && npm test && npm run test:e2e && npm run build`
Expected: unit PASS, e2e PASS (todos os arquivos), build sem erros.

- [ ] **Step 10: Frontend — tipo**

Em `frontend/oficinasync-web/src/components/os/types.ts`, depois da linha `promo_video_status?: "none" | "processing" | "ready" | "failed";` adicionar:

```ts
  /** Recursos liberados pelo servidor (ex: geração do vídeo de divulgação). */
  features?: { promo_video: boolean };
```

- [ ] **Step 11: Frontend — esconder "Gerar vídeo" quando a flag está desligada**

Em `frontend/oficinasync-web/src/pages/OsWorkPage.tsx`, localizar o ternário do vídeo (começa em `{videoStatus === "ready" && promoVideoMedia?.url ? (` e termina em `)}` logo antes de `{onlineObdDevice && (`). Trocar a abertura do segundo ramo:

```tsx
            ) : (
              <Button
                variant="outline"
                className="h-11"
                onClick={generatePromoVideo}
```

por:

```tsx
            ) : data.features?.promo_video ? (
              <Button
                variant="outline"
                className="h-11"
                onClick={generatePromoVideo}
```

e o fechamento (as linhas imediatamente antes de `{onlineObdDevice && (`):

```tsx
              </Button>
            )}

            {onlineObdDevice && (
```

por:

```tsx
              </Button>
            ) : null}

            {onlineObdDevice && (
```

(O botão "Baixar vídeo" de quem já tem vídeo pronto continua aparecendo.)

- [ ] **Step 12: Frontend — recusar vídeo grande antes do upload**

Em `frontend/oficinasync-web/src/components/media/MediaCaptureField.tsx`:

1. Adicionar o import `toast`:

```tsx
import { toast } from "sonner";
```

2. Acima do `export function MediaCaptureField`, adicionar:

```tsx
// Espelha o limite de vídeo do backend (backend/src/modules/minio/upload-limits.ts).
const MAX_VIDEO_MB = 100;
```

3. Em `handleFile`, depois do bloco `if (!file) { ... }` e antes do `onChange(...)`, inserir:

```tsx
    if (type === "video" && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Vídeo muito grande. O limite é ${MAX_VIDEO_MB} MB.`);
      return;
    }
```

- [ ] **Step 13: Build do frontend**

Run: `cd frontend/oficinasync-web && npm run build`
Expected: `✓ built`, sem erros de tipo.

- [ ] **Step 14: Documentar a flag nos exemplos de env**

Run:
```bash
printf '\n# Geracao do video de divulgacao (ffmpeg, pesado). Desligado por padrao.\nPROMO_VIDEO_ENABLED=false\n' >> backend/.env.production.example
printf '\n# Geracao do video de divulgacao (ffmpeg, pesado). Desligado por padrao.\nPROMO_VIDEO_ENABLED=false\n' >> backend/.env.example
```
Expected: sem saída.

- [ ] **Step 15: Verificação visual rápida do botão (frontend)**

Subir o dev server (`preview_start` com o nome `frontend` do `.claude/launch.json`) e o backend de dev (`cd backend && npm run start:dev`), abrir uma OS no `OsWorkPage`: com `PROMO_VIDEO_ENABLED` ausente o botão **"Gerar vídeo" não aparece**; reiniciar o backend com `PROMO_VIDEO_ENABLED=true` e recarregar: o botão aparece.

- [ ] **Step 16: Commit**

```bash
git add backend/src/modules/video/concurrency-limiter.ts backend/src/modules/video/concurrency-limiter.spec.ts backend/src/modules/video/video.service.ts backend/src/modules/serviceOrder/serviceOrder.service.ts backend/test/promo-video-flag.e2e-spec.ts backend/.env.production.example backend/.env.example frontend/oficinasync-web/src/components/os/types.ts frontend/oficinasync-web/src/pages/OsWorkPage.tsx frontend/oficinasync-web/src/components/media/MediaCaptureField.tsx
git commit -m "feat: video de divulgacao atras da flag PROMO_VIDEO_ENABLED (desligado), concorrencia 1 e limite de video no cliente"
```

---

### Task 12: Verificação final e documentação

**Files:**
- Modify: `CLAUDE.md` (inserir seção antes de `## Configuração (.env do backend)`)

- [ ] **Step 1: Rodar tudo do zero**

Run: `cd backend && npm test && npm run test:e2e && npm run build && cd ../frontend/oficinasync-web && npm run build`
Expected: unit PASS, e2e PASS (smoke, tenant-isolation, auth-surface, not-found, upload-limits, promo-video-flag), os dois builds sem erro.

- [ ] **Step 2: Documentar no CLAUDE.md**

Em `CLAUDE.md`, substituir a linha única `## Configuração (.env do backend)` por:

```markdown
### Testes de isolamento entre oficinas + limites de upload (feito)

Primeira parte do "Lançamento enxuto" (spec `docs/superpowers/specs/2026-10-11-lancamento-enxuto-design.md`, plano `docs/superpowers/plans/2026-10-11-fundacao-segura.md`, relatório `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md`).

- **Suíte e2e** (`cd backend && npm run test:e2e`, precisa de `docker compose up -d sqlserver minio`): sobe o `AppModule` real contra o banco `oficinasync_test` (criado sozinho; o schema vem das migrations) e o bucket `oficinasync-test`, semeia duas oficinas e prova que a A não lê/altera nada da B. **Rodar antes de qualquer deploy que mexa em rotas.** Unit tests: `npm test`. `file-type` é ESM-only e não carrega no Jest — o e2e usa um stub (`test/stubs/file-type.ts`, só PNG).
- **Vazamentos corrigidos**: `GET /service_orders/:id` não validava tenant (qualquer logado lia qualquer OS, com CPF do cliente); `POST /service_orders` aceitava carro de outra oficina; `JwtAuthGuard` ignorava o `scope` (agora `access` por padrão, `@RequireTokenScope('onboarding')` só em `POST /tenants`; token antigo sem scope vale como access); `POST /users` público removido; id inexistente de cliente/carro agora é 404.
- **Limites de upload**: foto 15 MB, áudio 20 MB, vídeo 100 MB (`src/modules/minio/upload-limits.ts`, 413 em português), teto duro do multer 100 MB, **cota por oficina** `TENANT_STORAGE_QUOTA_MB` (default 2048; soma com `CAST(... AS BIGINT)` porque `SUM(int)` estoura em 2 GB no SQL Server).
- **Vídeo de divulgação** (ffmpeg) fica **desligado por padrão** (`PROMO_VIDEO_ENABLED=true` liga; 1 geração por vez via `ConcurrencyLimiter`). `GET /service_orders/:id` devolve `features.promo_video` e o `OsWorkPage` esconde o botão "Gerar vídeo" quando desligado. A captura de vídeo na OS não muda.
- **Pendente do lançamento** (Planos B e C): guard de assinatura/trial 14 dias, painel super-admin, cobrança manual (§4.3–4.5), termos/privacidade/landing e backup/uptime (§4.6–4.7).

## Configuração (.env do backend)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: documenta suite e2e de isolamento, limites de upload e flag do video de divulgacao"
```

- [ ] **Step 4: Nota de deploy (não executar sem o Leonardo)**

Antes do deploy em produção, adicionar ao `backend/.env.production` da VPS: `TENANT_STORAGE_QUOTA_MB=2048` e `PROMO_VIDEO_ENABLED=false` (ou deixar ausente — o default já é desligado). **Efeito visível pra Lima Auto Elétrica:** o botão "Gerar vídeo" some do `OsWorkPage` (foi decisão do Leonardo no spec) e uploads acima dos limites passam a ser recusados. Deploy padrão: `git pull` + `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` (sem migration neste plano, não precisa de backup do banco).

---

## Self-Review (feita ao escrever)

- **Cobertura do spec §4.1:** matriz A×B de todas as rotas autenticadas (Task 2), rota pública sem CPF/e-mail (Task 2), rotas sem token (Task 2), vazamentos corrigidos (Tasks 3–7), tabela de achados e riscos aceitos (Task 8). `GET /health`, throttling e URLs presigned estão na seção "riscos aceitos" do relatório.
- **Cobertura do spec §4.2:** limite por arquivo e teto do multer (Task 9), cota por oficina (Task 10), flag + concorrência 1 + `features` + UI (Task 11).
- **Fora deste plano (por design):** §4.3 guard de assinatura, §4.4 super-admin, §4.5 cobrança, §4.6, §4.7 → Planos B e C.
- **Consistência de nomes:** `createTestApp`, `createTenantWithOwner`/`Owner`, `createWorld`/`World`, `PNG_1PX`, `pngOfSize`, `generateCpf`, `checkUploadSize`, `exceedsQuota`, `getTenantUsageBytes`, `ConcurrencyLimiter`, `RequireTokenScope`, `TOKEN_SCOPE_KEY` — usados com a mesma assinatura em todas as tasks.
- **Placeholders:** nenhum; todo passo de código traz o código.
- **Limitação conhecida:** a concorrência real do ffmpeg não tem teste automatizado (precisaria de vídeos + ffmpeg no CI); o comportamento do `ConcurrencyLimiter` está coberto em unit test e o encaixe no `VideoService` é revisado manualmente no Step 7 da Task 11.
