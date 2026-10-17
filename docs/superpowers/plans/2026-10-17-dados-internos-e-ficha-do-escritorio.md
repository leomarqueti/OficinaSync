# Dados internos da OS + ficha do escritório + equipe/comissão + uso guiado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à equipe da Lima contas por perfil e uma área **interna** por OS (peças retiradas×usadas com foto de caixa, serviços, equipe em %, anotações) que o **escritório** consulta numa **ficha** imprimível/copiável — sem nada disso aparecer ao cliente final — mais comissões por porcentagem e um passo a passo no primeiro acesso.

**Architecture:** Um `InternalModule` novo no backend (entidades próprias + rotas `/service_orders/:id/...` separadas), com permissões calculadas por uma função pura (`permissionsFor`) e aplicadas no service; `GET /service_orders/:id` e a rota pública **não são tocados**. No frontend: uma página `/os/:id/escritorio` (editar), `/os/:id/ficha` (consultar/copiar/imprimir), `/comissoes`, e componentes `GuidedTour`/`HelpHint`.

**Tech Stack:** NestJS 11 + TypeORM (SQL Server) + class-validator; MinIO; React/Vite/Tailwind/shadcn; Jest (unit + e2e com 2 oficinas), Vitest e Playwright em `ui-tests/`.

**Spec:** `docs/superpowers/specs/2026-10-17-dados-internos-e-ficha-do-escritorio-design.md`

## Global Constraints

- **Cliente final nunca vê dados internos**: nada novo em `GET /service_orders/public/:token`, `GET /service_orders/:id`, laudo PDF (`report.service.ts`/`report.template.ts`) nem na página `/servico/:token`.
- **Perfis:** `owner` e `receptionist` = **escritório** (veem tudo); `mechanic` vê só o dele. Responsável = `service_orders.responsible_user_id ?? service_orders.user_id`.
- Comissão em **porcentagem inteira** (1–99 por ajudante, soma ≤ 99; o responsável fica com `100 − soma`). **Sem R$ de comissão.**
- Peças: `taken_quantity` ≥ 0, `used_quantity` (null = sem acerto) **≤ `taken_quantity`**, `unit_price` null = "preço não informado". Foto da caixa é **interna**, entra na **cota** de armazenamento da oficina.
- Após a OS finalizada: **só o escritório** edita peças, serviços e equipe.
- Todo campo de DTO de entrada precisa de decorator do class-validator (o `ValidationPipe` tem `whitelist`). Toda consulta filtra por `tenant`. IDs de outra oficina → 403/404, nunca vazar.
- **Regra do projeto:** teste primeiro, vê-lo FALHAR pelo motivo certo, implementar, rodar a suíte inteira; commits só com `git add` de caminhos explícitos; sem push/deploy. Textos ao usuário em português. Gotcha global: rode `git` sempre da raiz (há `.git` aninhado antigo em `frontend/oficinasync-web/`).
- Não entram em nenhum commit: `frontend/oficinasync-web/package*.json`, `src/main.tsx`, `src/lib/nativeShell.ts`, `mobile/`, `.claude/launch.json`, `Laudo_*.pdf` (trabalho Android do Leonardo).

## Review Focus

1. **Mecânico que não é o responsável** chamando as rotas de equipe, anotações e ficha → 403; e na leitura recebe **só a própria linha** da equipe (isso vale na API, não só na tela). → Tasks 2, 5, 6.
2. **Equipe inválida:** usuário de outra oficina, inativo, duplicado, o próprio responsável, soma > 99, % fora de 1–99 → 400 e nada gravado. Trocar o responsável para quem já era ajudante não pode deixar a pessoa nos dois papéis. → Task 5.
3. **Vazamento:** valores-sentinela internos não podem aparecer em `GET /service_orders/public/:token`, `GET /service_orders/:id` nem no código do laudo. → Task 6.
4. **Números e texto:** usada > retirada, quantidade/preço negativos ou com 3 casas, descrição com HTML (`<script>`) — vira texto inofensivo na ficha e na cópia. → Tasks 3, 7, 9.
5. **OS finalizada:** mecânico não edita peças/serviços; responsável não edita equipe; escritório edita tudo. Foto que não é imagem, acima do limite ou acima da cota é recusada. → Tasks 3, 4, 5.

---

## File Structure

**Backend — criar** (`backend/src/modules/internal/`): `decimal.transformer.ts`, `service-order-part.entity.ts`, `service-order-service.entity.ts`, `service-order-participant.entity.ts`, `internal-access.ts` (+ `.spec.ts`), `internal-math.ts` (+ `.spec.ts`), `internal-context.service.ts`, `parts.service.ts`, `team.service.ts`, `office-sheet.service.ts`, `internal.controller.ts`, `commissions.controller.ts`, `internal.module.ts`, `dto/*.ts`; `backend/src/migrations/<ts>-InternalOrderData.ts` (gerada).
**Backend — modificar:** `serviceOrder.entity.ts` (+`internal_notes`, `+responsible`), `users/dto/response-users.dto.ts` (+`role`), `minio/minio.service.ts` (`upload(file, opts)`, `removeObject`), `medias/media.service.ts` (`getTenantUsageBytes` soma fotos de peças), `app.module.ts` (importa `InternalModule`), `test/helpers/seed.ts` (`createStaff`), `test/helpers/fixtures.ts` (`openOrderAs`), `test/ui-seed.ts` (mecânico).
**Backend — testes:** `test/internal-access.e2e-spec.ts`, `test/internal-parts.e2e-spec.ts`, `test/internal-team.e2e-spec.ts`, `test/internal-sheet.e2e-spec.ts`.
**Frontend — criar:** `src/lib/internalApi.ts`, `src/lib/me.ts`, `src/lib/tours.ts`, `src/pages/OsOfficePage.tsx`, `src/pages/OsSheetPage.tsx`, `src/pages/CommissionsPage.tsx`, `src/components/internal/{PartsSection,ServicesSection,TeamSection,NotesSection,PartSheet}.tsx`, `src/components/guide/{GuidedTour,HelpHint}.tsx`.
**Frontend — modificar:** `App.tsx` (rotas), `pages/OsWorkPage.tsx` (botões), `components/DashboardSidebar.tsx` (Comissões, esconder Scanner), `pages/dashBoardPage.tsx` (monta o tour), `pages/SettingsPage.tsx` ("Rever passo a passo"), `pages/ScannerPage.tsx` (texto).
**Tests de tela/lógica:** `ui-tests/unit/internalApi.test.ts`, `ui-tests/e2e/dados-internos.spec.ts`; `ui-tests/e2e/global-setup.ts` (estado do mecânico).

## Pré-requisitos do ambiente

- Docker no ar (`docker ps`: `oficinasync-db`, `oficinasync-storage`). **Pare o ambiente de teste manual antes dos testes de tela:** `bash ui-tests/scripts/stop-env.sh` (o Playwright sobe os próprios servidores nas portas 3100/5183).
- Branch: `feat/dados-internos` (já criada, com o spec).
- Antes de cada Playwright: `cd backend && npm run build`.

---

### Task 1: Fundação — entidades, migration, permissões puras, `role` no `/users/me`, helpers de teste

**Files:**
- Create: `backend/src/modules/internal/decimal.transformer.ts`, `service-order-part.entity.ts`, `service-order-service.entity.ts`, `service-order-participant.entity.ts`, `internal-access.ts`, `internal-access.spec.ts`
- Modify: `backend/src/modules/serviceOrder/serviceOrder.entity.ts`, `backend/src/modules/users/dto/response-users.dto.ts`, `backend/test/helpers/seed.ts`, `backend/test/helpers/fixtures.ts`
- Create: migration gerada em `backend/src/migrations/`

**Interfaces:**
- Produces:
  - `type Viewer = { userId: number; role: Role; isResponsible: boolean }`; `isOffice(role): boolean`; `permissionsFor(viewer, orderDone): Permissions` com `Permissions = { edit_items; edit_team; edit_notes; change_responsible; see_sheet; see_all_team: boolean }`; `responsibleShare(shares: number[]): number`; `validateShares(shares: number[]): string | null`.
  - Entidades `ServiceOrderParts`, `ServiceOrderServices`, `ServiceOrderParticipants`; colunas `ServiceOrders.internal_notes: string | null`, `ServiceOrders.responsible: Users | null`.
  - Helpers de teste: `createStaff(app, tenant, role, label): Promise<Staff>` (`Staff = { user: Users; email: string; token: string; role: Role }`), `openOrderAs(app, token): Promise<{ orderId: number; carId: number; publicToken: string; plate: string }>`.

- [ ] **Step 1: Teste das permissões (vermelho)**

Create `backend/src/modules/internal/internal-access.spec.ts`:

```ts
import { Role } from '../users/role.enum';
import {
  isOffice,
  permissionsFor,
  responsibleShare,
  validateShares,
  type Viewer,
} from './internal-access';

const viewer = (role: Role, isResponsible = false): Viewer => ({
  userId: 1,
  role,
  isResponsible,
});

describe('permissionsFor', () => {
  it('dono e recepção são escritório e podem tudo, mesmo com a OS finalizada', () => {
    for (const role of [Role.OWNER, Role.RECEPTIONIST]) {
      expect(isOffice(role)).toBe(true);
      expect(permissionsFor(viewer(role), true)).toEqual({
        edit_items: true,
        edit_team: true,
        edit_notes: true,
        change_responsible: true,
        see_sheet: true,
        see_all_team: true,
      });
    }
  });

  it('mecânico responsável: edita itens/equipe enquanto aberta; vê ficha e anotações; não troca responsável', () => {
    expect(permissionsFor(viewer(Role.MECHANIC, true), false)).toEqual({
      edit_items: true,
      edit_team: true,
      edit_notes: true,
      change_responsible: false,
      see_sheet: true,
      see_all_team: true,
    });
  });

  it('mecânico responsável com a OS finalizada: não edita itens nem equipe', () => {
    const p = permissionsFor(viewer(Role.MECHANIC, true), true);
    expect(p.edit_items).toBe(false);
    expect(p.edit_team).toBe(false);
  });

  it('mecânico comum: só edita itens enquanto aberta; sem equipe, anotações, ficha nem troca de responsável', () => {
    expect(permissionsFor(viewer(Role.MECHANIC), false)).toEqual({
      edit_items: true,
      edit_team: false,
      edit_notes: false,
      change_responsible: false,
      see_sheet: false,
      see_all_team: false,
    });
    expect(permissionsFor(viewer(Role.MECHANIC), true).edit_items).toBe(false);
  });
});

describe('porcentagens', () => {
  it('o responsável fica com o que sobra', () => {
    expect(responsibleShare([])).toBe(100);
    expect(responsibleShare([30, 20])).toBe(50);
  });

  it('a soma dos ajudantes pode chegar a 99, não a 100', () => {
    expect(validateShares([99])).toBeNull();
    expect(validateShares([50, 49])).toBeNull();
    expect(validateShares([50, 50])).toMatch(/99%/);
    expect(validateShares([60, 40])).toMatch(/99%/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm test -- internal-access`
Expected: FAIL — `Cannot find module './internal-access'`.

- [ ] **Step 3: Implementar `internal-access.ts`**

Create `backend/src/modules/internal/internal-access.ts`:

```ts
import { Role } from '../users/role.enum';

export type Viewer = { userId: number; role: Role; isResponsible: boolean };

export type Permissions = {
  edit_items: boolean;
  edit_team: boolean;
  edit_notes: boolean;
  change_responsible: boolean;
  see_sheet: boolean;
  see_all_team: boolean;
};

/** Dono e recepção formam o "escritório": veem e editam tudo, mesmo com a OS finalizada. */
export const isOffice = (role: Role): boolean =>
  role === Role.OWNER || role === Role.RECEPTIONIST;

export function permissionsFor(viewer: Viewer, orderDone: boolean): Permissions {
  const office = isOffice(viewer.role);
  return {
    edit_items: office || !orderDone,
    edit_team: office || (viewer.isResponsible && !orderDone),
    edit_notes: office || viewer.isResponsible,
    change_responsible: office,
    see_sheet: office || viewer.isResponsible,
    see_all_team: office || viewer.isResponsible,
  };
}

/** A parte do responsável não é digitada: é o que sobra dos ajudantes. */
export const responsibleShare = (shares: number[]): number =>
  100 - shares.reduce((acc, n) => acc + n, 0);

/** O responsável precisa ficar com pelo menos 1%. */
export function validateShares(shares: number[]): string | null {
  const sum = shares.reduce((acc, n) => acc + n, 0);
  return sum > 99
    ? 'A soma das porcentagens dos ajudantes passa de 99% (o responsável fica com pelo menos 1%).'
    : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && npm test -- internal-access`
Expected: PASS (6 testes).

- [ ] **Step 5: Entidades**

Create `backend/src/modules/internal/decimal.transformer.ts`:

```ts
/** decimal do SQL Server volta como string no driver; aqui vira number (ou null). */
export const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? null : Number(value),
};
```

Create `backend/src/modules/internal/service-order-part.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { decimalTransformer } from './decimal.transformer';

@Entity('service_order_parts')
export class ServiceOrderParts {
  @PrimaryGeneratedColumn()
  part_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  // isolamento entre oficinas: toda consulta filtra por aqui também
  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @Column({ type: 'varchar', length: 150 })
  description: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  code: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  taken_quantity: number;

  /** null = a peça foi retirada mas ainda não foi acertada (quanto realmente usou). */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  used_quantity: number | null;

  /** null = "preço não informado". */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  unit_price: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_object_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  photo_mime: string | null;

  @Column({ type: 'int', nullable: true })
  photo_size: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: Users | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

Create `backend/src/modules/internal/service-order-service.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { decimalTransformer } from './decimal.transformer';

/** Serviço / mão de obra executado na OS (para o escritório lançar na nota). */
@Entity('service_order_services')
export class ServiceOrderServices {
  @PrimaryGeneratedColumn()
  service_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  price: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: Users | null;

  @CreateDateColumn()
  created_at: Date;
}
```

Create `backend/src/modules/internal/service-order-participant.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';

/** Quem ajudou na OS (além do responsável), com o quê e quanto (%). */
@Entity('service_order_participants')
@Unique('UQ_participant_order_user', ['serviceOrder', 'user'])
export class ServiceOrderParticipants {
  @PrimaryGeneratedColumn()
  participant_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @ManyToOne(() => Users, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'int' })
  share_percent: number;

  @Column({ type: 'varchar', length: 150 })
  task: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 6: Colunas novas em `ServiceOrders` e `role` no `/users/me`**

Em `backend/src/modules/serviceOrder/serviceOrder.entity.ts`, logo depois do bloco `user: Users;` (antes de `@OneToMany(() => Sections`), inserir:

```ts
  /** Quem responde pela OS (comissão/equipe). null = quem abriu (`user`). */
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsible: Users | null;

  /** Anotações do escritório — NUNCA vão pra página pública nem pro laudo. */
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  internal_notes: string | null;

```

Em `backend/src/modules/users/dto/response-users.dto.ts`, depois de `email: string;`:

```ts
  @Expose()
  role: string;

```

- [ ] **Step 7: Gerar e conferir a migration**

Rode antes uma suíte e2e qualquer pra deixar o banco de teste com todas as migrations: `cd backend && npm run test:e2e -- smoke`. Depois:

Run: `cd backend && DB_NAME=oficinasync_test npm run migration:generate -- src/migrations/InternalOrderData`
Expected: cria `src/migrations/<ts>-InternalOrderData.ts`. **Conferir o `up()`**: só `CREATE TABLE service_order_parts/service_order_services/service_order_participants` (+ índices, FKs, `UQ_participant_order_user`) e `ALTER TABLE "service_orders" ADD "internal_notes" nvarchar(max)` + `ADD "responsible_user_id" int` + FK. **Não pode** ter DROP de nada existente. Se o generate falhar com "Enum is not defined", não é este caso (não há enum novo).

Depois: `DB_NAME=oficinasync_test npm run migration:generate -- src/migrations/Drift` deve dizer "No changes" **depois** de aplicar a migration (rode `npm run test:e2e -- smoke` de novo, que aplica; apague qualquer arquivo `Drift` criado por engano).

- [ ] **Step 8: Helpers de teste**

Em `backend/test/helpers/seed.ts` acrescentar no fim (e os imports `Role`, `JwtService`):

```ts
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/modules/users/role.enum';

export type Staff = { user: Users; email: string; token: string; role: Role };

/**
 * Funcionário ativo da oficina `tenant`, já com JWT. Assina o token direto (sem /auth/login)
 * porque o login tem limite de 5/min e as suítes precisam de vários perfis.
 */
export async function createStaff(
  app: INestApplication,
  tenant: Tenants,
  role: Role,
  label: string,
): Promise<Staff> {
  const email = `${label}-${randomUUID().slice(0, 8)}@teste.local`;
  const user = await app
    .get(UsersService)
    .createFromInvite(`${label} ${role}`, email, 'Teste@12345', tenant, role);
  const token = app
    .get(JwtService, { strict: false })
    .sign({ sub: user.user_id, scope: 'access' });
  return { user, email, token, role };
}
```

Em `backend/test/helpers/fixtures.ts` acrescentar no fim:

```ts
/** Abre uma OS (carro só com placa) como o dono do `token` — esse usuário vira o responsável. */
export async function openOrderAs(app: INestApplication, token: string) {
  const server = app.getHttpServer();
  const auth = { Authorization: `Bearer ${token}` };
  const plate = randomPlate();
  const car = await request(server).post('/cars').set(auth).send({ plate }).expect(201);
  const order = await request(server)
    .post('/service_orders')
    .set(auth)
    .send({ car_id: car.body.car_id, client_complaint: 'Barulho no motor' })
    .expect(201);
  return {
    orderId: order.body.service_order_id as number,
    carId: car.body.car_id as number,
    publicToken: order.body.public_token as string,
    plate,
  };
}
```

- [ ] **Step 9: Rodar tudo e commitar**

Run: `cd backend && npm test && npm run test:e2e && npm run build`
Expected: unit 33 (27 + 6), e2e todas verdes (a migration roda sozinha), build 0 erros.

```bash
git add backend/src/modules/internal backend/src/modules/serviceOrder/serviceOrder.entity.ts backend/src/modules/users/dto/response-users.dto.ts backend/src/migrations backend/test/helpers/seed.ts backend/test/helpers/fixtures.ts
git commit -m "feat: fundacao dos dados internos da OS (entidades, migration, permissoes por perfil, role no /users/me)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Módulo interno — contexto/permissão, leitura por perfil, anotações, responsável, time

**Files:**
- Create: `internal-context.service.ts`, `team.service.ts` (parte 1: anotações, responsável, listagem), `internal.controller.ts`, `internal.module.ts`, `dto/notes.dto.ts`, `dto/responsible.dto.ts`
- Modify: `backend/src/app.module.ts` (importar `InternalModule`)
- Test: `backend/test/internal-access.e2e-spec.ts`

**Interfaces:**
- Consumes: `permissionsFor`, `Viewer`, `Permissions` (Task 1); `createStaff`, `openOrderAs`, `createTenantWithOwner` (helpers).
- Produces:
  - `OrderContext = { order: ServiceOrders; user: Users; tenant: Tenants; responsible: Users; viewer: Viewer; done: boolean; can: Permissions }` e `InternalContextService.load(orderId, userId): Promise<OrderContext>` / `.require(ctx, key: keyof Permissions, message: string): void`.
  - `GET /service_orders/:id/internal` → `InternalData` (campos em §5 do spec): `{ service_order_id, status, viewer: {user_id, role, is_responsible}, responsible: {user_id, name}, notes: string|null, parts: [], services: [], participants: [], responsible_share_percent: number, my_share_percent: number|null, can: Permissions }` (nesta task `parts/services/participants` vêm `[]`; as tasks 3 e 5 preenchem).
  - `PUT /service_orders/:id/internal/notes` `{ notes: string }` → `{ notes: string | null }`.
  - `PATCH /service_orders/:id/responsible` `{ user_id: number }` → `{ responsible: {user_id, name} }`.
  - `GET /users/team` → `{ user_id, name, role }[]` (usuários ativos da oficina).

- [ ] **Step 1: Escrever o e2e (vermelho)**

Create `backend/test/internal-access.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';

describe('dados internos: acesso por perfil, anotações, responsável e time', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // abre a OS → responsável
  let mech2: Staff; // mecânico comum
  let recep: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ia');
    b = await createTenantWithOwner(app, 'ib');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 'm1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 'm2');
    recep = await createStaff(app, a.tenant, Role.RECEPTIONIST, 'rc');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('o responsável (quem abriu) lê com permissões de edição e vê as anotações', async () => {
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech1.token)).expect(200);

    expect(res.body.viewer).toEqual({ user_id: mech1.user.user_id, role: 'mechanic', is_responsible: true });
    expect(res.body.responsible.user_id).toBe(mech1.user.user_id);
    expect(res.body.can.edit_team).toBe(true);
    expect(res.body.notes).toBeNull();
    expect(res.body.responsible_share_percent).toBe(100);
  });

  it('mecânico comum lê sem anotações e sem poder de equipe', async () => {
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);

    expect(res.body.can).toMatchObject({ edit_items: true, edit_team: false, edit_notes: false, see_sheet: false });
    expect(res.body.notes).toBeNull();
  });

  it('dono e recepção leem com tudo liberado', async () => {
    for (const t of [a.token, recep.token]) {
      const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(t)).expect(200);
      expect(res.body.can).toMatchObject({ edit_team: true, edit_notes: true, change_responsible: true, see_sheet: true });
    }
  });

  it('anotações: escritório e responsável gravam; mecânico comum recebe 403', async () => {
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(mech1.token)).send({ notes: 'Cliente paga no PIX' }).expect(200);
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(mech2.token)).send({ notes: 'hack' }).expect(403);

    const office = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(recep.token)).expect(200);
    expect(office.body.notes).toBe('Cliente paga no PIX');

    const common = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);
    expect(common.body.notes).toBeNull();
  });

  it('anotação vazia limpa o campo; texto longo demais é recusado', async () => {
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(a.token)).send({ notes: '   ' }).expect(200);
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(a.token)).expect(200);
    expect(res.body.notes).toBeNull();
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(a.token)).send({ notes: 'x'.repeat(4001) }).expect(400);
  });

  it('só o escritório troca o responsável', async () => {
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(mech1.token)).send({ user_id: mech2.user.user_id }).expect(403);
    const res = await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(recep.token)).send({ user_id: mech2.user.user_id }).expect(200);
    expect(res.body.responsible.user_id).toBe(mech2.user.user_id);

    const after = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);
    expect(after.body.viewer.is_responsible).toBe(true);
    // volta ao estado original pros próximos testes
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
  });

  it('responsável de outra oficina é recusado', async () => {
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: b.user.user_id }).expect(400);
  });

  it('isolamento: oficina B não lê nem altera a OS da A', async () => {
    await request(server()).get(`/service_orders/${orderId}/internal`).set(as(b.token)).expect(403);
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(b.token)).send({ notes: 'x' }).expect(403);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(b.token)).send({ user_id: b.user.user_id }).expect(403);
  });

  it('OS inexistente → 404; sem token → 401', async () => {
    await request(server()).get('/service_orders/99999999/internal').set(as(a.token)).expect(404);
    await request(server()).get(`/service_orders/${orderId}/internal`).expect(401);
  });

  it('GET /users/team lista os funcionários ativos da própria oficina (sem e-mail, sem outra oficina)', async () => {
    const res = await request(server()).get('/users/team').set(as(mech2.token)).expect(200);
    const ids = res.body.map((u: { user_id: number }) => u.user_id);
    expect(ids).toEqual(expect.arrayContaining([a.user.user_id, mech1.user.user_id, mech2.user.user_id, recep.user.user_id]));
    expect(ids).not.toContain(b.user.user_id);
    expect(res.body[0]).not.toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('role');
  });

  it('GET /users/me devolve o cargo', async () => {
    const res = await request(server()).get('/users/me').set(as(recep.token)).expect(200);
    expect(res.body.role).toBe('receptionist');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && npm run test:e2e -- internal-access`
Expected: FAIL — `404` nas rotas novas (e `role` já passa).

- [ ] **Step 3: DTOs**

Create `backend/src/modules/internal/dto/notes.dto.ts`:

```ts
import { IsString, MaxLength } from 'class-validator';

export class SetNotesDto {
  @IsString()
  @MaxLength(4000)
  notes: string;
}
```

Create `backend/src/modules/internal/dto/responsible.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class SetResponsibleDto {
  @Type(() => Number)
  @IsInt()
  user_id: number;
}
```

- [ ] **Step 4: Contexto/permissão**

Create `backend/src/modules/internal/internal-context.service.ts`:

```ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Status } from '../serviceOrder/status.enum';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { Permissions, Viewer, permissionsFor } from './internal-access';

export type OrderContext = {
  order: ServiceOrders;
  user: Users;
  tenant: Tenants;
  responsible: Users;
  viewer: Viewer;
  done: boolean;
  can: Permissions;
};

/** Resolve "quem é quem nesta OS" e o que cada um pode — ponto único de checagem de oficina e perfil. */
@Injectable()
export class InternalContextService {
  constructor(
    @InjectRepository(ServiceOrders)
    private readonly orders: Repository<ServiceOrders>,
    private readonly usersService: UsersService,
  ) {}

  async load(orderId: number, userId: number): Promise<OrderContext> {
    const user = await this.usersService.findById(userId);
    const order = await this.orders.findOne({
      where: { service_order_id: orderId },
      relations: { tenant: true, user: true, responsible: true },
    });

    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada!');
    }
    if (!user.tenant || order.tenant.id !== user.tenant.id) {
      throw new ForbiddenException('Essa ordem de serviço não pertence à sua oficina.');
    }

    const responsible = order.responsible ?? order.user;
    const viewer: Viewer = {
      userId: user.user_id,
      role: user.role,
      isResponsible: user.user_id === responsible.user_id,
    };
    const done = order.status === Status.DONE;

    return {
      order,
      user,
      tenant: user.tenant,
      responsible,
      viewer,
      done,
      can: permissionsFor(viewer, done),
    };
  }

  require(ctx: OrderContext, key: keyof Permissions, message: string): void {
    if (!ctx.can[key]) {
      throw new ForbiddenException(message);
    }
  }
}
```

- [ ] **Step 5: `TeamService` (parte 1)**

Create `backend/src/modules/internal/team.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Users } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { InternalContextService } from './internal-context.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(ServiceOrders)
    private readonly orders: Repository<ServiceOrders>,
    @InjectRepository(Users)
    private readonly users: Repository<Users>,
    private readonly usersService: UsersService,
    private readonly context: InternalContextService,
  ) {}

  /** Funcionários ativos da oficina do usuário (sem e-mail). */
  async listTeam(userId: number) {
    const me = await this.usersService.findById(userId);
    if (!me.tenant) return [];

    const staff = await this.users.find({
      where: { tenant: { id: me.tenant.id }, is_active: true },
      order: { name: 'ASC' },
    });

    return staff.map((u) => ({ user_id: u.user_id, name: u.name, role: u.role }));
  }

  async setNotes(orderId: number, userId: number, notes: string) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'edit_notes', 'Só o escritório e o responsável editam as anotações internas.');

    ctx.order.internal_notes = notes.trim() === '' ? null : notes.trim();
    await this.orders.save(ctx.order);

    return { notes: ctx.order.internal_notes };
  }

  async setResponsible(orderId: number, userId: number, newUserId: number) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'change_responsible', 'Só o escritório troca o responsável da OS.');

    const next = await this.users.findOne({
      where: { user_id: newUserId, tenant: { id: ctx.tenant.id }, is_active: true },
    });
    if (!next) {
      throw new BadRequestException('Esse funcionário não existe ou não pertence à sua oficina.');
    }

    ctx.order.responsible = next;
    await this.orders.save(ctx.order);

    return { responsible: { user_id: next.user_id, name: next.name } };
  }
}
```

(Task 5 acrescenta a esse arquivo a remoção do novo responsável da lista de ajudantes e `setParticipants`.)

- [ ] **Step 6: Controller, módulo e registro**

Create `backend/src/modules/internal/internal.controller.ts`:

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { SetNotesDto } from './dto/notes.dto';
import { SetResponsibleDto } from './dto/responsible.dto';
import { InternalContextService } from './internal-context.service';
import { responsibleShare } from './internal-access';
import { TeamService } from './team.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class InternalController {
  constructor(
    private readonly context: InternalContextService,
    private readonly team: TeamService,
  ) {}

  @Get('users/team')
  listTeam(@Req() req: any) {
    return this.team.listTeam(req.user.sub);
  }

  @Get('service_orders/:id/internal')
  async getInternal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const ctx = await this.context.load(id, req.user.sub);

    return {
      service_order_id: ctx.order.service_order_id,
      status: ctx.order.status,
      viewer: {
        user_id: ctx.viewer.userId,
        role: ctx.viewer.role,
        is_responsible: ctx.viewer.isResponsible,
      },
      responsible: { user_id: ctx.responsible.user_id, name: ctx.responsible.name },
      notes: ctx.can.edit_notes ? ctx.order.internal_notes : null,
      parts: [],
      services: [],
      participants: [],
      responsible_share_percent: responsibleShare([]),
      my_share_percent: null,
      can: ctx.can,
    };
  }

  @Put('service_orders/:id/internal/notes')
  @HttpCode(HttpStatus.OK)
  setNotes(@Param('id', ParseIntPipe) id: number, @Body() dto: SetNotesDto, @Req() req: any) {
    return this.team.setNotes(id, req.user.sub, dto.notes);
  }

  @Patch('service_orders/:id/responsible')
  @HttpCode(HttpStatus.OK)
  setResponsible(@Param('id', ParseIntPipe) id: number, @Body() dto: SetResponsibleDto, @Req() req: any) {
    return this.team.setResponsible(id, req.user.sub, dto.user_id);
  }
}
```

Create `backend/src/modules/internal/internal.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../AuthModule/authModule.module';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { Users } from '../users/users.entity';
import { UsersModule } from '../users/users.module';
import { InternalContextService } from './internal-context.service';
import { InternalController } from './internal.controller';
import { ServiceOrderParticipants } from './service-order-participant.entity';
import { ServiceOrderParts } from './service-order-part.entity';
import { ServiceOrderServices } from './service-order-service.entity';
import { TeamService } from './team.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrders,
      ServiceOrderParts,
      ServiceOrderServices,
      ServiceOrderParticipants,
      Users,
    ]),
    UsersModule,
    AuthModule,
    ServiceOrdersModule,
  ],
  controllers: [InternalController],
  providers: [InternalContextService, TeamService],
  exports: [InternalContextService],
})
export class InternalModule {}
```

Em `backend/src/app.module.ts`: `import { InternalModule } from './modules/internal/internal.module';` e adicionar `InternalModule,` na lista `imports` (depois de `ObdModule,`).

- [ ] **Step 7: Rodar e ver passar**

Run: `cd backend && npm run build 2>&1 | grep -c error` (esperado 0), depois `npm run test:e2e -- internal-access`
Expected: 10 passed. Se `GET /users/team` colidir com alguma rota, confira a ordem dos controllers.

- [ ] **Step 8: Suíte inteira e commit**

Run: `cd backend && npm test && npm run test:e2e`
Expected: tudo verde.

```bash
git add backend/src/modules/internal backend/src/app.module.ts backend/test/internal-access.e2e-spec.ts
git commit -m "feat: area interna da OS — leitura por perfil, anotacoes, troca de responsavel e lista do time

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Peças e serviços (CRUD, acerto, regras de OS finalizada)

**Files:**
- Create: `backend/src/modules/internal/internal-math.ts` (+ `internal-math.spec.ts`), `parts.service.ts`, `dto/part.dto.ts`, `dto/service-item.dto.ts`
- Modify: `internal.controller.ts` (rotas + `GET internal` passa a listar), `internal.module.ts` (providers)
- Test: `backend/test/internal-parts.e2e-spec.ts`

**Interfaces:**
- Consumes: `OrderContext`, `InternalContextService` (Task 2).
- Produces:
  - `lineTotal(part: {used_quantity: number|null; unit_price: number|null}): number | null` e `itemTotals(parts, services): { parts_total: number; services_total: number; grand_total: number; unpriced_items: number }` em `internal-math.ts`.
  - `PartView = { part_id; description; code: string|null; taken_quantity: number; used_quantity: number|null; unit_price: number|null; photo_url: string|null; created_by_name: string|null }`, `ServiceView = { service_id; description; price: number|null }`.
  - `PartsService`: `listParts(ctx)`, `createPart(ctx, dto)`, `updatePart(ctx, partId, dto)`, `deletePart(ctx, partId)`, `listServices(ctx)`, `createService`, `updateService`, `deleteService`.
  - Rotas: `POST /service_orders/:id/parts`, `PATCH|DELETE /service_orders/:id/parts/:partId`, `POST /service_orders/:id/services`, `PATCH|DELETE /service_orders/:id/services/:serviceId`. `GET internal` devolve `parts`/`services` preenchidos.

- [ ] **Step 1: Testes da matemática (vermelho)**

Create `backend/src/modules/internal/internal-math.spec.ts`:

```ts
import { itemTotals, lineTotal } from './internal-math';

describe('lineTotal', () => {
  it('quantidade usada × preço unitário, com 2 casas', () => {
    expect(lineTotal({ used_quantity: 2, unit_price: 25.5 })).toBe(51);
    expect(lineTotal({ used_quantity: 3, unit_price: 0.1 })).toBe(0.3);
  });

  it('sem preço ou sem acerto → null (nunca 0)', () => {
    expect(lineTotal({ used_quantity: 2, unit_price: null })).toBeNull();
    expect(lineTotal({ used_quantity: null, unit_price: 10 })).toBeNull();
  });
});

describe('itemTotals', () => {
  it('soma só peças acertadas com preço e serviços com valor; conta o que está sem preço', () => {
    const totals = itemTotals(
      [
        { used_quantity: 2, unit_price: 25 },
        { used_quantity: 1, unit_price: null },
        { used_quantity: null, unit_price: 99 }, // sem acerto: fora da conta e fora do "sem preço"
      ],
      [{ price: 80 }, { price: null }],
    );
    expect(totals).toEqual({ parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 2 });
  });

  it('tudo vazio → zeros', () => {
    expect(itemTotals([], [])).toEqual({ parts_total: 0, services_total: 0, grand_total: 0, unpriced_items: 0 });
  });
});
```

Run: `cd backend && npm test -- internal-math` → Expected: FAIL (`Cannot find module`).

- [ ] **Step 2: Implementar `internal-math.ts`**

Create `backend/src/modules/internal/internal-math.ts`:

```ts
const round2 = (n: number) => Math.round(n * 100) / 100;

type PartLike = { used_quantity: number | null; unit_price: number | null };
type ServiceLike = { price: number | null };

/** Total da linha da peça; null quando não dá pra calcular (sem acerto ou sem preço). */
export function lineTotal(part: PartLike): number | null {
  if (part.used_quantity === null || part.unit_price === null) return null;
  return round2(part.used_quantity * part.unit_price);
}

export function itemTotals(parts: PartLike[], services: ServiceLike[]) {
  const settled = parts.filter((p) => p.used_quantity !== null);
  const partsTotal = round2(
    settled.reduce((acc, p) => acc + (lineTotal(p) ?? 0), 0),
  );
  const servicesTotal = round2(
    services.reduce((acc, s) => acc + (s.price ?? 0), 0),
  );
  const unpriced =
    settled.filter((p) => p.unit_price === null).length +
    services.filter((s) => s.price === null).length;

  return {
    parts_total: partsTotal,
    services_total: servicesTotal,
    grand_total: round2(partsTotal + servicesTotal),
    unpriced_items: unpriced,
  };
}
```

Run: `cd backend && npm test -- internal-math` → Expected: PASS.

- [ ] **Step 3: E2E de peças e serviços (vermelho)**

Create `backend/test/internal-parts.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { createWorld, openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';

describe('peças e serviços da OS', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff;
  let mech2: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const internal = (t: string) => request(server()).get(`/service_orders/${orderId}/internal`).set(as(t));
  const addPart = (t: string, body: object) => request(server()).post(`/service_orders/${orderId}/parts`).set(as(t)).send(body);

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'pa');
    b = await createTenantWithOwner(app, 'pb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 'p1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 'p2');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('qualquer mecânico registra uma peça retirada (sem acerto, sem preço) e ela aparece na leitura', async () => {
    const res = await addPart(mech2.token, { description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4 }).expect(201);
    expect(res.body).toMatchObject({ description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4, used_quantity: null, unit_price: null, photo_url: null });

    const read = await internal(mech1.token).expect(200);
    expect(read.body.parts.map((p: { description: string }) => p.description)).toContain('Vela NGK');
    expect(read.body.parts[0].created_by_name).toContain('p2');
  });

  it('acerto: informa o que realmente usou e o preço; usada maior que retirada é 400', async () => {
    const part = (await addPart(mech1.token, { description: 'Filtro de óleo', taken_quantity: 2 }).expect(201)).body;

    await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ used_quantity: 3 }).expect(400);

    const ok = await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ used_quantity: 1, unit_price: 32.5 }).expect(200);
    expect(ok.body).toMatchObject({ used_quantity: 1, unit_price: 32.5 });
  });

  it('é possível limpar o preço (voltar a "não informado") e o acerto com null', async () => {
    const part = (await addPart(mech1.token, { description: 'Correia', taken_quantity: 1, used_quantity: 1, unit_price: 80 }).expect(201)).body;
    const res = await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ unit_price: null, used_quantity: null }).expect(200);
    expect(res.body.unit_price).toBeNull();
    expect(res.body.used_quantity).toBeNull();
  });

  it('valida: descrição vazia, quantidade negativa, 3 casas decimais, preço negativo', async () => {
    await addPart(mech1.token, { description: '', taken_quantity: 1 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: -1 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: 1.234 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: 1, unit_price: -5 }).expect(400);
    await addPart(mech1.token, { taken_quantity: 1 }).expect(400);
  });

  it('campos fora da whitelist (tenant, part_id) são ignorados', async () => {
    const res = await addPart(mech1.token, { description: 'Whitelist', taken_quantity: 1, part_id: 1, tenant: { id: b.tenant.id } }).expect(201);
    expect(res.body.part_id).not.toBe(1);
  });

  it('descrição com HTML é guardada como texto (a ficha escapa na tela)', async () => {
    const res = await addPart(mech1.token, { description: '<script>alert(1)</script>', taken_quantity: 1 }).expect(201);
    expect(res.body.description).toBe('<script>alert(1)</script>');
  });

  it('apagar peça; peça de outra OS/oficina é 404/403', async () => {
    const part = (await addPart(mech1.token, { description: 'Apagar', taken_quantity: 1 }).expect(201)).body;
    await request(server()).delete(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech2.token)).expect(200);
    await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ taken_quantity: 2 }).expect(404);

    const other = (await addPart(mech1.token, { description: 'Da A', taken_quantity: 1 }).expect(201)).body;
    await request(server()).patch(`/service_orders/${orderId}/parts/${other.part_id}`).set(as(b.token)).send({ taken_quantity: 9 }).expect(403);
  });

  it('serviços: criar, valor opcional, editar e apagar', async () => {
    const created = await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'Troca da bomba de combustível', price: 150 }).expect(201);
    expect(created.body).toMatchObject({ description: 'Troca da bomba de combustível', price: 150 });

    const noPrice = await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'Diagnóstico elétrico' }).expect(201);
    expect(noPrice.body.price).toBeNull();

    await request(server()).patch(`/service_orders/${orderId}/services/${created.body.service_id}`).set(as(mech1.token)).send({ price: 180 }).expect(200);
    await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'x', price: -1 }).expect(400);

    const read = await internal(a.token).expect(200);
    expect(read.body.services.find((s: { service_id: number }) => s.service_id === created.body.service_id).price).toBe(180);

    await request(server()).delete(`/service_orders/${orderId}/services/${noPrice.body.service_id}`).set(as(mech1.token)).expect(200);
  });

  it('OS finalizada: mecânico não edita peças/serviços (403); escritório edita', async () => {
    const w = await createWorld(app, a.token); // OS completa, aberta pelo dono
    const add = (t: string) => request(server()).post(`/service_orders/${w.orderId}/parts`).set(as(t)).send({ description: 'Pós-fim', taken_quantity: 1 });

    await add(mech1.token).expect(201); // ainda aberta
    await request(server()).patch(`/service_orders/${w.orderId}/finish`).set(as(a.token)).send({ conclusion: 'ok', final_verdict: 'resolved' }).expect(200);

    await add(mech1.token).expect(403);
    await add(a.token).expect(201);
  });
});
```

Run: `cd backend && npm run test:e2e -- internal-parts` → Expected: FAIL (404 nas rotas).

- [ ] **Step 4: DTOs**

Create `backend/src/modules/internal/dto/part.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const QTY = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false } as const;

export class CreatePartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  taken_quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  used_quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(10000000)
  unit_price?: number;
}

/** No PATCH, `null` em code/used_quantity/unit_price LIMPA o campo (@IsOptional deixa null passar). */
export class UpdatePartDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  taken_quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  used_quantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(10000000)
  unit_price?: number | null;
}
```

Create `backend/src/modules/internal/dto/service-item.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateServiceItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  price?: number;
}

export class UpdateServiceItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description?: string;

  /** null limpa o valor ("não informado"). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  price?: number | null;
}
```

Atenção: `@Type(() => Number)` transforma `null` em `0`? O `class-transformer` mantém `null` como `null` (só converte valores não-nulos). Confirme no teste "limpar o preço" (Step 3) — se virar 0, troque por `@Transform(({ value }) => (value === null ? null : Number(value)))`.

- [ ] **Step 5: `PartsService`**

Create `backend/src/modules/internal/parts.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { CreatePartDto, UpdatePartDto } from './dto/part.dto';
import { CreateServiceItemDto, UpdateServiceItemDto } from './dto/service-item.dto';
import { InternalContextService, OrderContext } from './internal-context.service';
import { ServiceOrderParts } from './service-order-part.entity';
import { ServiceOrderServices } from './service-order-service.entity';

export type PartView = {
  part_id: number;
  description: string;
  code: string | null;
  taken_quantity: number;
  used_quantity: number | null;
  unit_price: number | null;
  photo_url: string | null;
  created_by_name: string | null;
};

export type ServiceView = { service_id: number; description: string; price: number | null };

const EDIT_MSG = 'Depois que a OS é finalizada, só o escritório altera peças e serviços.';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(ServiceOrderParts)
    private readonly parts: Repository<ServiceOrderParts>,
    @InjectRepository(ServiceOrderServices)
    private readonly services: Repository<ServiceOrderServices>,
    private readonly minio: MinioService,
    private readonly context: InternalContextService,
  ) {}

  async toPartView(part: ServiceOrderParts): Promise<PartView> {
    return {
      part_id: part.part_id,
      description: part.description,
      code: part.code,
      taken_quantity: part.taken_quantity,
      used_quantity: part.used_quantity,
      unit_price: part.unit_price,
      photo_url: part.photo_object_name
        ? await this.minio.getPresignedUrl(part.photo_object_name)
        : null,
      created_by_name: part.createdBy?.name ?? null,
    };
  }

  async listParts(ctx: OrderContext): Promise<PartView[]> {
    const rows = await this.parts.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      relations: { createdBy: true },
      order: { part_id: 'ASC' },
    });
    return Promise.all(rows.map((p) => this.toPartView(p)));
  }

  async findPart(ctx: OrderContext, partId: number): Promise<ServiceOrderParts> {
    const part = await this.parts.findOne({
      where: {
        part_id: partId,
        serviceOrder: { service_order_id: ctx.order.service_order_id },
        tenant: { id: ctx.tenant.id },
      },
      relations: { createdBy: true },
    });
    if (!part) throw new NotFoundException('Peça não encontrada nesta OS.');
    return part;
  }

  private assertUsedWithinTaken(taken: number, used: number | null) {
    if (used !== null && used > taken) {
      throw new BadRequestException('A quantidade usada não pode ser maior que a retirada.');
    }
  }

  async createPart(ctx: OrderContext, dto: CreatePartDto): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    this.assertUsedWithinTaken(dto.taken_quantity, dto.used_quantity ?? null);

    const saved = await this.parts.save(
      this.parts.create({
        description: dto.description.trim(),
        code: dto.code?.trim() || null,
        taken_quantity: dto.taken_quantity,
        used_quantity: dto.used_quantity ?? null,
        unit_price: dto.unit_price ?? null,
        photo_object_name: null,
        photo_mime: null,
        photo_size: null,
        serviceOrder: ctx.order,
        tenant: ctx.tenant,
        createdBy: ctx.user,
      }),
    );
    return this.toPartView(saved);
  }

  async updatePart(ctx: OrderContext, partId: number, dto: UpdatePartDto): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const part = await this.findPart(ctx, partId);

    if (dto.description != null) part.description = dto.description.trim();
    if (dto.taken_quantity != null) part.taken_quantity = dto.taken_quantity;
    // estes três aceitam null = limpar
    if (dto.code !== undefined) part.code = dto.code?.trim() || null;
    if (dto.used_quantity !== undefined) part.used_quantity = dto.used_quantity;
    if (dto.unit_price !== undefined) part.unit_price = dto.unit_price;

    this.assertUsedWithinTaken(part.taken_quantity, part.used_quantity);
    return this.toPartView(await this.parts.save(part));
  }

  async deletePart(ctx: OrderContext, partId: number): Promise<{ deleted: true }> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const part = await this.findPart(ctx, partId);
    await this.parts.remove(part);
    return { deleted: true };
  }

  // ---- serviços / mão de obra
  toServiceView(s: ServiceOrderServices): ServiceView {
    return { service_id: s.service_id, description: s.description, price: s.price };
  }

  async listServices(ctx: OrderContext): Promise<ServiceView[]> {
    const rows = await this.services.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      order: { service_id: 'ASC' },
    });
    return rows.map((s) => this.toServiceView(s));
  }

  private async findService(ctx: OrderContext, serviceId: number) {
    const row = await this.services.findOne({
      where: {
        service_id: serviceId,
        serviceOrder: { service_order_id: ctx.order.service_order_id },
        tenant: { id: ctx.tenant.id },
      },
    });
    if (!row) throw new NotFoundException('Serviço não encontrado nesta OS.');
    return row;
  }

  async createService(ctx: OrderContext, dto: CreateServiceItemDto): Promise<ServiceView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const saved = await this.services.save(
      this.services.create({
        description: dto.description.trim(),
        price: dto.price ?? null,
        serviceOrder: ctx.order,
        tenant: ctx.tenant,
        createdBy: ctx.user,
      }),
    );
    return this.toServiceView(saved);
  }

  async updateService(ctx: OrderContext, serviceId: number, dto: UpdateServiceItemDto): Promise<ServiceView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const row = await this.findService(ctx, serviceId);
    if (dto.description != null) row.description = dto.description.trim();
    if (dto.price !== undefined) row.price = dto.price;
    return this.toServiceView(await this.services.save(row));
  }

  async deleteService(ctx: OrderContext, serviceId: number): Promise<{ deleted: true }> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    await this.services.remove(await this.findService(ctx, serviceId));
    return { deleted: true };
  }
}
```

- [ ] **Step 6: Rotas e leitura preenchida**

Em `internal.controller.ts`: importar `Delete, Post`, os DTOs (`CreatePartDto`, `UpdatePartDto`, `CreateServiceItemDto`, `UpdateServiceItemDto`) e `PartsService`; injetar `private readonly partsService: PartsService` no construtor; no `getInternal` trocar `parts: [], services: [],` por:

```ts
      parts: await this.partsService.listParts(ctx),
      services: await this.partsService.listServices(ctx),
```

e acrescentar os handlers (antes do `}` final da classe):

```ts
  @Post('service_orders/:id/parts')
  async createPart(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePartDto, @Req() req: any) {
    return this.partsService.createPart(await this.context.load(id, req.user.sub), dto);
  }

  @Patch('service_orders/:id/parts/:partId')
  @HttpCode(HttpStatus.OK)
  async updatePart(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @Body() dto: UpdatePartDto,
    @Req() req: any,
  ) {
    return this.partsService.updatePart(await this.context.load(id, req.user.sub), partId, dto);
  }

  @Delete('service_orders/:id/parts/:partId')
  @HttpCode(HttpStatus.OK)
  async deletePart(@Param('id', ParseIntPipe) id: number, @Param('partId', ParseIntPipe) partId: number, @Req() req: any) {
    return this.partsService.deletePart(await this.context.load(id, req.user.sub), partId);
  }

  @Post('service_orders/:id/services')
  async createService(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateServiceItemDto, @Req() req: any) {
    return this.partsService.createService(await this.context.load(id, req.user.sub), dto);
  }

  @Patch('service_orders/:id/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  async updateService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body() dto: UpdateServiceItemDto,
    @Req() req: any,
  ) {
    return this.partsService.updateService(await this.context.load(id, req.user.sub), serviceId, dto);
  }

  @Delete('service_orders/:id/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  async deleteService(@Param('id', ParseIntPipe) id: number, @Param('serviceId', ParseIntPipe) serviceId: number, @Req() req: any) {
    return this.partsService.deleteService(await this.context.load(id, req.user.sub), serviceId);
  }
```

Em `internal.module.ts`: importar `MinioModule` (`../minio/minio.module`), adicionar em `imports` e adicionar `PartsService` em `providers`.

- [ ] **Step 7: Rodar e ver passar**

Run: `cd backend && npm run build 2>&1 | grep -c error; npm run test:e2e -- internal-parts`
Expected: build 0; 9 passed. Para o teste "OS finalizada": o mecânico `mech1` é de `a`; `createWorld(app, a.token)` abre a OS com o dono.

- [ ] **Step 8: Suíte inteira e commit**

Run: `cd backend && npm test && npm run test:e2e`
Expected: tudo verde.

```bash
git add backend/src/modules/internal backend/test/internal-parts.e2e-spec.ts
git commit -m "feat: pecas (retiradas x usadas, preco opcional) e servicos da OS, com regras de OS finalizada

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Foto da caixa da peça (upload interno, cota, remoção)

**Files:**
- Modify: `backend/src/modules/minio/minio.service.ts` (`upload(file, opts?)`, `removeObject`), `backend/src/modules/medias/media.service.ts` (`getTenantUsageBytes`), `parts.service.ts` (`uploadPhoto`, apagar foto ao apagar peça), `internal.controller.ts` (rota), `internal.module.ts` (`MediaModule`)
- Test: acrescentar em `backend/test/internal-parts.e2e-spec.ts`

**Interfaces:**
- Consumes: `PartsService.findPart/toPartView` (Task 3); `MediaService.getTenantUsageBytes(tenantId)`; `exceedsQuota` (`minio/upload-limits.ts`).
- Produces: `POST /service_orders/:id/parts/:partId/photo` (multipart `file`) → `PartView` com `photo_url`; `MinioService.upload(file, { onlyImages?: boolean })`, `MinioService.removeObject(objectName): Promise<void>`; o uso de armazenamento da oficina passa a incluir `photo_size` das peças.

- [ ] **Step 1: Testes (vermelho)** — acrescentar ao fim do `describe` de `internal-parts.e2e-spec.ts` (e os imports `pngOfSize` de `./helpers/fixtures`, `MediaService` de `../src/modules/medias/media.service`):

```ts
  describe('foto da caixa', () => {
    const photo = (t: string, partId: number, buffer: Buffer, name = 'caixa.png') =>
      request(server())
        .post(`/service_orders/${orderId}/parts/${partId}/photo`)
        .set(as(t))
        .attach('file', buffer, { filename: name, contentType: 'image/png' });

    it('anexa a foto, devolve URL assinada e a foto entra na cota da oficina', async () => {
      const part = (await addPart(mech1.token, { description: 'Caixa da bomba', taken_quantity: 1 }).expect(201)).body;
      const before = await app.get(MediaService).getTenantUsageBytes(a.tenant.id);

      const res = await photo(mech1.token, part.part_id, pngOfSize(50 * 1024)).expect(201);
      expect(res.body.photo_url).toMatch(/^https?:\/\//);

      const after = await app.get(MediaService).getTenantUsageBytes(a.tenant.id);
      expect(after - before).toBeGreaterThanOrEqual(50 * 1024);
    });

    it('arquivo que não é imagem é recusado (400)', async () => {
      const part = (await addPart(mech1.token, { description: 'Sem imagem', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, Buffer.from('isto não é uma foto'), 'x.txt').expect(400);
    });

    it('foto acima de 15 MB → 413', async () => {
      const part = (await addPart(mech1.token, { description: 'Foto gigante', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, pngOfSize(15 * 1024 * 1024 + 1024)).expect(413);
    });

    it('sem arquivo → 400; peça de outra oficina → 403', async () => {
      const part = (await addPart(mech1.token, { description: 'Sem arquivo', taken_quantity: 1 }).expect(201)).body;
      await request(server()).post(`/service_orders/${orderId}/parts/${part.part_id}/photo`).set(as(mech1.token)).expect(400);
      await photo(b.token, part.part_id, pngOfSize(1024)).expect(403);
    });

    it('trocar a foto mantém só a nova; apagar a peça não deixa erro', async () => {
      const part = (await addPart(mech1.token, { description: 'Troca de foto', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, pngOfSize(2048)).expect(201);
      await photo(mech1.token, part.part_id, pngOfSize(4096)).expect(201);
      await request(server()).delete(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).expect(200);
    });
  });
```

Run: `cd backend && npm run test:e2e -- internal-parts` → Expected: FAIL (404 na rota da foto).

- [ ] **Step 2: `MinioService` — só imagens e remoção**

Em `minio.service.ts`: trocar a assinatura `async upload(file: Express.Multer.File) {` por:

```ts
  async upload(file: Express.Multer.File, opts: { onlyImages?: boolean } = {}) {
```

e, logo depois do bloco que valida `allowedMimeTypes` (antes de `const sizeError`), inserir:

```ts
    if (opts.onlyImages && !detectedMimeType.startsWith('image/')) {
      throw new BadRequestException('Envie uma foto (JPG, PNG ou WebP).');
    }
```

e antes do `getObjectBuffer`, acrescentar:

```ts
  async removeObject(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }
```

- [ ] **Step 3: Cota inclui fotos das peças**

Em `media.service.ts`, trocar o `return Number(row?.total ?? 0);` de `getTenantUsageBytes` por:

```ts
    // fotos de caixa de peças (área interna) também gastam o espaço da oficina
    const partRows: Array<{ total: string | number }> =
      await this.mediaRepository.manager.query(
        `SELECT COALESCE(SUM(CAST(photo_size AS BIGINT)), 0) AS total
           FROM service_order_parts WHERE tenant_id = @0`,
        [tenantId],
      );

    return Number(row?.total ?? 0) + Number(partRows[0]?.total ?? 0);
```

- [ ] **Step 4: Upload no `PartsService`**

Em `parts.service.ts`: importar `ConfigService` (`@nestjs/config`), `PayloadTooLargeException`, `MediaService` (`../medias/media.service`) e `exceedsQuota` (`../minio/upload-limits`); injetar no construtor `private readonly mediaService: MediaService, private readonly config: ConfigService,`; e acrescentar:

```ts
  async uploadPhoto(ctx: OrderContext, partId: number, file: Express.Multer.File): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    if (!file) throw new BadRequestException('Foto não enviada.');
    const part = await this.findPart(ctx, partId);

    const quotaBytes = Number(this.config.get('TENANT_STORAGE_QUOTA_MB') ?? 2048) * 1024 * 1024;
    const used = await this.mediaService.getTenantUsageBytes(ctx.tenant.id);
    if (exceedsQuota(used, file.size, quotaBytes)) {
      throw new PayloadTooLargeException(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );
    }

    const uploaded = await this.minio.upload(file, { onlyImages: true });
    const previous = part.photo_object_name;

    part.photo_object_name = uploaded.object_name;
    part.photo_mime = uploaded.mime_type;
    part.photo_size = uploaded.size;
    const saved = await this.parts.save(part);

    if (previous) await this.minio.removeObject(previous).catch(() => undefined);
    return this.toPartView(saved);
  }
```

No `deletePart`, antes do `remove`: `const photo = part.photo_object_name;` e, depois do `remove`: `if (photo) await this.minio.removeObject(photo).catch(() => undefined);`.

- [ ] **Step 5: Rota e módulo**

Em `internal.controller.ts`: importar `UploadedFile, UseInterceptors` (`@nestjs/common`), `FileInterceptor` (`@nestjs/platform-express`), `HARD_UPLOAD_LIMIT_BYTES` (`../minio/upload-limits`) e `UploadConcurrencyInterceptor` (`../medias/upload-concurrency.interceptor`); acrescentar:

```ts
  @Post('service_orders/:id/parts/:partId/photo')
  @UseInterceptors(
    UploadConcurrencyInterceptor,
    FileInterceptor('file', { limits: { fileSize: HARD_UPLOAD_LIMIT_BYTES } }),
  )
  async uploadPartPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.partsService.uploadPhoto(await this.context.load(id, req.user.sub), partId, file);
  }
```

Em `internal.module.ts`: importar `MediaModule` (`../medias/media.module`) e adicionar em `imports`; `ConfigModule` é global.

- [ ] **Step 6: Rodar e ver passar; suíte inteira; commit**

Run: `cd backend && npm run build 2>&1 | grep -c error; npm run test:e2e -- internal-parts; npm test; npm run test:e2e`
Expected: build 0; `internal-parts` 14 passed; tudo verde (inclui `upload-limits`, que usa `getTenantUsageBytes`).

```bash
git add backend/src/modules/internal backend/src/modules/minio/minio.service.ts backend/src/modules/medias/media.service.ts backend/test/internal-parts.e2e-spec.ts
git commit -m "feat: foto da caixa da peca (interna, so imagem, entra na cota, remove a antiga)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Equipe da OS (porcentagens) e comissões

**Files:**
- Create: `dto/participants.dto.ts`, `commissions.controller.ts`, `dto/commissions-query.dto.ts`
- Modify: `internal-math.ts` (+ spec: `commissionTotals`), `team.service.ts` (`setParticipants`, `listParticipants`, `commissions`, ajuste em `setResponsible`), `internal.controller.ts` (rota + leitura filtrada), `internal.module.ts`
- Test: `backend/src/modules/internal/internal-math.spec.ts` (acrescentar), `backend/test/internal-team.e2e-spec.ts`

**Interfaces:**
- Consumes: `validateShares`, `responsibleShare` (Task 1); `OrderContext`/`require` (Task 2).
- Produces:
  - `PUT /service_orders/:id/participants` `{ participants: [{ user_id: number; share_percent: number; task: string }] }` → `{ participants: ParticipantView[]; responsible_share_percent: number }`; `ParticipantView = { user_id; name; share_percent; task }`.
  - `GET internal`: `participants` completo para escritório/responsável; **só a própria linha** para mecânico comum; `my_share_percent` = % do próprio usuário nesta OS (`100 − soma` se ele for o responsável).
  - `GET /commissions?from&to&user_id` → `{ from: string; to: string; people: [{ user_id; name; role; os_count; total_percent; orders: [{ service_order_id; plate; finished_at; share_percent; task: string|null; is_responsible: boolean }] }] }`.
  - Em `internal-math.ts`: `commissionTotals(orders: CommissionOrder[]): CommissionPerson[]` com `CommissionOrder = { service_order_id; plate; finished_at: Date; responsible_id: number; responsible_name: string; responsible_role: string; participants: { user_id; name; role: string; share_percent; task }[] }` e `CommissionPerson = { user_id; name; role; os_count; total_percent; orders: {...}[] }`.

- [ ] **Step 1: Teste da conta de comissão (vermelho)** — acrescentar ao fim de `internal-math.spec.ts` (e o import `commissionTotals`):

```ts
describe('commissionTotals', () => {
  const finished = new Date('2026-10-10T12:00:00Z');
  const orders = [
    {
      service_order_id: 1, plate: 'AAA1A11', finished_at: finished,
      responsible_id: 10, responsible_name: 'João', responsible_role: 'mechanic',
      participants: [{ user_id: 20, name: 'Pedro', role: 'mechanic', share_percent: 30, task: 'diagnóstico' }],
    },
    {
      service_order_id: 2, plate: 'BBB2B22', finished_at: finished,
      responsible_id: 20, responsible_name: 'Pedro', responsible_role: 'mechanic',
      participants: [],
    },
  ];

  it('o responsável fica com o que sobra e cada pessoa soma suas porcentagens', () => {
    const people = commissionTotals(orders);
    const joao = people.find((p) => p.user_id === 10)!;
    const pedro = people.find((p) => p.user_id === 20)!;

    expect(joao.total_percent).toBe(70);
    expect(joao.os_count).toBe(1);
    expect(pedro.total_percent).toBe(130); // 30% da OS 1 + 100% da OS 2
    expect(pedro.os_count).toBe(2);
    expect(pedro.orders.find((o) => o.service_order_id === 1)).toMatchObject({ share_percent: 30, task: 'diagnóstico', is_responsible: false });
    expect(pedro.orders.find((o) => o.service_order_id === 2)).toMatchObject({ share_percent: 100, task: null, is_responsible: true });
  });

  it('sem OS → lista vazia', () => {
    expect(commissionTotals([])).toEqual([]);
  });
});
```

Run: `cd backend && npm test -- internal-math` → FAIL (`commissionTotals` não existe).

- [ ] **Step 2: Implementar `commissionTotals`** — acrescentar ao fim de `internal-math.ts`:

```ts
import { responsibleShare } from './internal-access';

export type CommissionOrder = {
  service_order_id: number;
  plate: string;
  finished_at: Date;
  responsible_id: number;
  responsible_name: string;
  responsible_role: string;
  participants: { user_id: number; name: string; role: string; share_percent: number; task: string }[];
};

export type CommissionLine = {
  service_order_id: number;
  plate: string;
  finished_at: Date;
  share_percent: number;
  task: string | null;
  is_responsible: boolean;
};

export type CommissionPerson = {
  user_id: number;
  name: string;
  role: string;
  os_count: number;
  total_percent: number;
  orders: CommissionLine[];
};

export function commissionTotals(orders: CommissionOrder[]): CommissionPerson[] {
  const byUser = new Map<number, CommissionPerson>();
  const person = (id: number, name: string, role: string) => {
    let p = byUser.get(id);
    if (!p) {
      p = { user_id: id, name, role, os_count: 0, total_percent: 0, orders: [] };
      byUser.set(id, p);
    }
    return p;
  };
  const add = (p: CommissionPerson, line: CommissionLine) => {
    p.orders.push(line);
    p.os_count += 1;
    p.total_percent += line.share_percent;
  };

  for (const o of orders) {
    const base = { service_order_id: o.service_order_id, plate: o.plate, finished_at: o.finished_at };
    add(person(o.responsible_id, o.responsible_name, o.responsible_role), {
      ...base,
      share_percent: responsibleShare(o.participants.map((x) => x.share_percent)),
      task: null,
      is_responsible: true,
    });
    for (const x of o.participants) {
      add(person(x.user_id, x.name, x.role), { ...base, share_percent: x.share_percent, task: x.task, is_responsible: false });
    }
  }

  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
```

(o `import { responsibleShare }` vai para o topo do arquivo, junto das demais declarações.)

Run: `cd backend && npm test -- internal-math` → Expected: PASS.

- [ ] **Step 3: E2E da equipe e comissões (vermelho)**

Create `backend/test/internal-team.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { createWorld, openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';
import { UsersService } from '../src/modules/users/users.service';
import { DataSource } from 'typeorm';
import { Users } from '../src/modules/users/users.entity';

describe('equipe da OS (porcentagens) e comissões', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // responsável
  let mech2: Staff;
  let mech3: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const put = (t: string, participants: object[], id = orderId) =>
    request(server()).put(`/service_orders/${id}/participants`).set(as(t)).send({ participants });
  const internal = (t: string, id = orderId) => request(server()).get(`/service_orders/${id}/internal`).set(as(t));

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ta');
    b = await createTenantWithOwner(app, 'tb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 't1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 't2');
    mech3 = await createStaff(app, a.tenant, Role.MECHANIC, 't3');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('o responsável marca quem ajudou, com o quê e quanto; ele fica com o resto', async () => {
    const res = await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 30, task: 'diagnóstico' },
      { user_id: mech3.user.user_id, share_percent: 10, task: 'montagem' },
    ]).expect(200);

    expect(res.body.responsible_share_percent).toBe(60);
    expect(res.body.participants).toHaveLength(2);
  });

  it('o escritório lê todas as linhas; o responsável também', async () => {
    for (const t of [a.token, mech1.token]) {
      const read = await internal(t).expect(200);
      expect(read.body.participants).toHaveLength(2);
      expect(read.body.responsible_share_percent).toBe(60);
    }
  });

  it('mecânico comum recebe SÓ a própria linha (colega e total não vazam)', async () => {
    const read = await internal(mech2.token).expect(200);
    expect(read.body.participants).toEqual([
      { user_id: mech2.user.user_id, name: expect.any(String), share_percent: 30, task: 'diagnóstico' },
    ]);
    expect(read.body.my_share_percent).toBe(30);
    expect(read.body.responsible_share_percent).toBeNull();
    expect(JSON.stringify(read.body)).not.toContain('montagem');
  });

  it('mecânico comum não edita a equipe (403)', async () => {
    await put(mech2.token, [{ user_id: mech3.user.user_id, share_percent: 50, task: 'x' }]).expect(403);
  });

  it('substitui a lista inteira; lista vazia zera a equipe', async () => {
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 50, task: 'elétrica' }]).expect(200);
    expect((await internal(a.token).expect(200)).body.participants).toHaveLength(1);
    await put(mech1.token, []).expect(200);
    const read = await internal(a.token).expect(200);
    expect(read.body.participants).toEqual([]);
    expect(read.body.responsible_share_percent).toBe(100);
  });

  it('recusa soma acima de 99%, % fora de 1–99, duplicado, tarefa vazia e o próprio responsável', async () => {
    await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 60, task: 'a' },
      { user_id: mech3.user.user_id, share_percent: 40, task: 'b' },
    ]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 0, task: 'a' }]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 100, task: 'a' }]).expect(400);
    await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 10, task: 'a' },
      { user_id: mech2.user.user_id, share_percent: 10, task: 'b' },
    ]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 10, task: '' }]).expect(400);
    await put(mech1.token, [{ user_id: mech1.user.user_id, share_percent: 10, task: 'eu' }]).expect(400);
    expect((await internal(a.token).expect(200)).body.participants).toEqual([]); // nada foi gravado
  });

  it('recusa usuário de outra oficina e usuário inativo', async () => {
    await put(mech1.token, [{ user_id: b.user.user_id, share_percent: 10, task: 'x' }]).expect(400);

    const inactive = await createStaff(app, a.tenant, Role.MECHANIC, 'off');
    await app.get(DataSource).getRepository(Users).update(inactive.user.user_id, { is_active: false });
    await put(mech1.token, [{ user_id: inactive.user.user_id, share_percent: 10, task: 'x' }]).expect(400);
  });

  it('trocar o responsável para quem era ajudador tira a pessoa da lista de ajudantes', async () => {
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 20, task: 'a' }]).expect(200);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech2.user.user_id }).expect(200);

    const read = await internal(a.token).expect(200);
    expect(read.body.participants.map((p: { user_id: number }) => p.user_id)).not.toContain(mech2.user.user_id);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
  });

  it('isolamento: oficina B não grava equipe na OS da A', async () => {
    await put(b.token, [], orderId).expect(403);
  });

  it('OS finalizada: responsável não edita a equipe (403); escritório edita', async () => {
    const w = await createWorld(app, a.token);
    await request(server()).patch(`/service_orders/${w.orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 25, task: 'antes' }], w.orderId).expect(200);

    await request(server()).patch(`/service_orders/${w.orderId}/finish`).set(as(a.token)).send({ conclusion: 'ok', final_verdict: 'resolved' }).expect(200);

    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 40, task: 'depois' }], w.orderId).expect(403);
    await put(a.token, [{ user_id: mech2.user.user_id, share_percent: 40, task: 'ajuste do escritório' }], w.orderId).expect(200);
  });

  describe('GET /commissions', () => {
    const range = () => {
      const day = new Date().toISOString().slice(0, 10);
      return `from=${day}&to=${day}`;
    };

    it('escritório vê todos; conta só OS concluídas; responsável fica com o resto', async () => {
      const res = await request(server()).get(`/commissions?${range()}`).set(as(a.token)).expect(200);
      const byId = new Map<number, any>(res.body.people.map((p: { user_id: number }) => [p.user_id, p]));

      // OS do "pós-finalização": mech2 40%, mech1 (responsável) 60%
      expect(byId.get(mech2.user.user_id).total_percent).toBe(40);
      expect(byId.get(mech1.user.user_id).total_percent).toBe(60);
      expect(byId.get(mech1.user.user_id).orders[0].is_responsible).toBe(true);
      // a OS de teste do começo (ainda aberta) não conta
      expect(byId.get(mech1.user.user_id).os_count).toBe(1);
    });

    it('mecânico recebe só o próprio total, mesmo pedindo outro user_id', async () => {
      const res = await request(server()).get(`/commissions?${range()}&user_id=${mech1.user.user_id}`).set(as(mech2.token)).expect(200);
      expect(res.body.people).toHaveLength(1);
      expect(res.body.people[0].user_id).toBe(mech2.user.user_id);
    });

    it('filtro por funcionário (escritório) e período sem OS', async () => {
      const one = await request(server()).get(`/commissions?${range()}&user_id=${mech2.user.user_id}`).set(as(a.token)).expect(200);
      expect(one.body.people).toHaveLength(1);

      const none = await request(server()).get('/commissions?from=2020-01-01&to=2020-01-02').set(as(a.token)).expect(200);
      expect(none.body.people).toEqual([]);
    });

    it('isolamento: oficina B não vê a equipe da A; datas inválidas → 400', async () => {
      const res = await request(server()).get(`/commissions?${range()}`).set(as(b.token)).expect(200);
      expect(res.body.people).toEqual([]);
      await request(server()).get('/commissions?from=ontem').set(as(a.token)).expect(400);
    });
  });
});
```

(Remova os imports não usados `UsersService` se o lint reclamar.)

Run: `cd backend && npm run test:e2e -- internal-team` → FAIL (404).

- [ ] **Step 4: DTOs**

Create `backend/src/modules/internal/dto/participants.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ParticipantItemDto {
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  share_percent: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  task: string;
}

export class SetParticipantsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ParticipantItemDto)
  participants: ParticipantItemDto[];
}
```

Create `backend/src/modules/internal/dto/commissions-query.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CommissionsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;
}
```

- [ ] **Step 5: `TeamService` — equipe e comissões**

Em `team.service.ts` acrescentar imports (`In`, `DataSource` não — use repos), `ServiceOrderParticipants`, `Status`, `isOffice`/`responsibleShare`/`validateShares` de `./internal-access`, `commissionTotals` de `./internal-math`, `SetParticipantsDto`, e injetar `@InjectRepository(ServiceOrderParticipants) private readonly participants: Repository<ServiceOrderParticipants>`. Acrescentar os métodos:

```ts
  async listParticipants(ctx: OrderContext) {
    const rows = await this.participants.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      relations: { user: true },
      order: { participant_id: 'ASC' },
    });
    const all = rows.map((r) => ({
      user_id: r.user.user_id,
      name: r.user.name,
      share_percent: r.share_percent,
      task: r.task,
    }));

    const responsiblePct = responsibleShare(all.map((p) => p.share_percent));

    if (ctx.can.see_all_team) {
      return {
        participants: all,
        responsible_share_percent: responsiblePct as number | null,
        my_share_percent: ctx.viewer.isResponsible
          ? responsiblePct
          : (all.find((p) => p.user_id === ctx.viewer.userId)?.share_percent ?? null),
      };
    }

    // mecânico comum: só a própria linha — o resto não sai da API
    const mine = all.filter((p) => p.user_id === ctx.viewer.userId);
    return {
      participants: mine,
      responsible_share_percent: null as number | null,
      my_share_percent: mine[0]?.share_percent ?? null,
    };
  }

  async setParticipants(orderId: number, userId: number, dto: SetParticipantsDto) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'edit_team', 'Só o responsável (enquanto a OS está aberta) e o escritório editam a equipe.');

    const items = dto.participants;
    const ids = items.map((i) => i.user_id);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Cada funcionário só pode aparecer uma vez.');
    }
    if (ids.includes(ctx.responsible.user_id)) {
      throw new BadRequestException('O responsável não entra na lista de ajudantes — a parte dele é o que sobra.');
    }
    const sumError = validateShares(items.map((i) => i.share_percent));
    if (sumError) throw new BadRequestException(sumError);

    if (ids.length > 0) {
      const valid = await this.users.find({
        where: { user_id: In(ids), tenant: { id: ctx.tenant.id }, is_active: true },
      });
      if (valid.length !== ids.length) {
        throw new BadRequestException('Algum funcionário não existe, está inativo ou não pertence à sua oficina.');
      }
    }

    await this.participants.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ServiceOrderParticipants);
      await repo.delete({ serviceOrder: { service_order_id: ctx.order.service_order_id } });
      for (const item of items) {
        await repo.save(
          repo.create({
            serviceOrder: ctx.order,
            tenant: ctx.tenant,
            user: { user_id: item.user_id } as Users,
            share_percent: item.share_percent,
            task: item.task.trim(),
          }),
        );
      }
    });

    return this.listParticipants(ctx);
  }

  async commissions(userId: number, query: { from?: string; to?: string; user_id?: number }) {
    const me = await this.usersService.findById(userId);
    if (!me.tenant) return { from: '', to: '', people: [] };

    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = query.to ? new Date(query.to) : now;
    // 'to' inclui o dia inteiro
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const orders = await this.orders
      .createQueryBuilder('o')
      .innerJoin('o.tenant', 't')
      .innerJoinAndSelect('o.user', 'u')
      .leftJoinAndSelect('o.responsible', 'r')
      .innerJoinAndSelect('o.car', 'car')
      .where('t.id = :tenantId', { tenantId: me.tenant.id })
      .andWhere('o.status = :done', { done: Status.DONE })
      .andWhere('o.finished_at >= :from AND o.finished_at <= :to', { from, to: toEnd })
      .getMany();

    const rows = orders.length
      ? await this.participants.find({
          where: { serviceOrder: { service_order_id: In(orders.map((o) => o.service_order_id)) }, tenant: { id: me.tenant.id } },
          relations: { user: true, serviceOrder: true },
        })
      : [];

    let people = commissionTotals(
      orders.map((o) => {
        const resp = o.responsible ?? o.user;
        return {
          service_order_id: o.service_order_id,
          plate: o.car.plate,
          finished_at: o.finished_at as Date,
          responsible_id: resp.user_id,
          responsible_name: resp.name,
          responsible_role: resp.role,
          participants: rows
            .filter((r) => r.serviceOrder.service_order_id === o.service_order_id)
            .map((r) => ({ user_id: r.user.user_id, name: r.user.name, role: r.user.role, share_percent: r.share_percent, task: r.task })),
        };
      }),
    );

    // mecânico só enxerga a si mesmo; escritório pode filtrar por funcionário
    const onlyUser = isOffice(me.role) ? query.user_id : me.user_id;
    if (onlyUser !== undefined) people = people.filter((p) => p.user_id === onlyUser);

    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), people };
  }
```

(importar no topo: `In` de `typeorm`, `Status` de `../serviceOrder/status.enum`, `OrderContext` de `./internal-context.service`, `ServiceOrderParticipants`, `SetParticipantsDto`, `commissionTotals`, `isOffice`, `responsibleShare`, `validateShares`.)

Ajuste em `setResponsible` (Task 2): antes de `ctx.order.responsible = next;`, acrescentar a remoção do novo responsável da lista de ajudantes:

```ts
    await this.participants.delete({
      serviceOrder: { service_order_id: ctx.order.service_order_id },
      user: { user_id: next.user_id },
    });
```

- [ ] **Step 6: Rotas e leitura**

Em `internal.controller.ts`: importar `SetParticipantsDto`; no `getInternal`, trocar as linhas `participants: [], responsible_share_percent: responsibleShare([]), my_share_percent: null,` por:

```ts
      ...(await this.team.listParticipants(ctx)),
```

(e remover o import `responsibleShare` se ficar sem uso), e acrescentar o handler:

```ts
  @Put('service_orders/:id/participants')
  @HttpCode(HttpStatus.OK)
  setParticipants(@Param('id', ParseIntPipe) id: number, @Body() dto: SetParticipantsDto, @Req() req: any) {
    return this.team.setParticipants(id, req.user.sub, dto);
  }
```

Create `backend/src/modules/internal/commissions.controller.ts`:

```ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { CommissionsQueryDto } from './dto/commissions-query.dto';
import { TeamService } from './team.service';

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@Query() query: CommissionsQueryDto, @Req() req: any) {
    return this.team.commissions(req.user.sub, query);
  }
}
```

Em `internal.module.ts`: registrar `CommissionsController` em `controllers`.

- [ ] **Step 7: Rodar e ver passar**

Run: `cd backend && npm run build 2>&1 | grep -c error; npm run test:e2e -- internal-team; npm test`
Expected: build 0; `internal-team` 14 passed; unit verde. Se o teste de "OS finalizada" reclamar do `finish` (CPF/dados completos), `createWorld` já cria OS completa — confirme.

- [ ] **Step 8: Suíte inteira e commit**

Run: `cd backend && npm run test:e2e`
Expected: tudo verde.

```bash
git add backend/src/modules/internal backend/test/internal-team.e2e-spec.ts
git commit -m "feat: equipe da OS em porcentagem (so a propria linha pro mecanico) e tela de comissoes por periodo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ficha do escritório + garantia de não-vazamento

**Files:**
- Create: `backend/src/modules/internal/office-sheet.service.ts`, `backend/src/modules/internal/no-leak.spec.ts`
- Modify: `internal.controller.ts` (rota), `internal.module.ts` (provider)
- Test: `backend/test/internal-sheet.e2e-spec.ts`

**Interfaces:**
- Consumes: `PartsService.listParts/listServices`, `TeamService.listParticipants`, `lineTotal`/`itemTotals` (Tasks 3–5), `ServiceOrdersService.findEntityById`, `computeMissingData`/`MissingData` (`serviceOrder/missing-data.ts`).
- Produces: `GET /service_orders/:id/office-sheet` → `OfficeSheet`:

```ts
type OfficeSheet = {
  service_order_id: number; status: string; created_at: string; finished_at: string | null;
  complaint: string; mileage_in: number | null;
  client: { name: string; phone: string | null; cpf: string | null; address: string | null; email: string | null } | null;
  car: { plate: string; brand: string | null; model: string | null; year: number | null; color: string | null; chassis: string | null; fuel_type: string | null };
  missing_data: MissingData;
  work_done: { type: string; status: string; notes: string }[];
  parts: (PartView & { line_total: number | null })[];          // acertadas (used_quantity != null)
  pending_parts: PartView[];                                    // retiradas sem acerto
  services: ServiceView[];
  responsible: { user_id: number; name: string; share_percent: number };
  participants: { user_id: number; name: string; share_percent: number; task: string }[];
  internal_notes: string | null;
  totals: { parts_total: number; services_total: number; grand_total: number; unpriced_items: number };
};
```
  Acesso: `see_sheet` (escritório + responsável); mecânico comum → 403.

- [ ] **Step 1: Testes (vermelho)**

Create `backend/test/internal-sheet.e2e-spec.ts`:

```ts
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';

const SENTINEL = 'SEGREDO-INTERNO-7391';

describe('ficha do escritório e vazamento dos dados internos', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // responsável
  let mech2: Staff;
  let order: { orderId: number; publicToken: string; plate: string };

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const sheet = (t: string) => request(server()).get(`/service_orders/${order.orderId}/office-sheet`).set(as(t));

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'sa');
    b = await createTenantWithOwner(app, 'sb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 's1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 's2');
    order = await openOrderAs(app, mech1.token);

    const base = `/service_orders/${order.orderId}`;
    await request(server()).put(`${base}/internal/notes`).set(as(a.token)).send({ notes: `${SENTINEL} nota` }).expect(200);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: `${SENTINEL} peça`, code: 'COD-1', taken_quantity: 4, used_quantity: 2, unit_price: 25 }).expect(201);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: 'Peça sem acerto', taken_quantity: 6 }).expect(201);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: 'Peça sem preço', taken_quantity: 1, used_quantity: 1 }).expect(201);
    await request(server()).post(`${base}/services`).set(as(mech1.token)).send({ description: `${SENTINEL} serviço`, price: 80 }).expect(201);
    await request(server()).put(`${base}/participants`).set(as(mech1.token)).send({ participants: [{ user_id: mech2.user.user_id, share_percent: 30, task: `${SENTINEL} tarefa` }] }).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('escritório e responsável recebem a ficha completa; mecânico comum recebe 403', async () => {
    for (const t of [a.token, mech1.token]) {
      const res = await sheet(t).expect(200);
      expect(res.body.car.plate).toBe(order.plate);
      expect(res.body.complaint).toBe('Barulho no motor');
      expect(res.body.internal_notes).toContain(SENTINEL);
    }
    await sheet(mech2.token).expect(403);
  });

  it('separa peças acertadas das retiradas sem acerto e calcula os totais', async () => {
    const res = (await sheet(a.token).expect(200)).body;

    expect(res.parts.map((p: { description: string }) => p.description)).toEqual([`${SENTINEL} peça`, 'Peça sem preço']);
    expect(res.parts[0]).toMatchObject({ code: 'COD-1', used_quantity: 2, unit_price: 25, line_total: 50 });
    expect(res.parts[1].line_total).toBeNull();
    expect(res.pending_parts.map((p: { description: string }) => p.description)).toEqual(['Peça sem acerto']);
    expect(res.totals).toEqual({ parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 1 });
  });

  it('traz equipe com a parte do responsável e os dados que faltam do cliente/carro', async () => {
    const res = (await sheet(a.token).expect(200)).body;
    expect(res.responsible).toMatchObject({ user_id: mech1.user.user_id, share_percent: 70 });
    expect(res.participants).toEqual([{ user_id: mech2.user.user_id, name: expect.any(String), share_percent: 30, task: `${SENTINEL} tarefa` }]);
    expect(res.client).toBeNull();
    expect(res.missing_data.client.length).toBeGreaterThan(0);
    expect(res.services).toEqual([{ service_id: expect.any(Number), description: `${SENTINEL} serviço`, price: 80 }]);
  });

  it('isolamento: oficina B recebe 403', async () => {
    await sheet(b.token).expect(403);
  });

  it('NENHUM dado interno vaza na página pública do cliente', async () => {
    const res = await request(server()).get(`/service_orders/public/${order.publicToken}`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(res.body)).not.toContain('COD-1');
    expect(JSON.stringify(res.body)).not.toMatch(/internal_notes|share_percent|unit_price/);
  });

  it('NENHUM dado interno vaza em GET /service_orders/:id (visão do mecânico) nem na lista', async () => {
    const one = await request(server()).get(`/service_orders/${order.orderId}`).set(as(mech2.token)).expect(200);
    expect(JSON.stringify(one.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(one.body)).not.toMatch(/internal_notes|share_percent|unit_price/);

    const list = await request(server()).get('/service_orders/orders').set(as(a.token)).expect(200);
    expect(JSON.stringify(list.body)).not.toContain(SENTINEL);
  });
});
```

Create `backend/src/modules/internal/no-leak.spec.ts` (trava arquitetural: o laudo e a rota pública não conhecem a área interna):

```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('área interna não pode alimentar o cliente final', () => {
  const FORBIDDEN = /ServiceOrderParts|ServiceOrderServices|ServiceOrderParticipants|internal_notes|share_percent|modules\/internal|\.\.\/internal\//;

  it.each(['report/report.service.ts', 'report/report.template.ts', 'sections/section.service.ts'])(
    '%s não referencia dados internos',
    (file) => {
      expect(read(file)).not.toMatch(FORBIDDEN);
    },
  );

  it('findByPublicToken (rota pública) não referencia dados internos', () => {
    const src = read('serviceOrder/serviceOrder.service.ts');
    const start = src.indexOf('async findByPublicToken');
    const end = src.indexOf('async findAll', start);
    expect(src.slice(start, end)).not.toMatch(FORBIDDEN);
  });
});
```

Run: `cd backend && npm test -- no-leak` → PASS já (trava de proteção, nasce verde: ela é o guarda contra regressões futuras — ledger). Run: `npm run test:e2e -- internal-sheet` → FAIL (404 na ficha; os testes de vazamento já passam e continuam passando).

- [ ] **Step 2: `OfficeSheetService`**

Create `backend/src/modules/internal/office-sheet.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { computeMissingData } from '../serviceOrder/missing-data';
import { InternalContextService } from './internal-context.service';
import { itemTotals, lineTotal } from './internal-math';
import { PartsService } from './parts.service';
import { TeamService } from './team.service';

@Injectable()
export class OfficeSheetService {
  constructor(
    private readonly context: InternalContextService,
    private readonly partsService: PartsService,
    private readonly team: TeamService,
    private readonly serviceOrders: ServiceOrdersService,
  ) {}

  async build(orderId: number, userId: number) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'see_sheet', 'Só o escritório e o responsável veem a ficha da OS.');

    const full = await this.serviceOrders.findEntityById(orderId);
    const car = full.car;
    const client = car.client;

    const partViews = await this.partsService.listParts(ctx);
    const services = await this.partsService.listServices(ctx);
    const { participants, responsible_share_percent } = await this.team.listParticipants(ctx);

    const settled = partViews
      .filter((p) => p.used_quantity !== null)
      .map((p) => ({ ...p, line_total: lineTotal(p) }));

    return {
      service_order_id: full.service_order_id,
      status: full.status,
      created_at: full.created_at,
      finished_at: full.finished_at ?? null,
      complaint: full.client_complaint,
      mileage_in: full.mileage_in ?? car.mileage_in ?? null,
      client: client
        ? { name: client.name, phone: client.phone, cpf: client.cpf, address: client.address, email: client.email }
        : null,
      car: {
        plate: car.plate,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        chassis: car.chassis,
        fuel_type: car.fuel_type,
      },
      missing_data: computeMissingData(car, client),
      work_done: (full.sections ?? [])
        .filter((s) => s.notes && s.notes.trim() !== '')
        .map((s) => ({ type: s.type, status: s.status, notes: s.notes as string })),
      parts: settled,
      pending_parts: partViews.filter((p) => p.used_quantity === null),
      services,
      responsible: {
        user_id: ctx.responsible.user_id,
        name: ctx.responsible.name,
        share_percent: responsible_share_percent ?? 0,
      },
      participants,
      internal_notes: ctx.order.internal_notes,
      totals: itemTotals(partViews, services),
    };
  }
}
```

Atenção: o campo da queixa na entidade é `client_complaint` e `ServiceOrders.created_at`/`finished_at`/`mileage_in` existem (usados em `findById`); `Sections` tem `type`, `status`, `notes`. Se a compilação reclamar de nome, ajuste pelo que `serviceOrder.service.ts` já usa.

- [ ] **Step 3: Rota e módulo**

Em `internal.controller.ts`: importar `OfficeSheetService`, injetar `private readonly officeSheet: OfficeSheetService` e acrescentar:

```ts
  @Get('service_orders/:id/office-sheet')
  officeSheetOf(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.officeSheet.build(id, req.user.sub);
  }
```

Em `internal.module.ts`: adicionar `OfficeSheetService` em `providers`.

- [ ] **Step 4: Rodar e ver passar; suíte inteira; commit**

Run: `cd backend && npm run build 2>&1 | grep -c error; npm run test:e2e -- internal-sheet; npm test; npm run test:e2e`
Expected: build 0; `internal-sheet` 6 passed; tudo verde.

```bash
git add backend/src/modules/internal backend/test/internal-sheet.e2e-spec.ts
git commit -m "feat: ficha do escritorio (pecas, servicos, equipe, totais) + testes de nao-vazamento para o cliente final

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend base — tipos, formatação/cópia, `useMe`, página `/os/:id/escritorio` (peças, serviços, anotações) e estado do mecânico nos testes de tela

**Files:**
- Create: `frontend/oficinasync-web/src/lib/internalApi.ts`, `src/lib/me.ts`, `src/pages/OsOfficePage.tsx`, `src/components/internal/{PartsSection,PartSheet,ServicesSection,NotesSection}.tsx`, `ui-tests/unit/internalApi.test.ts`, `ui-tests/e2e/dados-internos.spec.ts`
- Modify: `frontend/oficinasync-web/src/App.tsx`, `src/pages/OsWorkPage.tsx`, `backend/test/helpers/seed.ts` (`createStaffRecords`), `backend/test/ui-seed.ts`, `ui-tests/e2e/global-setup.ts`

**Interfaces:**
- Consumes: rotas das Tasks 2–6; `apiFetch`, `compressImage` (`@/lib/imageCompression`), `useDarkTheme`, `Sheet*`, `Button`, `FieldShell`.
- Produces (`internalApi.ts`): tipos `Perm`, `PartView`, `ServiceView`, `ParticipantView`, `InternalData`, `TeamMember`, `OfficeSheet`; funções `formatMoney(n: number | null): string` ("R$ 1.234,50" ou "preço não informado"), `formatQty(n: number): string`, `partLineText(p): string`, `sheetToText(sheet: OfficeSheet): string`. `me.ts`: `useMe(): { me: Me | null; loading: boolean }` com `Me = { user_id; name; email; role: "owner"|"mechanic"|"receptionist"; tenant_name: string|null }` e `isOfficeRole(role)`.
- Rotas: `/os/:id/escritorio` → `OsOfficePage`.

- [ ] **Step 1: Vitest das funções puras (vermelho)**

Create `ui-tests/unit/internalApi.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatQty,
  partLineText,
  sheetToText,
  type OfficeSheet,
} from '../../frontend/oficinasync-web/src/lib/internalApi';

describe('formatMoney / formatQty', () => {
  it('moeda em pt-BR; null vira "preço não informado"', () => {
    expect(formatMoney(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(formatMoney(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
    expect(formatMoney(null)).toBe('preço não informado');
  });

  it('quantidade sem casas desnecessárias', () => {
    expect(formatQty(2)).toBe('2');
    expect(formatQty(1.5)).toBe('1,5');
  });
});

describe('partLineText', () => {
  it('descrição, código ou "sem código", e preço', () => {
    expect(
      partLineText({ description: 'Vela NGK', code: 'BKR6E', used_quantity: 2, unit_price: 25, line_total: 50 } as never),
    ).toMatch(/2x Vela NGK \| cód: BKR6E \| R\$\s?25,00 \(un\) = R\$\s?50,00/);
    expect(
      partLineText({ description: 'Filtro', code: null, used_quantity: 1, unit_price: null, line_total: null } as never),
    ).toBe('1x Filtro | sem código | preço não informado');
  });
});

const sheet: OfficeSheet = {
  service_order_id: 12,
  status: 'done',
  created_at: '2026-10-10T12:00:00Z',
  finished_at: '2026-10-11T12:00:00Z',
  complaint: 'Não pega de manhã',
  mileage_in: 120000,
  client: { name: 'Sr. Antônio', phone: '+5514997951011', cpf: '52998224725', address: 'Rua A, 1', email: null },
  car: { plate: 'ABC1D23', brand: 'Fiat', model: 'Uno', year: 2008, color: 'Branco', chassis: '9BD15822A8Y123456', fuel_type: 'flex' },
  missing_data: { client: [], car: [] },
  work_done: [{ type: 'repair', status: 'published', notes: 'Trocada a bomba' }],
  parts: [{ part_id: 1, description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4, used_quantity: 2, unit_price: 25, photo_url: null, created_by_name: null, line_total: 50 }],
  pending_parts: [{ part_id: 2, description: 'Cabo', code: null, taken_quantity: 6, used_quantity: null, unit_price: null, photo_url: null, created_by_name: null }],
  services: [{ service_id: 1, description: 'Troca da bomba', price: 80 }],
  responsible: { user_id: 1, name: 'João', share_percent: 70 },
  participants: [{ user_id: 2, name: 'Pedro', share_percent: 30, task: 'diagnóstico' }],
  internal_notes: 'Paga no PIX',
  totals: { parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 0 },
};

describe('sheetToText', () => {
  const text = sheetToText(sheet);

  it('inclui OS, placa, cliente, peças usadas, retiradas sem acerto, serviços, equipe e anotações', () => {
    expect(text).toContain('OS #12');
    expect(text).toContain('ABC1D23');
    expect(text).toContain('Sr. Antônio');
    expect(text).toContain('PEÇAS USADAS');
    expect(text).toContain('2x Vela NGK');
    expect(text).toContain('RETIRADAS SEM ACERTO');
    expect(text).toContain('6x Cabo');
    expect(text).toContain('SERVIÇOS');
    expect(text).toContain('Troca da bomba');
    expect(text).toContain('João (responsável) 70%');
    expect(text).toContain('Pedro 30% — diagnóstico');
    expect(text).toContain('Paga no PIX');
  });

  it('não escreve "null" nem "undefined"; cliente ausente vira "Cliente não identificado"', () => {
    const bare = sheetToText({ ...sheet, client: null, internal_notes: null, parts: [], pending_parts: [], services: [], participants: [] });
    expect(bare).not.toMatch(/\bnull\b|\bundefined\b/);
    expect(bare).toContain('Cliente não identificado');
  });
});
```

Run: `cd ui-tests && npx vitest run internalApi` → Expected: FAIL (`Failed to resolve import`).

- [ ] **Step 2: `internalApi.ts` e `me.ts`**

Create `frontend/oficinasync-web/src/lib/internalApi.ts`:

```ts
import { clientLabel } from "./display";
import type { MissingData } from "@/components/os/types";

export type Perm = {
  edit_items: boolean;
  edit_team: boolean;
  edit_notes: boolean;
  change_responsible: boolean;
  see_sheet: boolean;
  see_all_team: boolean;
};

export type PartView = {
  part_id: number;
  description: string;
  code: string | null;
  taken_quantity: number;
  used_quantity: number | null;
  unit_price: number | null;
  photo_url: string | null;
  created_by_name: string | null;
};

export type ServiceView = { service_id: number; description: string; price: number | null };
export type ParticipantView = { user_id: number; name: string; share_percent: number; task: string };
export type TeamMember = { user_id: number; name: string; role: "owner" | "mechanic" | "receptionist" };

export type InternalData = {
  service_order_id: number;
  status: string;
  viewer: { user_id: number; role: TeamMember["role"]; is_responsible: boolean };
  responsible: { user_id: number; name: string };
  notes: string | null;
  parts: PartView[];
  services: ServiceView[];
  participants: ParticipantView[];
  responsible_share_percent: number | null;
  my_share_percent: number | null;
  can: Perm;
};

export type OfficeSheet = {
  service_order_id: number;
  status: string;
  created_at: string;
  finished_at: string | null;
  complaint: string;
  mileage_in: number | null;
  client: { name: string; phone: string | null; cpf: string | null; address: string | null; email: string | null } | null;
  car: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    chassis: string | null;
    fuel_type: string | null;
  };
  missing_data: MissingData;
  work_done: { type: string; status: string; notes: string }[];
  parts: (PartView & { line_total: number | null })[];
  pending_parts: PartView[];
  services: ServiceView[];
  responsible: { user_id: number; name: string; share_percent: number };
  participants: ParticipantView[];
  internal_notes: string | null;
  totals: { parts_total: number; services_total: number; grand_total: number; unpriced_items: number };
};

export function formatMoney(value: number | null): string {
  if (value === null) return "preço não informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQty(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "2x Vela NGK | cód: BKR6E | R$ 25,00 (un) = R$ 50,00" */
export function partLineText(
  p: Pick<PartView, "description" | "code" | "used_quantity" | "unit_price"> & { line_total: number | null; taken_quantity?: number },
): string {
  const qty = p.used_quantity ?? p.taken_quantity ?? 0;
  const parts = [`${formatQty(qty)}x ${p.description}`, p.code ? `cód: ${p.code}` : "sem código"];
  if (p.unit_price === null) {
    parts.push("preço não informado");
  } else {
    parts.push(
      p.line_total !== null
        ? `${formatMoney(p.unit_price)} (un) = ${formatMoney(p.line_total)}`
        : `${formatMoney(p.unit_price)} (un)`,
    );
  }
  return parts.join(" | ");
}

/** Texto puro da ficha, pronto pra colar no outro sistema. */
export function sheetToText(s: OfficeSheet): string {
  const lines: string[] = [];
  const carName = [s.car.brand, s.car.model, s.car.year].filter(Boolean).join(" ");
  lines.push(`OS #${s.service_order_id} — ${s.car.plate}${carName ? ` — ${carName}` : ""}`);
  lines.push("");
  lines.push("CLIENTE");
  lines.push(clientLabel(s.client?.name));
  if (s.client) {
    for (const v of [s.client.phone, s.client.cpf && `CPF ${s.client.cpf}`, s.client.address, s.client.email]) {
      if (v) lines.push(v);
    }
  }
  lines.push("");
  lines.push("DEFEITO RELATADO");
  lines.push(s.complaint);
  if (s.work_done.length > 0) {
    lines.push("");
    lines.push("O QUE FOI FEITO");
    for (const w of s.work_done) lines.push(`- ${w.notes}`);
  }

  lines.push("");
  lines.push("PEÇAS USADAS");
  if (s.parts.length === 0) lines.push("(nenhuma)");
  for (const p of s.parts) lines.push(`- ${partLineText(p)}`);

  if (s.pending_parts.length > 0) {
    lines.push("");
    lines.push("RETIRADAS SEM ACERTO");
    for (const p of s.pending_parts) {
      lines.push(`- ${formatQty(p.taken_quantity)}x ${p.description} | ${p.code ? `cód: ${p.code}` : "sem código"}`);
    }
  }

  lines.push("");
  lines.push("SERVIÇOS");
  if (s.services.length === 0) lines.push("(nenhum)");
  for (const v of s.services) lines.push(`- ${v.description} | ${formatMoney(v.price)}`);

  lines.push("");
  lines.push("EQUIPE");
  lines.push(`- ${s.responsible.name} (responsável) ${s.responsible.share_percent}%`);
  for (const p of s.participants) lines.push(`- ${p.name} ${p.share_percent}% — ${p.task}`);

  if (s.internal_notes) {
    lines.push("");
    lines.push("ANOTAÇÕES DO ESCRITÓRIO");
    lines.push(s.internal_notes);
  }

  lines.push("");
  lines.push(
    `TOTAL: peças ${formatMoney(s.totals.parts_total)} + serviços ${formatMoney(s.totals.services_total)} = ${formatMoney(s.totals.grand_total)}` +
      (s.totals.unpriced_items > 0 ? ` (${s.totals.unpriced_items} item(ns) sem preço)` : ""),
  );
  return lines.join("\n");
}
```

Create `frontend/oficinasync-web/src/lib/me.ts`:

```ts
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export type Role = "owner" | "mechanic" | "receptionist";
export type Me = { user_id: number; name: string; email: string; role: Role; tenant_name: string | null };

export const isOfficeRole = (role?: Role | null) => role === "owner" || role === "receptionist";

export const roleLabels: Record<Role, string> = {
  owner: "Dono",
  receptionist: "Recepção",
  mechanic: "Mecânico",
};

let cached: Me | null = null;

/** Usuário logado (cache simples por sessão da página). */
export function useMe() {
  const [me, setMe] = useState<Me | null>(cached);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    apiFetch<Me>("/users/me", { silent: true })
      .then((result) => {
        cached = result;
        if (alive) setMe(result);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { me, loading };
}

export function clearMeCache() {
  cached = null;
}
```

Run: `cd ui-tests && npx vitest run internalApi` → Expected: PASS. Em `LoginPage`/logout, chame `clearMeCache()` ao sair (Step 6).

- [ ] **Step 3: Componentes de Peças/Serviços/Anotações**

Create `frontend/oficinasync-web/src/components/internal/PartSheet.tsx`:

```tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/fields/FieldShell";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/imageCompression";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type PartSheetProps = {
  orderId: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Registra uma peça retirada do estoque (com foto da caixa, código opcional e preço opcional). */
export function PartSheet({ orderId, open, onClose, onSaved }: PartSheetProps) {
  useDarkTheme();
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setCode("");
    setQty("");
    setPrice("");
    setPhoto(null);
  }, [open]);

  const toNumber = (v: string) => Number(v.replace(",", "."));
  const valid = description.trim().length > 0 && qty !== "" && toNumber(qty) >= 0 && !Number.isNaN(toNumber(qty));

  const submit = async () => {
    try {
      setSaving(true);
      const part = await apiFetch<{ part_id: number }>(`/service_orders/${orderId}/parts`, {
        method: "POST",
        json: {
          description: description.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
          taken_quantity: toNumber(qty),
          ...(price !== "" ? { unit_price: toNumber(price) } : {}),
        },
      });

      if (photo) {
        const formData = new FormData();
        formData.append("file", await compressImage(photo));
        await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}/photo`, { method: "POST", body: formData });
      }

      toast.success("Peça registrada!");
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Peça retirada do estoque</SheetTitle>
          <SheetDescription>
            Sem código? Tire uma foto da caixa. Depois, no final, você informa só o que realmente usou.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <FieldShell label="Descrição da peça" htmlFor="part-desc">
            <input id="part-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Vela de ignição NGK" className={inputClass} />
          </FieldShell>
          <FieldShell label="Código" htmlFor="part-code" optional>
            <input id="part-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: BKR6E" className={inputClass} />
          </FieldShell>
          <FieldShell label="Quantidade retirada" htmlFor="part-qty">
            <input id="part-qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Ex: 4" className={inputClass} />
          </FieldShell>
          <FieldShell label="Preço unitário (R$)" htmlFor="part-price" optional>
            <input id="part-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Deixe em branco se não souber" className={inputClass} />
          </FieldShell>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm">
            <Camera className="h-4 w-4" />
            <span>{photo ? photo.name : "Foto da caixa (opcional)"}</span>
            <input
              id="part-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex gap-2 pt-2">
            <Button className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90" disabled={!valid || saving} onClick={submit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar peça
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Create `frontend/oficinasync-web/src/components/internal/PartsSection.tsx`:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/imageCompression";
import { formatMoney, formatQty, type PartView } from "@/lib/internalApi";
import { PartSheet } from "./PartSheet";

type Props = {
  orderId: number;
  parts: PartView[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

const inputClass =
  "h-10 w-24 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PartsSection({ orderId, parts, canEdit, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState<Record<number, string>>({});
  const [price, setPrice] = useState<Record<number, string>>({});

  const num = (v: string) => Number(v.replace(",", "."));

  const settle = async (part: PartView) => {
    const usedValue = used[part.part_id] ?? (part.used_quantity !== null ? String(part.used_quantity) : "");
    if (usedValue === "" || Number.isNaN(num(usedValue))) {
      toast.error("Informe quanto você realmente usou (pode ser 0).");
      return;
    }
    const priceValue = price[part.part_id];
    try {
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}`, {
        method: "PATCH",
        json: {
          used_quantity: num(usedValue),
          ...(priceValue !== undefined ? { unit_price: priceValue === "" ? null : num(priceValue) } : {}),
        },
      });
      toast.success("Acerto salvo!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const remove = async (part: PartView) => {
    try {
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}`, { method: "DELETE" });
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const addPhoto = async (part: PartView, file: File | null) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", await compressImage(file));
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}/photo`, { method: "POST", body: formData });
      toast.success("Foto anexada!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const pending = parts.filter((p) => p.used_quantity === null).length;

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="parts">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Peças</h2>
        {canEdit && (
          <Button variant="outline" className="h-10" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar peça
          </Button>
        )}
      </div>

      {pending > 0 && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          {pending} peça(s) retirada(s) sem acerto — informe quanto realmente usou.
        </p>
      )}

      {parts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça registrada ainda.</p>}

      <ul className="space-y-3">
        {parts.map((part) => (
          <li key={part.part_id} className="space-y-2 rounded-2xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{part.description}</p>
                <p className="text-xs text-muted-foreground">
                  {part.code ? `cód: ${part.code}` : "sem código"} · retiradas: {formatQty(part.taken_quantity)} ·{" "}
                  {formatMoney(part.unit_price)}
                  {part.created_by_name ? ` · ${part.created_by_name}` : ""}
                </p>
              </div>
              {canEdit && (
                <button type="button" aria-label={`Apagar ${part.description}`} onClick={() => remove(part)} className="text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {part.photo_url && (
              <img src={part.photo_url} alt={`Caixa de ${part.description}`} className="h-24 rounded-lg border border-border object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Quantidade usada de ${part.description}`}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="usada"
                  value={used[part.part_id] ?? (part.used_quantity !== null ? String(part.used_quantity) : "")}
                  onChange={(e) => setUsed((s) => ({ ...s, [part.part_id]: e.target.value }))}
                />
                <input
                  aria-label={`Preço unitário de ${part.description}`}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="R$ un."
                  value={price[part.part_id] ?? (part.unit_price !== null ? String(part.unit_price) : "")}
                  onChange={(e) => setPrice((s) => ({ ...s, [part.part_id]: e.target.value }))}
                />
                <Button size="sm" className="h-10" onClick={() => settle(part)}>
                  Confirmar uso
                </Button>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  Foto
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addPhoto(part, e.target.files?.[0] ?? null)} />
                </label>
                {part.used_quantity !== null && <span className="text-xs text-brand">usada: {formatQty(part.used_quantity)}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>

      <PartSheet orderId={orderId} open={open} onClose={() => setOpen(false)} onSaved={onChanged} />
    </section>
  );
}
```

Create `frontend/oficinasync-web/src/components/internal/ServicesSection.tsx`:

```tsx
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatMoney, type ServiceView } from "@/lib/internalApi";

type Props = { orderId: number; services: ServiceView[]; canEdit: boolean; onChanged: () => Promise<void> | void };

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ServicesSection({ orderId, services, canEdit, onChanged }: Props) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const add = async () => {
    try {
      await apiFetch(`/service_orders/${orderId}/services`, {
        method: "POST",
        json: {
          description: description.trim(),
          ...(price !== "" ? { price: Number(price.replace(",", ".")) } : {}),
        },
      });
      setDescription("");
      setPrice("");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const remove = async (id: number) => {
    try {
      await apiFetch(`/service_orders/${orderId}/services/${id}`, { method: "DELETE" });
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="services">
      <h2 className="text-lg font-semibold">Serviços feitos</h2>
      {services.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço anotado ainda.</p>}
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.service_id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              {s.description} <span className="text-muted-foreground">· {formatMoney(s.price)}</span>
            </span>
            {canEdit && (
              <button type="button" aria-label={`Apagar ${s.description}`} onClick={() => remove(s.service_id)} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="service-desc" className="text-sm font-medium">Serviço</label>
            <input id="service-desc" className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Troca da bomba de combustível" />
          </div>
          <div className="w-32">
            <label htmlFor="service-price" className="text-sm font-medium">Valor <span className="text-xs text-muted-foreground">(opcional)</span></label>
            <input id="service-price" inputMode="decimal" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="R$" />
          </div>
          <Button className="h-11" onClick={add} disabled={description.trim() === ""}>
            Adicionar serviço
          </Button>
        </div>
      )}
    </section>
  );
}
```

Create `frontend/oficinasync-web/src/components/internal/NotesSection.tsx`:

```tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Props = { orderId: number; notes: string | null; onChanged: () => Promise<void> | void };

export function NotesSection({ orderId, notes, onChanged }: Props) {
  const [text, setText] = useState(notes ?? "");
  useEffect(() => setText(notes ?? ""), [notes]);

  const save = async () => {
    try {
      await apiFetch(`/service_orders/${orderId}/internal/notes`, { method: "PUT", json: { notes: text } });
      toast.success("Anotações salvas!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="notes">
      <h2 className="text-lg font-semibold">Anotações do escritório</h2>
      <p className="text-xs text-muted-foreground">Só a equipe vê. O cliente nunca vê isto.</p>
      <textarea
        id="internal-notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Ex: cliente paga no PIX; nota em nome da empresa..."
      />
      <Button className="h-11" onClick={save}>Salvar anotações</Button>
    </section>
  );
}
```

- [ ] **Step 4: A página `/os/:id/escritorio` (equipe entra na Task 8)**

Create `frontend/oficinasync-web/src/pages/OsOfficePage.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import type { InternalData } from "@/lib/internalApi";
import { PartsSection } from "@/components/internal/PartsSection";
import { ServicesSection } from "@/components/internal/ServicesSection";
import { NotesSection } from "@/components/internal/NotesSection";

export function OsOfficePage() {
  useDarkTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<InternalData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<InternalData>(`/service_orders/${id}/internal`, { silent: true }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="dark min-h-screen bg-background p-6 text-foreground">
        <p>{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(`/os/${id}`)}>Voltar</Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const orderId = data.service_order_id;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <button type="button" onClick={() => navigate(`/os/${orderId}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a OS
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Peças e equipe — OS #{orderId}</h1>
          <p className="text-sm text-muted-foreground">
            Área interna: só a equipe vê. Responsável pela OS: <strong>{data.responsible.name}</strong>
            {data.viewer.is_responsible ? " (você)" : ""}.
          </p>
          {data.can.see_sheet && (
            <Button variant="outline" className="h-10" onClick={() => navigate(`/os/${orderId}/ficha`)}>
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Abrir a ficha do escritório
            </Button>
          )}
        </header>

        <PartsSection orderId={orderId} parts={data.parts} canEdit={data.can.edit_items} onChanged={load} />
        <ServicesSection orderId={orderId} services={data.services} canEdit={data.can.edit_items} onChanged={load} />
        {data.can.edit_notes && <NotesSection orderId={orderId} notes={data.notes} onChanged={load} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rota e botão na tela do mecânico**

Em `App.tsx`: acrescentar `const OsOfficePage = lazy(() => import('./pages/OsOfficePage').then((m) => ({ default: m.OsOfficePage })))` junto dos demais `lazy` e, ao lado da rota `/os/:id`, `<Route path="/os/:id/escritorio" element={<OsOfficePage />} />`.

Em `OsWorkPage.tsx`: importar `Boxes` de `lucide-react` (adicione ao import existente) e, antes do `<Button className="col-span-2 h-11 bg-brand ...">Finalizar OS`, inserir:

```tsx
            <Button
              variant="outline"
              className="h-11"
              onClick={() => navigate(`/os/${data.service_order_id}/escritorio`)}
            >
              <Boxes className="mr-1.5 h-4 w-4" />
              Peças e equipe
            </Button>
```

- [ ] **Step 6: Mecânico no ambiente de teste de tela + spec Playwright (vermelho→verde)**

Em `backend/test/helpers/seed.ts` acrescentar (e fazer `createStaff` reutilizá-la):

```ts
/** Funcionário ativo no banco (sem token) — usado também pelo ui-seed. */
export async function createStaffRecords(
  app: INestApplicationContext,
  tenant: Tenants,
  role: Role,
  label: string,
) {
  const email = `${label}-${randomUUID().slice(0, 8)}@teste.local`;
  const password = 'Teste@12345';
  const user = await app
    .get(UsersService)
    .createFromInvite(`${label} ${role}`, email, password, tenant, role);
  return { user, email, password };
}
```

(`createStaff` passa a chamar `createStaffRecords` e só assinar o token.) Em `backend/test/ui-seed.ts`, depois de `const owner = ...`:

```ts
  const mechanic = await createStaffRecords(app, owner.tenant, Role.MECHANIC, 'ui-mec');
```
(importar `createStaffRecords` e `Role`) e incluir no JSON impresso: `mechanic: { email: mechanic.email, password: mechanic.password }`.

Em `ui-tests/e2e/global-setup.ts`: ampliar o tipo de `owner` com `mechanic: { email: string; password: string }`, e depois de salvar o `state.json`, logar o mecânico e salvar `mechanic.json`:

```ts
  const mechLogin = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(owner.mechanic),
  });
  if (!mechLogin.ok) throw new Error(`login do mecânico falhou: ${mechLogin.status}`);
  const mech = (await mechLogin.json()) as { access_token: string };
  writeFileSync(
    path.join(authDir, 'mechanic.json'),
    JSON.stringify({
      cookies: [],
      origins: [{ origin: FRONTEND_ORIGIN, localStorage: [{ name: 'token', value: mech.access_token }] }],
    }),
  );
  process.env.UI_MECHANIC_EMAIL = owner.mechanic.email;
```

(2 logins na preparação + `login.spec.ts` usa 2 → 4/min, dentro do limite de 5.)

Create `ui-tests/e2e/dados-internos.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3100';

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

/** POST/PUT/PATCH na API com o token da sessão do navegador. */
async function api(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body, API }) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    { method, path, body, API },
  );
}

/** Abre uma OS (carro só com a placa) como o usuário logado. */
async function openOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Barulho na suspensão' });
  return order.json.service_order_id;
}

test('peças: registra retirada, acerta o que usou com preço, e serviço — tudo na área interna', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);
  await expect(page.getByRole('heading', { name: new RegExp(`OS #${orderId}`) })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar peça' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('#part-desc').fill('Vela NGK');
  await sheet.locator('#part-code').fill('BKR6E');
  await sheet.locator('#part-qty').fill('4');
  await sheet.getByRole('button', { name: 'Salvar peça' }).click();

  await expect(page.getByText('Vela NGK')).toBeVisible();
  await expect(page.getByText(/1 peça\(s\) retirada\(s\) sem acerto/)).toBeVisible();

  await page.getByLabel('Quantidade usada de Vela NGK').fill('3');
  await page.getByLabel('Preço unitário de Vela NGK').fill('25');
  await page.getByRole('button', { name: 'Confirmar uso' }).click();
  await expect(page.getByText('usada: 3')).toBeVisible();
  await expect(page.getByText(/sem acerto/)).toHaveCount(0);

  await page.locator('#service-desc').fill('Troca das velas');
  await page.locator('#service-price').fill('60');
  await page.getByRole('button', { name: 'Adicionar serviço' }).click();
  await expect(page.getByText('Troca das velas')).toBeVisible();

  await page.locator('#internal-notes').fill('Cliente paga no PIX');
  await page.getByRole('button', { name: 'Salvar anotações' }).click();
  await expect(page.getByText('Anotações salvas!')).toBeVisible();
});

test.describe('mecânico (não é o responsável)', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('vê peças e serviços, mas não vê anotações do escritório nem o botão da ficha', async ({ page, browser }) => {
    // o dono abre a OS (é o responsável)
    const ownerCtx = await browser.newContext({ storageState: 'e2e/.auth/state.json' });
    const ownerPage = await ownerCtx.newPage();
    const orderId = await openOrder(ownerPage);
    await api(ownerPage, 'PUT', `/service_orders/${orderId}/internal/notes`, { notes: 'segredo do escritório' });
    await ownerCtx.close();

    await page.goto(`/os/${orderId}/escritorio`);
    await expect(page.getByRole('heading', { name: new RegExp(`OS #${orderId}`) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar peça' })).toBeVisible();
    await expect(page.getByText('Anotações do escritório')).toHaveCount(0);
    await expect(page.getByText('segredo do escritório')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /ficha do escritório/ })).toHaveCount(0);
  });
});
```

Run (vermelho esperado antes de implementar a página — mas aqui a página já existe; o vermelho do spec é das telas da Task 8/9. Para esta task, rode depois de buildar):
`cd backend && npm run build && cd ../ui-tests && bash scripts/stop-env.sh; npx playwright test e2e/dados-internos.spec.ts`
Expected: 2 passed. **Prova do vermelho:** antes de salvar `OsOfficePage.tsx`, o `page.goto('/os/:id/escritorio')` cai no `*` → o primeiro teste falha esperando o heading (rode uma vez com o arquivo de rota comentado, ou confie na ordem: escreva o spec primeiro e rode — falha por não existir a rota).

- [ ] **Step 7: Rodar tudo e commitar**

Run: `cd ui-tests && npm run test:unit && npx playwright test; cd ../frontend/oficinasync-web && npx tsc -b 2>&1 | grep -c error; npm run build 2>&1 | grep -E "error|built in"`
Expected: Vitest verde (inclui `internalApi`), Playwright todos verdes, tsc 0 erros, build ok.

```bash
git add frontend/oficinasync-web/src/lib/internalApi.ts frontend/oficinasync-web/src/lib/me.ts frontend/oficinasync-web/src/pages/OsOfficePage.tsx frontend/oficinasync-web/src/components/internal frontend/oficinasync-web/src/App.tsx frontend/oficinasync-web/src/pages/OsWorkPage.tsx backend/test/helpers/seed.ts backend/test/ui-seed.ts ui-tests/e2e/global-setup.ts ui-tests/e2e/dados-internos.spec.ts ui-tests/unit/internalApi.test.ts
git commit -m "feat: pagina interna da OS (pecas com foto de caixa, acerto do que foi usado, servicos, anotacoes) + mecanico nos testes de tela

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Equipe da OS no frontend ("quem ajudou, com o quê e quanto")

**Files:**
- Create: `frontend/oficinasync-web/src/components/internal/TeamSection.tsx`
- Modify: `frontend/oficinasync-web/src/pages/OsOfficePage.tsx`, `ui-tests/e2e/dados-internos.spec.ts`

**Interfaces:**
- Consumes: `GET /users/team`, `PUT /service_orders/:id/participants`, `PATCH /service_orders/:id/responsible`; tipos `InternalData`, `TeamMember` (Task 7).
- Produces: `<TeamSection data={InternalData} onChanged />` — renderiza, para quem tem `can.edit_team`, a lista de funcionários com checkbox `aria-label="Ajudou: <nome>"`, tarefa (`aria-label="Tarefa de <nome>"` com chips rápidos) e porcentagem (`aria-label="Porcentagem de <nome>"`, passo 5), "Você fica com X%" e botão **Salvar equipe**; para o escritório, um `<select aria-label="Responsável pela OS">` que chama o PATCH; para mecânico comum, só o texto "Sua parte nesta OS: X%".

- [ ] **Step 1: Teste de tela (vermelho)** — acrescentar ao `dados-internos.spec.ts`:

```ts
test('equipe: o responsável marca quem ajudou, com o quê e quanto; fica com o resto', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);

  // o mecânico de teste (mesma oficina) aparece na lista
  const helper = page.getByLabel(/^Ajudou: ui-mec/);
  await expect(helper).toBeVisible();
  await helper.check();

  await page.getByLabel(/^Tarefa de ui-mec/).fill('diagnóstico elétrico');
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('30');
  await expect(page.getByText('Você fica com 70%')).toBeVisible();

  await page.getByRole('button', { name: 'Salvar equipe' }).click();
  await expect(page.getByText('Equipe salva!')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(/^Ajudou: ui-mec/)).toBeChecked();
  await expect(page.getByText('Você fica com 70%')).toBeVisible();
});

test('equipe: soma acima de 99% bloqueia o salvar e mostra aviso', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);
  await page.getByLabel(/^Ajudou: ui-mec/).check();
  await page.getByLabel(/^Tarefa de ui-mec/).fill('montagem');
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('99');
  await expect(page.getByText('Você fica com 1%')).toBeVisible();
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('100');
  await expect(page.getByText(/passa de 99%/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar equipe' })).toBeDisabled();
});

test.describe('mecânico comum vê só a sua parte', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('mostra "Sua parte nesta OS" e nenhuma lista de colegas', async ({ page, browser }) => {
    const ownerCtx = await browser.newContext({ storageState: 'e2e/.auth/state.json' });
    const ownerPage = await ownerCtx.newPage();
    const orderId = await openOrder(ownerPage);
    const team = await api(ownerPage, 'GET', '/users/team');
    const mech = team.json.find((u: { name: string }) => u.name.startsWith('ui-mec'));
    await api(ownerPage, 'PUT', `/service_orders/${orderId}/participants`, {
      participants: [{ user_id: mech.user_id, share_percent: 25, task: 'diagnóstico' }],
    });
    await ownerCtx.close();

    await page.goto(`/os/${orderId}/escritorio`);
    await expect(page.getByText('Sua parte nesta OS: 25%')).toBeVisible();
    await expect(page.getByLabel(/^Ajudou:/)).toHaveCount(0);
  });
});
```

Run: `cd ui-tests && npx playwright test e2e/dados-internos.spec.ts -g "equipe|sua parte"`
Expected: FAIL (não existe o card de equipe).

- [ ] **Step 2: `TeamSection`**

Create `frontend/oficinasync-web/src/components/internal/TeamSection.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { roleLabels } from "@/lib/me";
import type { InternalData, TeamMember } from "@/lib/internalApi";

const TASKS = ["Diagnóstico", "Elétrica", "Mecânica", "Montagem", "Teste"];

const inputClass =
  "h-10 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Row = { checked: boolean; task: string; percent: string };

type Props = { data: InternalData; onChanged: () => Promise<void> | void };

export function TeamSection({ data, onChanged }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [saving, setSaving] = useState(false);
  const { can } = data;

  useEffect(() => {
    if (!can.edit_team && !can.change_responsible) return;
    apiFetch<TeamMember[]>("/users/team", { silent: true }).then(setTeam).catch(() => setTeam([]));
  }, [can.edit_team, can.change_responsible]);

  // reflete o que já está salvo
  useEffect(() => {
    const next: Record<number, Row> = {};
    for (const p of data.participants) {
      next[p.user_id] = { checked: true, task: p.task, percent: String(p.share_percent) };
    }
    setRows(next);
  }, [data.participants]);

  const helpers = useMemo(() => team.filter((m) => m.user_id !== data.responsible.user_id), [team, data.responsible.user_id]);

  const rowOf = (id: number): Row => rows[id] ?? { checked: false, task: "", percent: "" };
  const patchRow = (id: number, patch: Partial<Row>) => setRows((s) => ({ ...s, [id]: { ...rowOf(id), ...patch } }));

  const checked = helpers.filter((m) => rowOf(m.user_id).checked);
  const total = checked.reduce((acc, m) => acc + (Number(rowOf(m.user_id).percent) || 0), 0);
  const mine = 100 - total;
  const complete = checked.every((m) => {
    const r = rowOf(m.user_id);
    const n = Number(r.percent);
    return r.task.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 99;
  });
  const overLimit = total > 99;

  const save = async () => {
    try {
      setSaving(true);
      await apiFetch(`/service_orders/${data.service_order_id}/participants`, {
        method: "PUT",
        json: {
          participants: checked.map((m) => ({
            user_id: m.user_id,
            share_percent: Number(rowOf(m.user_id).percent),
            task: rowOf(m.user_id).task.trim(),
          })),
        },
      });
      toast.success("Equipe salva!");
      await onChanged();
    } catch {
      // toast já mostrado
    } finally {
      setSaving(false);
    }
  };

  const changeResponsible = async (userId: number) => {
    try {
      await apiFetch(`/service_orders/${data.service_order_id}/responsible`, { method: "PATCH", json: { user_id: userId } });
      toast.success("Responsável trocado!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  // mecânico comum: só a própria parte
  if (!can.edit_team && !can.see_all_team) {
    return (
      <section className="space-y-2 rounded-3xl border border-border bg-card p-5" data-tour="team">
        <h2 className="text-lg font-semibold">Equipe nesta OS</h2>
        {data.my_share_percent !== null ? (
          <p className="text-sm">
            Sua parte nesta OS: {data.my_share_percent}%
            {data.participants[0] ? ` — ${data.participants[0].task}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Você não está marcado nesta OS.</p>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5" data-tour="team">
      <h2 className="text-lg font-semibold">Equipe nesta OS</h2>

      {can.change_responsible && team.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Responsável pela OS:
          <select
            aria-label="Responsável pela OS"
            className={inputClass}
            value={data.responsible.user_id}
            onChange={(e) => changeResponsible(Number(e.target.value))}
          >
            {team.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name} ({roleLabels[m.role]})
              </option>
            ))}
          </select>
        </label>
      )}

      {can.edit_team ? (
        <>
          <p className="text-sm text-muted-foreground">
            Marque quem ajudou, com o quê e quanto (% da OS). O resto fica com <strong>{data.responsible.name}</strong>.
          </p>

          <ul className="space-y-3">
            {helpers.map((m) => {
              const r = rowOf(m.user_id);
              return (
                <li key={m.user_id} className="space-y-2 rounded-2xl border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      aria-label={`Ajudou: ${m.name}`}
                      checked={r.checked}
                      onChange={(e) => patchRow(m.user_id, { checked: e.target.checked })}
                      className="h-5 w-5 accent-lime-400"
                    />
                    {m.name} <span className="text-xs text-muted-foreground">({roleLabels[m.role]})</span>
                  </label>

                  {r.checked && (
                    <div className="space-y-2 pl-7">
                      <div className="flex flex-wrap gap-1.5">
                        {TASKS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => patchRow(m.user_id, { task: t })}
                            className={`rounded-full border px-2.5 py-1 text-xs ${r.task === t ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`Tarefa de ${m.name}`}
                          className={`${inputClass} min-w-[180px] flex-1`}
                          placeholder="Com o quê ajudou"
                          value={r.task}
                          onChange={(e) => patchRow(m.user_id, { task: e.target.value })}
                        />
                        <input
                          aria-label={`Porcentagem de ${m.name}`}
                          type="number"
                          min={1}
                          max={99}
                          step={5}
                          className={`${inputClass} w-24`}
                          placeholder="%"
                          value={r.percent}
                          onChange={(e) => patchRow(m.user_id, { percent: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {overLimit ? (
            <p className="text-sm text-red-400">A soma passa de 99% — o responsável precisa ficar com pelo menos 1%.</p>
          ) : (
            <p className="text-sm">Você fica com {mine}%</p>
          )}

          <Button className="h-11" onClick={save} disabled={saving || overLimit || !complete}>
            Salvar equipe
          </Button>
        </>
      ) : (
        <ul className="space-y-1 text-sm">
          <li>{data.responsible.name} (responsável): {data.responsible_share_percent}%</li>
          {data.participants.map((p) => (
            <li key={p.user_id}>{p.name}: {p.share_percent}% — {p.task}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Observação: o texto exibido é `Você fica com {mine}%` — o spec do teste procura `Você fica com 70%` (texto contínuo, sem o `{}` separando em nós; o React junta em um único nó de texto quando é `Você fica com {mine}%`? Ele cria nós separados mas o `getByText` normaliza o texto do elemento — ok).

Em `OsOfficePage.tsx`: importar `TeamSection` e renderizar `<TeamSection data={data} onChanged={load} />` entre `ServicesSection` e `NotesSection`.

- [ ] **Step 3: Rodar e ver passar; commit**

Run: `cd ui-tests && npx playwright test e2e/dados-internos.spec.ts; cd ../frontend/oficinasync-web && npx tsc -b 2>&1 | grep -c error`
Expected: todos passed; tsc 0.

```bash
git add frontend/oficinasync-web/src/components/internal/TeamSection.tsx frontend/oficinasync-web/src/pages/OsOfficePage.tsx ui-tests/e2e/dados-internos.spec.ts
git commit -m "feat: equipe da OS na tela — marcar quem ajudou, com o que e quanto (%), responsavel fica com o resto

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ficha do escritório (`/os/:id/ficha`): tela organizada, copiar e imprimir

**Files:**
- Create: `frontend/oficinasync-web/src/pages/OsSheetPage.tsx`
- Modify: `frontend/oficinasync-web/src/App.tsx`, `frontend/oficinasync-web/src/pages/OsWorkPage.tsx`, `frontend/oficinasync-web/src/index.css` (regras `@media print`), `ui-tests/e2e/dados-internos.spec.ts`

**Interfaces:**
- Consumes: `GET /service_orders/:id/office-sheet`, `OfficeSheet`, `sheetToText`, `partLineText`, `formatMoney`, `formatQty` (Task 7); `useMe`/`isOfficeRole` (Task 7).
- Produces: rota `/os/:id/ficha` → `OsSheetPage`; botões **Copiar tudo**, **Copiar** por bloco (peças, serviços, equipe), **Imprimir / Salvar PDF** (`window.print()`); no `OsWorkPage` o botão **Ficha do escritório** (só aparece para escritório e para o responsável — usa `GET internal` `can.see_sheet`).

- [ ] **Step 1: Teste de tela (vermelho)** — acrescentar ao `dados-internos.spec.ts`:

```ts
test('ficha do escritório: reúne peças usadas, serviços e equipe, e copia como texto', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const orderId = await openOrder(page);
  await api(page, 'POST', `/service_orders/${orderId}/parts`, { description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4, used_quantity: 2, unit_price: 25 });
  await api(page, 'POST', `/service_orders/${orderId}/parts`, { description: 'Cabo de vela', taken_quantity: 6 });
  await api(page, 'POST', `/service_orders/${orderId}/services`, { description: 'Troca das velas', price: 60 });

  await page.goto(`/os/${orderId}/ficha`);
  await expect(page.getByRole('heading', { name: new RegExp(`Ficha da OS #${orderId}`) })).toBeVisible();
  await expect(page.getByText('Vela NGK')).toBeVisible();
  await expect(page.getByText(/Retiradas sem acerto/i)).toBeVisible();
  await expect(page.getByText('Cabo de vela')).toBeVisible();
  await expect(page.getByText('Troca das velas')).toBeVisible();

  await page.getByRole('button', { name: 'Copiar tudo' }).click();
  await expect(page.getByText('Ficha copiada!')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`OS #${orderId}`);
  expect(copied).toContain('2x Vela NGK');
  expect(copied).toContain('RETIRADAS SEM ACERTO');
});

test('ficha: HTML digitado na descrição aparece como texto (não executa)', async ({ page }) => {
  const orderId = await openOrder(page);
  await api(page, 'POST', `/service_orders/${orderId}/parts`, { description: '<img src=x onerror=window.__pwned=1>', taken_quantity: 1, used_quantity: 1 });
  await page.goto(`/os/${orderId}/ficha`);
  await expect(page.getByText('<img src=x onerror=window.__pwned=1>')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('o botão "Ficha do escritório" aparece para o dono e não para o mecânico comum', async ({ page, browser }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}`);
  await expect(page.getByRole('button', { name: 'Ficha do escritório' })).toBeVisible();

  const mechCtx = await browser.newContext({ storageState: 'e2e/.auth/mechanic.json' });
  const mechPage = await mechCtx.newPage();
  await mechPage.goto(`/os/${orderId}`);
  await expect(mechPage.getByRole('button', { name: 'Peças e equipe' })).toBeVisible();
  await expect(mechPage.getByRole('button', { name: 'Ficha do escritório' })).toHaveCount(0);
  await mechCtx.close();
});
```

Run: `cd ui-tests && npx playwright test e2e/dados-internos.spec.ts -g "ficha"` → FAIL (rota/botão inexistentes).

- [ ] **Step 2: A página da ficha**

Create `frontend/oficinasync-web/src/pages/OsSheetPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { carTitle, clientLabel } from "@/lib/display";
import { formatMoney, formatQty, partLineText, sheetToText, type OfficeSheet } from "@/lib/internalApi";

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
  }
}

function Block({ title, copyText, children }: { title: string; copyText?: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-2 rounded-2xl border border-neutral-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-700">{title}</h2>
        {copyText !== undefined && (
          <button
            type="button"
            onClick={() => copy(copyText, `${title}: copiado!`)}
            className="no-print flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm text-neutral-900">{children}</div>
    </section>
  );
}

export function OsSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<OfficeSheet | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setSheet(await apiFetch<OfficeSheet>(`/service_orders/${id}/office-sheet`, { silent: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a ficha.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 p-6 text-neutral-900">
        <p>{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(`/os/${id}`)}>Voltar</Button>
      </div>
    );
  }
  if (!sheet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const partsText = sheet.parts.map((p) => partLineText(p)).join("\n");
  const servicesText = sheet.services.map((s) => `${s.description} | ${formatMoney(s.price)}`).join("\n");
  const teamText = [
    `${sheet.responsible.name} (responsável) ${sheet.responsible.share_percent}%`,
    ...sheet.participants.map((p) => `${p.name} ${p.share_percent}% — ${p.task}`),
  ].join("\n");

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => navigate(`/os/${sheet.service_order_id}`)} className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Voltar para a OS
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copy(sheetToText(sheet), "Ficha copiada!")}>
              <Copy className="mr-1.5 h-4 w-4" /> Copiar tudo
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Ficha da OS #{sheet.service_order_id}</h1>
        <p className="text-xs text-neutral-500">Documento interno — não é enviado ao cliente.</p>

        {(sheet.missing_data.client.length > 0 || sheet.missing_data.car.length > 0) && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Dados pendentes: {[...sheet.missing_data.client, ...sheet.missing_data.car].map((i) => i.label).join(", ")}.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Block title="Cliente">
            <p className="font-medium">{clientLabel(sheet.client?.name)}</p>
            {sheet.client?.phone && <p>{sheet.client.phone}</p>}
            {sheet.client?.cpf && <p>CPF {sheet.client.cpf}</p>}
            {sheet.client?.address && <p>{sheet.client.address}</p>}
            {sheet.client?.email && <p>{sheet.client.email}</p>}
          </Block>
          <Block title="Veículo">
            <p className="font-medium">
              {carTitle(sheet.car)} {sheet.car.year ?? ""}
            </p>
            <p className="font-mono">{sheet.car.plate}</p>
            {sheet.car.chassis && <p>Chassi {sheet.car.chassis}</p>}
            <p>{[sheet.car.color, sheet.car.fuel_type, sheet.mileage_in != null ? `${sheet.mileage_in.toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" · ")}</p>
          </Block>
        </div>

        <Block title="Defeito relatado e o que foi feito">
          <p>{sheet.complaint}</p>
          {sheet.work_done.map((w, i) => (
            <p key={i} className="text-neutral-700">— {w.notes}</p>
          ))}
        </Block>

        <Block title="Peças usadas" copyText={partsText}>
          {sheet.parts.length === 0 && <p className="text-neutral-500">Nenhuma peça acertada.</p>}
          {sheet.parts.map((p) => (
            <div key={p.part_id} className="flex flex-wrap items-center gap-3 border-b border-neutral-100 py-1">
              <span className="flex-1">{partLineText(p)}</span>
              {p.photo_url && <img src={p.photo_url} alt={`Caixa de ${p.description}`} className="h-14 rounded border border-neutral-200 object-cover" />}
            </div>
          ))}
        </Block>

        {sheet.pending_parts.length > 0 && (
          <Block title="Retiradas sem acerto">
            {sheet.pending_parts.map((p) => (
              <div key={p.part_id} className="flex items-center gap-3 text-amber-800">
                <span className="flex-1">
                  {formatQty(p.taken_quantity)}x {p.description} | {p.code ? `cód: ${p.code}` : "sem código"}
                </span>
                {p.photo_url && <img src={p.photo_url} alt={`Caixa de ${p.description}`} className="h-14 rounded border border-neutral-200 object-cover" />}
              </div>
            ))}
          </Block>
        )}

        <Block title="Serviços / mão de obra" copyText={servicesText}>
          {sheet.services.length === 0 && <p className="text-neutral-500">Nenhum serviço anotado.</p>}
          {sheet.services.map((s) => (
            <p key={s.service_id}>{s.description} — {formatMoney(s.price)}</p>
          ))}
        </Block>

        <Block title="Equipe e porcentagens" copyText={teamText}>
          <p>{sheet.responsible.name} (responsável): <strong>{sheet.responsible.share_percent}%</strong></p>
          {sheet.participants.map((p) => (
            <p key={p.user_id}>{p.name}: <strong>{p.share_percent}%</strong> — {p.task}</p>
          ))}
        </Block>

        {sheet.internal_notes && (
          <Block title="Anotações do escritório" copyText={sheet.internal_notes}>
            <p className="whitespace-pre-line">{sheet.internal_notes}</p>
          </Block>
        )}

        <Block title="Totais">
          <p>Peças: {formatMoney(sheet.totals.parts_total)} · Serviços: {formatMoney(sheet.totals.services_total)}</p>
          <p className="text-base font-bold">Total: {formatMoney(sheet.totals.grand_total)}</p>
          {sheet.totals.unpriced_items > 0 && <p className="text-amber-800">{sheet.totals.unpriced_items} item(ns) sem preço — o total não os inclui.</p>}
        </Block>
      </div>
    </div>
  );
}
```

Todo texto vem como filho de elemento React (escapado por padrão) — não use `dangerouslySetInnerHTML`.

- [ ] **Step 3: CSS de impressão, rota e botão**

Em `frontend/oficinasync-web/src/index.css`, no fim:

```css
@media print {
  .no-print {
    display: none !important;
  }
  body {
    background: #fff !important;
  }
}
```

Em `App.tsx`: `const OsSheetPage = lazy(() => import('./pages/OsSheetPage').then((m) => ({ default: m.OsSheetPage })))` e `<Route path="/os/:id/ficha" element={<OsSheetPage />} />`.

Em `OsWorkPage.tsx`: guardar a permissão — acrescentar ao componente um `useEffect` que consulta `GET /service_orders/${id}/internal` (silent) e guarda `canSeeSheet`:

```tsx
  const [canSeeSheet, setCanSeeSheet] = useState(false);
  useEffect(() => {
    if (!id) return;
    apiFetch<{ can: { see_sheet: boolean } }>(`/service_orders/${id}/internal`, { silent: true })
      .then((r) => setCanSeeSheet(r.can.see_sheet))
      .catch(() => setCanSeeSheet(false));
  }, [id]);
```

e, ao lado do botão "Peças e equipe", renderizar:

```tsx
            {canSeeSheet && (
              <Button variant="outline" className="h-11" onClick={() => navigate(`/os/${data.service_order_id}/ficha`)}>
                <ClipboardList className="mr-1.5 h-4 w-4" />
                Ficha do escritório
              </Button>
            )}
```
(importar `ClipboardList` de `lucide-react`.)

- [ ] **Step 4: Rodar e ver passar; commit**

Run: `cd frontend/oficinasync-web && npx tsc -b 2>&1 | grep -c error; cd ../../ui-tests && npx playwright test e2e/dados-internos.spec.ts`
Expected: tsc 0; todos passed.

```bash
git add frontend/oficinasync-web/src/pages/OsSheetPage.tsx frontend/oficinasync-web/src/App.tsx frontend/oficinasync-web/src/pages/OsWorkPage.tsx frontend/oficinasync-web/src/index.css ui-tests/e2e/dados-internos.spec.ts
git commit -m "feat: ficha do escritorio (tela organizada, copiar por bloco/tudo, imprimir) so para escritorio e responsavel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Tela de comissões + menu por perfil (esconde Scanner)

**Files:**
- Create: `frontend/oficinasync-web/src/pages/CommissionsPage.tsx`
- Modify: `frontend/oficinasync-web/src/App.tsx`, `src/components/DashboardSidebar.tsx`, `src/pages/ScannerPage.tsx` (texto "vai configurado"), `ui-tests/e2e/dados-internos.spec.ts`

**Interfaces:**
- Consumes: `GET /commissions?from&to&user_id` (Task 5), `GET /users/team`, `useMe`/`isOfficeRole`.
- Produces: rota `/comissoes` (item **Comissões** na sidebar; para mecânico o título é **Minhas comissões**); o item **Scanner** só aparece se `import.meta.env.VITE_FEATURE_OBD === "true"`.

- [ ] **Step 1: Teste de tela (vermelho)** — acrescentar ao `dados-internos.spec.ts`:

```ts
test('comissões: tela abre com filtro de período e sem o item Scanner no menu', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Scanner' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Comissões' }).click();
  await expect(page).toHaveURL(/\/comissoes$/);
  await expect(page.getByRole('heading', { name: 'Comissões' })).toBeVisible();
  await expect(page.locator('#comm-from')).toBeVisible();
  await expect(page.locator('#comm-to')).toBeVisible();
  await expect(page.getByText(/Nenhuma OS concluída/)).toBeVisible();
});

test.describe('mecânico', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });
  test('vê "Minhas comissões"', async ({ page }) => {
    await page.goto('/comissoes');
    await expect(page.getByRole('heading', { name: 'Minhas comissões' })).toBeVisible();
  });
});
```

Run: `cd ui-tests && npx playwright test e2e/dados-internos.spec.ts -g "comissões|Minhas"` → FAIL.

- [ ] **Step 2: A página**

Create `frontend/oficinasync-web/src/pages/CommissionsPage.tsx` (segue o padrão de `ClientsPage`: `SidebarInset`, `SidebarTrigger`, `DashboardSidebar`, `useDarkTheme`):

```tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { isOfficeRole, useMe } from "@/lib/me";
import type { TeamMember } from "@/lib/internalApi";

type Line = { service_order_id: number; plate: string; finished_at: string; share_percent: number; task: string | null; is_responsible: boolean };
type Person = { user_id: number; name: string; role: string; os_count: number; total_percent: number; orders: Line[] };
type Result = { from: string; to: string; people: Person[] };

const inputClass =
  "h-10 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function CommissionsPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const { me } = useMe();
  const office = isOfficeRole(me?.role);

  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [userId, setUserId] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to, ...(userId ? { user_id: userId } : {}) });
      setResult(await apiFetch<Result>(`/commissions?${qs.toString()}`, { silent: true }));
    } catch {
      setResult({ from, to, people: [] });
    } finally {
      setLoading(false);
    }
  }, [from, to, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (office) apiFetch<TeamMember[]>("/users/team", { silent: true }).then(setTeam).catch(() => setTeam([]));
  }, [office]);

  return (
    <>
      <DashboardSidebar />
      <SidebarInset className="dark bg-background text-foreground">
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold tracking-tight">{office ? "Comissões" : "Minhas comissões"}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Porcentagem de cada pessoa nas OS concluídas no período. (Valores em R$ ainda não — a OS não guarda preço.)
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">De<br /><input id="comm-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="text-sm">Até<br /><input id="comm-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></label>
            {office && (
              <label className="text-sm">Funcionário<br />
                <select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">Todos</option>
                  {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              </label>
            )}
          </div>

          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {!loading && result && result.people.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma OS concluída neste período.</p>
          )}

          {result?.people.map((p) => (
            <section key={p.user_id} className="space-y-2 rounded-3xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-sm">
                  <strong>{p.total_percent}%</strong> somados em {p.os_count} OS
                  <span className="text-muted-foreground"> (≈ {(p.total_percent / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} OS inteiras)</span>
                </p>
              </div>
              <ul className="space-y-1 text-sm">
                {p.orders.map((o) => (
                  <li key={o.service_order_id} className="flex flex-wrap justify-between gap-2">
                    <button type="button" className="text-brand hover:underline" onClick={() => navigate(`/os/${o.service_order_id}`)}>
                      OS #{o.service_order_id} · {o.plate}
                    </button>
                    <span>{o.share_percent}% {o.is_responsible ? "(responsável)" : `— ${o.task}`}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SidebarInset>
    </>
  );
}
```

- [ ] **Step 3: Rota, menu e texto**

Em `App.tsx`: `const CommissionsPage = lazy(...)` e a rota (mesmo padrão com `SidebarProvider`):

```tsx
          <Route
            path="/comissoes"
            element={
              <SidebarProvider>
                <CommissionsPage />
              </SidebarProvider>
            }
          />
```

Em `DashboardSidebar.tsx`: importar `Percent` de `lucide-react`, `useMe`/`isOfficeRole` de `@/lib/me`; no corpo `const { me } = useMe();` e, depois do item "Equipe", acrescentar:

```tsx
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/comissoes")}>
                  <Percent />
                  <span>{isOfficeRole(me?.role) ? "Comissões" : "Minhas comissões"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
```

Para o teste (`name: 'Comissões'`) o dono vê "Comissões". Envolver o item **Scanner** existente em `{import.meta.env.VITE_FEATURE_OBD === "true" && (...)}`. Também esconder **Equipe** para quem não é dono (`me?.role === "owner"`): `POST /invites` é só do dono.

Em `ScannerPage.tsx`: localizar o texto com "vai configurado" (`grep -n "vai configurado" src/pages/ScannerPage.tsx`) e trocar por "já configurado" (ou a redação correta que o contexto da frase pedir).

No logout (função `logout` do `DashboardSidebar`), chamar `clearMeCache()` (importar de `@/lib/me`) antes do `navigate("/login")`; faça o mesmo no `LoginPage.tsx` depois de salvar o token novo (senão o `useMe` mostraria o usuário anterior).

- [ ] **Step 4: Rodar e ver passar; commit**

Run: `cd frontend/oficinasync-web && npx tsc -b 2>&1 | grep -c error; cd ../../ui-tests && npx playwright test`
Expected: tsc 0; Playwright todos verdes (os testes antigos que clicavam no menu continuam; se algum procurava "Scanner" no menu, ajuste o teste, não a regra).

```bash
git add frontend/oficinasync-web/src/pages/CommissionsPage.tsx frontend/oficinasync-web/src/App.tsx frontend/oficinasync-web/src/components/DashboardSidebar.tsx frontend/oficinasync-web/src/pages/ScannerPage.tsx frontend/oficinasync-web/src/pages/LoginPage.tsx ui-tests/e2e/dados-internos.spec.ts
git commit -m "feat: tela de comissoes (escritorio ve todos, mecanico so as proprias) e menu por perfil sem Scanner

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Passo a passo no primeiro acesso + dicas "?"

**Files:**
- Create: `frontend/oficinasync-web/src/lib/tours.ts` (+ `ui-tests/unit/tours.test.ts`), `src/components/guide/GuidedTour.tsx`, `src/components/guide/HelpHint.tsx`
- Modify: `frontend/oficinasync-web/src/pages/dashBoardPage.tsx` (monta o tour), `src/pages/SettingsPage.tsx` (botão "Rever passo a passo"), `src/components/internal/{PartsSection,TeamSection}.tsx` e `src/components/os/CompleteDataSheet.tsx` (dicas), `ui-tests/e2e/dados-internos.spec.ts`

**Interfaces:**
- Consumes: `useMe`, `Role`.
- Produces (`tours.ts`): `TOUR_VERSION = 1`, `tourSteps(role: Role): TourStep[]` com `TourStep = { title: string; text: string; target?: string }`, `tourKey(userId: number): string`, `shouldShowTour(storage: Pick<Storage,"getItem">, userId: number): boolean`, `markTourDone(storage: Pick<Storage,"setItem">, userId: number): void`, `resetTour(storage: Pick<Storage,"removeItem">, userId: number): void`. `<GuidedTour steps open onClose />`, `<HelpHint text label? />`.

- [ ] **Step 1: Vitest do estado/roteiros (vermelho)**

Create `ui-tests/unit/tours.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  TOUR_VERSION,
  markTourDone,
  resetTour,
  shouldShowTour,
  tourKey,
  tourSteps,
} from '../../frontend/oficinasync-web/src/lib/tours';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('estado do passo a passo', () => {
  it('aparece no primeiro acesso, some depois de concluído, volta ao resetar', () => {
    const s = fakeStorage();
    expect(shouldShowTour(s, 7)).toBe(true);
    markTourDone(s, 7);
    expect(shouldShowTour(s, 7)).toBe(false);
    resetTour(s, 7);
    expect(shouldShowTour(s, 7)).toBe(true);
  });

  it('é por usuário (outro funcionário no mesmo aparelho vê o dele)', () => {
    const s = fakeStorage();
    markTourDone(s, 1);
    expect(shouldShowTour(s, 2)).toBe(true);
  });

  it('muda de versão → todo mundo vê de novo', () => {
    const s = fakeStorage();
    s.setItem(tourKey(5).replace(`v${TOUR_VERSION}`, `v${TOUR_VERSION - 1}`), '1');
    expect(shouldShowTour(s, 5)).toBe(true);
  });

  it('tem roteiro curto (4–6 passos) para cada perfil, em português', () => {
    for (const role of ['owner', 'mechanic', 'receptionist'] as const) {
      const steps = tourSteps(role);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(6);
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(3);
        expect(step.text.length).toBeGreaterThan(10);
      }
    }
  });

  it('mecânico aprende peças e equipe; dono aprende ficha e comissões; recepção, completar dados', () => {
    expect(tourSteps('mechanic').map((s) => s.text).join(' ')).toMatch(/quem ajudou/i);
    expect(tourSteps('owner').map((s) => s.text).join(' ')).toMatch(/ficha/i);
    expect(tourSteps('owner').map((s) => s.text).join(' ')).toMatch(/comiss/i);
    expect(tourSteps('receptionist').map((s) => s.text).join(' ')).toMatch(/completar/i);
  });
});
```

Run: `cd ui-tests && npx vitest run tours` → FAIL (módulo inexistente).

- [ ] **Step 2: `tours.ts`**

Create `frontend/oficinasync-web/src/lib/tours.ts`:

```ts
import type { Role } from "./me";

export const TOUR_VERSION = 1;

export type TourStep = { title: string; text: string; target?: string };

export const tourKey = (userId: number) => `oficinasync_tour_v${TOUR_VERSION}_${userId}`;

export const shouldShowTour = (storage: Pick<Storage, "getItem">, userId: number) =>
  storage.getItem(tourKey(userId)) === null;

export const markTourDone = (storage: Pick<Storage, "setItem">, userId: number) =>
  storage.setItem(tourKey(userId), "1");

export const resetTour = (storage: Pick<Storage, "removeItem">, userId: number) =>
  storage.removeItem(tourKey(userId));

const common: TourStep[] = [
  {
    title: "Bem-vindo ao OficinaSync",
    text: "Aqui você abre a OS, registra o serviço com fotos e o cliente acompanha por um link. Vamos ver o essencial em 1 minuto.",
  },
  {
    title: "Abrir uma OS",
    text: "Toque em \"Nova OS\". Se o cliente já foi embora, use a \"Abertura rápida\": só a placa é obrigatória, o resto você completa depois.",
    target: "[data-tour='new-os']",
  },
];

const byRole: Record<Role, TourStep[]> = {
  mechanic: [
    { title: "Registrar o serviço", text: "Dentro da OS, crie as etapas (diagnóstico, reparo...), tire fotos e explique com suas palavras. O cliente lê isso." },
    { title: "Peças usadas", text: "Em \"Peças e equipe\", registre as peças que você pegou no estoque (tire foto da caixa se não tiver código). No final, informe só o que realmente usou." },
    { title: "Quem ajudou", text: "Se um colega ajudou, marque quem ajudou, com o quê e quanto (%). O que sobrar fica com você — é a base da comissão." },
    { title: "Finalizar", text: "Quando terminar, toque em \"Finalizar OS\". O escritório recebe a ficha com tudo que precisa." },
  ],
  receptionist: [
    { title: "Completar dados", text: "OS aberta rápido fica com \"Dados pendentes\". Toque em \"Completar dados\" quando o cliente chegar ou ligar." },
    { title: "Ficha do escritório", text: "Em cada OS, abra a \"Ficha do escritório\": peças, serviços, equipe e anotações, prontos para copiar para o outro sistema." },
    { title: "Anotações internas", text: "Use as anotações do escritório para o que o cliente não pode ver (forma de pagamento, combinados)." },
    { title: "Link do cliente", text: "Copie o link da página do cliente e mande no WhatsApp para ele acompanhar o serviço." },
  ],
  owner: [
    { title: "Sua equipe", text: "Em \"Equipe\", convide cada funcionário por e-mail. Cada um tem a própria conta e vê só o que precisa." },
    { title: "Ficha do escritório", text: "Cada OS tem uma ficha com peças (código e foto da caixa), serviços, equipe e anotações — pronta para lançar no outro sistema." },
    { title: "Comissões", text: "Em \"Comissões\" você vê, por período, a porcentagem de cada funcionário nas OS concluídas." },
    { title: "Responsável da OS", text: "Quem abre a OS é o responsável e distribui as porcentagens. Você pode trocar o responsável ou ajustar tudo pela tela de Peças e equipe." },
  ],
};

export function tourSteps(role: Role): TourStep[] {
  return [...common, ...byRole[role]].slice(0, 6);
}
```

Run: `cd ui-tests && npx vitest run tours` → Expected: PASS (confira que `[...common, ...byRole[role]]` fica entre 4 e 6: 2 + 4 = 6 ✓).

- [ ] **Step 3: Componentes**

Create `frontend/oficinasync-web/src/components/guide/GuidedTour.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tours";

type Props = { steps: TourStep[]; open: boolean; onClose: () => void };

/** Passo a passo simples: cartão fixo embaixo; se o passo aponta um elemento da tela, ele ganha um contorno. */
export function GuidedTour({ steps, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];

  useEffect(() => {
    if (!open || !step?.target) return;
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add("ring-4", "ring-lime-400", "ring-offset-2", "ring-offset-black", "rounded-lg");
    return () => el.classList.remove("ring-4", "ring-lime-400", "ring-offset-2", "ring-offset-black", "rounded-lg");
  }, [open, step]);

  if (!open || !step) return null;

  const last = index === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-label="Passo a passo"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-lime-400/40 bg-neutral-950 p-4 text-white shadow-2xl"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-lime-400">
        Passo {index + 1} de {steps.length}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-white/80">{step.text}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="text-sm text-white/60 hover:text-white" onClick={onClose}>
          Pular
        </button>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="outline" className="h-10" onClick={() => setIndex(index - 1)}>
              Voltar
            </Button>
          )}
          <Button
            className="h-10 bg-lime-400 text-black hover:bg-lime-300"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? "Entendi, vamos lá" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Create `frontend/oficinasync-web/src/components/guide/HelpHint.tsx`:

```tsx
import { useState } from "react";

/** Botãozinho "?" que abre uma dica curta em linguagem de oficina (funciona no toque, sem hover). */
export function HelpHint({ text, label = "Ajuda" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground"
      >
        ?
      </button>
      {open && (
        <span role="note" className="absolute left-0 top-6 z-50 w-64 rounded-xl border border-border bg-card p-3 text-xs font-normal text-foreground shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Teste de tela (vermelho)** — acrescentar ao `dados-internos.spec.ts`:

```ts
test('passo a passo: aparece no primeiro acesso, não volta depois, e dá pra rever em Configurações', async ({ page }) => {
  await page.goto('/dashboard');
  const tour = page.getByRole('dialog', { name: 'Passo a passo' });
  await expect(tour).toBeVisible();
  await expect(tour.getByText(/Passo 1 de/)).toBeVisible();

  await tour.getByRole('button', { name: 'Próximo' }).click();
  await expect(tour.getByText(/Passo 2 de/)).toBeVisible();
  await tour.getByRole('button', { name: 'Pular' }).click();
  await expect(tour).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Passo a passo' })).toHaveCount(0);

  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Rever passo a passo' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('dialog', { name: 'Passo a passo' })).toBeVisible();
});

test('dicas "?" explicam peça usada x retirada e a divisão da equipe', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);
  await page.getByRole('button', { name: 'Ajuda: peças retiradas e usadas' }).click();
  await expect(page.getByRole('note')).toContainText('realmente usou');
});
```

Atenção: todos os testes anteriores do arquivo abrem `/dashboard` e agora o tour apareceria por cima (cartão fixo embaixo, não bloqueia cliques no topo, mas pode cobrir). Para não quebrar as demais specs, no `global-setup.ts` pré-marque o tour como concluído para o dono e o mecânico no `localStorage` dos `storageState` (chave `oficinasync_tour_v1_<userId>`): o `global-setup` já faz login — ler `/users/me` com o token e acrescentar `{ name: 'oficinasync_tour_v1_' + me.user_id, value: '1' }` ao array `localStorage` de cada state. Só o teste do tour limpa essa chave (`page.evaluate(() => localStorage.removeItem(...))` antes do `goto`) — ajuste o primeiro teste acima: no início, `await page.goto('/configuracoes'); await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('oficinasync_tour_')).forEach((k) => localStorage.removeItem(k)));` e então `await page.goto('/dashboard');`.

Run: `cd ui-tests && npx playwright test e2e/dados-internos.spec.ts -g "passo a passo|dicas"` → FAIL.

- [ ] **Step 5: Ligar no app**

Em `dashBoardPage.tsx`: importar `GuidedTour`, `tourSteps`, `shouldShowTour`, `markTourDone` e `useMe`; no componente:

```tsx
  const { me: meForTour } = useMe();
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (meForTour && shouldShowTour(localStorage, meForTour.user_id)) setTourOpen(true);
  }, [meForTour]);
```

e, no JSX (junto do fim do retorno principal): 

```tsx
      {meForTour && (
        <GuidedTour
          steps={tourSteps(meForTour.role)}
          open={tourOpen}
          onClose={() => {
            markTourDone(localStorage, meForTour.user_id);
            setTourOpen(false);
          }}
        />
      )}
```

Marque o botão de nova OS do dashboard com `data-tour="new-os"` (localize o botão que navega para `/os-client-create`).

Em `SettingsPage.tsx`: importar `useMe`, `resetTour`, `useNavigate` (se ainda não) e acrescentar um card/botão:

```tsx
        <Button
          variant="outline"
          onClick={() => {
            if (me) resetTour(localStorage, me.user_id);
            navigate("/dashboard");
          }}
        >
          Rever passo a passo
        </Button>
```

Dicas (`HelpHint`): em `PartsSection.tsx`, no `<h2>Peças</h2>` acrescentar `<HelpHint label="Ajuda: peças retiradas e usadas" text="Registre as peças que você pegou no estoque. No final, informe só o que realmente usou — o escritório lança só o que foi usado. Sem código? Tire foto da caixa." />`; em `TeamSection.tsx` no título: `<HelpHint label="Ajuda: equipe" text="Marque quem ajudou, com o quê e quanto da OS (%). A sua parte é o que sobra. Isso vira a base da comissão." />`; em `CompleteDataSheet.tsx` no título: `<HelpHint label="Ajuda: dados pendentes" text="A OS foi aberta rápido. Preencha o que tiver agora; o sistema só deixa finalizar com tudo preenchido." />`. (Importe `HelpHint` em cada um.)

- [ ] **Step 6: Rodar e ver passar; commit**

Run: `cd frontend/oficinasync-web && npx tsc -b 2>&1 | grep -c error; cd ../../ui-tests && npm run test:unit && npx playwright test`
Expected: tsc 0; Vitest verde; Playwright todos verdes.

```bash
git add frontend/oficinasync-web/src/lib/tours.ts frontend/oficinasync-web/src/components/guide frontend/oficinasync-web/src/pages/dashBoardPage.tsx frontend/oficinasync-web/src/pages/SettingsPage.tsx frontend/oficinasync-web/src/components/internal frontend/oficinasync-web/src/components/os/CompleteDataSheet.tsx ui-tests/unit/tours.test.ts ui-tests/e2e/dados-internos.spec.ts ui-tests/e2e/global-setup.ts
git commit -m "feat: passo a passo guiado no primeiro acesso (por perfil) e dicas '?' nos pontos que confundem

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Documentação e verificação final

**Files:** Modify: `CLAUDE.md`

- [ ] **Step 1: Documentar no `CLAUDE.md`** (antes de `### Agentes por área`), em português, no mesmo estilo das outras seções:

```markdown
### Dados internos da OS + ficha do escritório + equipe/comissão + passo a passo (feito)

Pedido do Leonardo pro teste na Lima com todos os funcionários: o escritório monta a OS formal/nota em OUTRO sistema, então precisa receber do mecânico peças (código, quantidade, preço, foto da caixa), serviços e a divisão de comissão. Spec: `docs/superpowers/specs/2026-10-17-dados-internos-e-ficha-do-escritorio-design.md`; plano: `docs/superpowers/plans/2026-10-17-dados-internos-e-ficha-do-escritorio.md`.

- **Tudo é interno**: `InternalModule` (`backend/src/modules/internal/`) com rotas próprias `/service_orders/:id/{internal,parts,services,participants,responsible,office-sheet}`, `/commissions`, `/users/team`. `GET /service_orders/:id`, a rota pública e o laudo **não conhecem** esses dados; `no-leak.spec.ts` trava isso (arquivos do laudo/rota pública não podem referenciar as entidades internas) e `internal-sheet.e2e-spec.ts` varre as respostas com valores-sentinela.
- **Perfis:** dono e recepção = escritório (veem/editam tudo); mecânico vê só o dele. `permissionsFor(viewer, orderDone)` (`internal-access.ts`) é a fonte única. Responsável = `responsible_user_id ?? user_id` (quem abriu; o escritório troca). Mecânico comum recebe só a PRÓPRIA linha da equipe na API.
- **Equipe em %:** ajudantes 1–99 cada, soma ≤ 99, responsável fica com `100 − soma` (não é digitado). Substitui a lista inteira (`PUT /participants`). Comissão só em % (a OS não tem preço; R$ vem com o orçamento digital).
- **Peças:** retiradas × usadas (`used_quantity` null = sem acerto, ≤ retirada), preço opcional (null = "preço não informado"), foto da caixa interna (`photo_*` na própria peça, **entra na cota** — `MediaService.getTenantUsageBytes` soma). Acerto pendente NÃO bloqueia finalizar (aparece em amarelo na ficha). Após finalizar, só o escritório edita peças/serviços/equipe.
- **Ficha** (`/os/:id/ficha`): escritório + responsável; copiar por bloco/tudo (`sheetToText`), imprimir via `window.print()`; todo texto é escapado pelo React. Telas: `OsOfficePage` (`/os/:id/escritorio`), `CommissionsPage` (`/comissoes`).
- **Didático:** `GuidedTour` + `tours.ts` (por perfil, `localStorage` por usuário e versão; "Rever passo a passo" em Configurações), `HelpHint` ("?"). Menu: Scanner só com `VITE_FEATURE_OBD=true`; Equipe só pro dono.
- **Gotchas:** `@IsOptional()` deixa `null` passar — nos PATCH de peça/serviço `null` em `code/used_quantity/unit_price/price` significa LIMPAR; `decimal` do SQL Server volta string (usar `decimalTransformer`); testes e2e criam funcionários com `createStaff` (token assinado direto, sem `/auth/login` que tem limite de 5/min); o ambiente de teste manual (`start-env.sh`) precisa estar parado antes do Playwright.
- **Pré-requisitos pra usar na Lima:** deploy da versão atual (produção está na antiga), e-mail de convite funcionando (SPF/DKIM) e backup mínimo — ver `docs/equipe/lancamento-publico/`.
```

- [ ] **Step 2: Verificação do zero**

Run:
```bash
cd backend && npm test && npm run test:e2e && npm run build
cd ../ui-tests && npm run test:unit && npx playwright test
cd ../frontend/oficinasync-web && npx tsc -b && npm run build
```
Expected: tudo verde (unit backend ≈ 33+, e2e todas as suítes incluindo 4 novas, Vitest +3 arquivos, Playwright com os 3 specs).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: dados internos da OS, ficha do escritorio, equipe/comissao e passo a passo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review (feita ao escrever)

- **Cobertura do spec:** §3 rulings R1–R7 → Tasks 3 (R2/R3), 4 (R6), 5 (R1/R4/R5), 6/9 (R7). §4 modelo → Task 1. §5 API → Tasks 2–6 (todas as rotas da tabela: internal, notes, parts CRUD, photo, services CRUD, participants, responsible, office-sheet, commissions, users/team). §6 ficha → Tasks 6 (backend) e 9 (tela). §7 comissões → Tasks 5 e 10. §8 didático (tour, dicas, limpeza do menu, texto do scanner) → Tasks 10–11. §9 segurança (tenant, vazamento, escape, upload, só a própria linha) → Tasks 2–6, 9. §10 pré-requisitos → Task 12 (doc). §12 testes → cada task. §13 ordem → backend (1–6) antes do frontend (7–11); a fatia 1 do spec (peças+ficha) fica pronta ao fim da Task 9 e a fatia 2 (equipe/comissões) está distribuída (backend na 5; telas nas 8 e 10) — decisão de ordem registrada: backend completo primeiro porque as telas dependem de todas as rotas.
- **Placeholders:** nenhum. Pontos "ajuste se o compilador reclamar" são verificações reais de nome de campo da entidade existente (Task 6) e de `@Type(() => Number)` com `null` (Task 3), com a correção indicada.
- **Consistência de nomes:** `permissionsFor/Viewer/Permissions`, `OrderContext`, `PartView/ServiceView/ParticipantView`, `InternalData`, `OfficeSheet`, `itemTotals/lineTotal/commissionTotals`, `createStaff/createStaffRecords/openOrderAs`, rotas e `aria-label`s iguais entre backend, componentes e specs de tela (`Ajudou: <nome>`, `Tarefa de`, `Porcentagem de`, `Quantidade usada de`, `Preço unitário de`, `Ajuda: …`).
- **Risco conhecido:** o `migration:generate` pode precisar de ajuste manual (Task 1, Step 7); a ordem dos controllers no Nest (`users/team` × `UsersController`) é conferida no teste da Task 2; o estado `mechanic.json` aumenta os logins do `global-setup` (2 + 2 do `login.spec` = 4/min, dentro do limite de 5).
