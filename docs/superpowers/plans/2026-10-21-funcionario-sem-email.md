# Funcionário sem e-mail (convite WhatsApp + PIN): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:**
- O dono cadastra um funcionário com nome, celular e cargo.
- O funcionário recebe um link de uso único (WhatsApp, QR ou copiar), cria um PIN de 6 dígitos e passa a entrar com celular + PIN.
- O dono gera um novo acesso ou desativa o funcionário.

**Arquitetura:**
- O convite (`invites`) passa a aceitar celular no lugar do e-mail.
- `users` ganha `phone`, `pin_hash`, contador de erros e trava; e-mail e senha viram opcionais.
- Regras puras de PIN (fraco/trava) num arquivo testado à parte.
- O `JwtAuthGuard` confere `is_active` em toda requisição de escopo `access`.
- O QR é gerado no backend (pacote `qrcode`, já instalado), porque o `package.json` do frontend não pode ser mexido.

**Stack:** NestJS + TypeORM (mssql), React + Vite, Jest/e2e (backend), Vitest + Playwright (`ui-tests`).

**Spec:** `docs/superpowers/specs/2026-10-21-funcionario-sem-email-design.md`

## Restrições globais
- **Convite:** token `randomBytes(32).hex`, uso único, **expira em 24 h**; só o **dono** cria.
- **PIN:** exatamente 6 dígitos. Recusar todos iguais, sequências (123456, 654321, 012345…) e a lista comum (121212, 112233, 123123, 696969, 101010, 000000).
- **Hash do PIN:** Argon2id + `PASSWORD_PEPPER`, como a senha.
- **Trava:** 5 PINs errados seguidos → conta travada por **15 min**. O login por PIN tem limite de 5/min por IP.
  - Mesma mensagem pra celular inexistente e PIN errado: **"Celular ou PIN inválidos."**
  - Com a trava ativa, a mensagem é: "Muitas tentativas. Tente de novo às HH:MM ou peça um novo acesso ao dono."
- **Índices únicos filtrados** (`WHERE ... IS NOT NULL`) pra `email` e `phone`. No SQL Server, um único normal só aceita um NULL.
- **Celular** guardado em E.164 (`+5514999990000`).
- **Desativar** corta o acesso na hora, inclusive de token já emitido.
- O dono não se desativa; o funcionário desativado não ganha "novo acesso".
- Todo campo de DTO com decorator do class-validator.
- **Nunca commitar:** `frontend/oficinasync-web/package*.json`, `src/main.tsx`, `src/lib/nativeShell.ts`, `mobile/`, `.claude/launch.json`, `Laudo_Fox_2018_FXU1059.pdf`.

## Pontos de atenção na revisão
1. **Login por e-mail de quem só tem PIN** (`password_hash` NULL) deve dar "Usuario ou senha invalidos!", nunca 500. *(teste na Task 4)*
2. **Token antigo depois de "Novo acesso":** o link novo invalida o anterior, que ainda não foi usado. *(teste na Task 3)*
3. **Celular já cadastrado em outro usuário** (mesma oficina ou outra) → 409 na criação do convite, sem revelar de quem é. *(teste na Task 3)*
4. **Token de onboarding** (cadastro de dono, usuário ainda inativo) não pode ser barrado pela checagem nova de `is_active`. *(teste na Task 5)*
5. **Convite de e-mail antigo** (fluxo atual) continua funcionando com senha. *(teste na Task 3)*

---

### Task 1: regras puras do PIN

**Arquivos:**
- Criar: `backend/src/modules/users/pin-policy.ts`
- Testar: `backend/src/modules/users/pin-policy.spec.ts`

**Interfaces:**
- Produz:
  - `isWeakPin(pin: string): boolean`
  - `PIN_MAX_ATTEMPTS = 5`
  - `PIN_LOCK_MS = 15 * 60 * 1000`
  - `registerPinFailure(attempts: number, now: Date): { attempts: number; lockedUntil: Date | null }` (na 5ª falha devolve `attempts: 0` e `lockedUntil = now + 15 min`)
  - `isPinLocked(lockedUntil: Date | null, now: Date): boolean`

- [ ] Escrever o teste:
  - fracos: `000000`, `111111`, `123456`, `654321`, `012345`, `121212`, `112233`, `123123`;
  - fortes: `482915`, `907364`;
  - `12345` e `12345a` → fracos (formato inválido);
  - 4 falhas → `{attempts: 4, lockedUntil: null}`;
  - 5ª falha → `lockedUntil` = agora + 15 min;
  - `isPinLocked` true antes e false depois.
- [ ] Rodar `cd backend && npx jest src/modules/users/pin-policy.spec.ts` → falha (módulo não existe).
- [ ] Implementar e rodar de novo → passa.
- [ ] Commit `feat(equipe): regras do PIN (fraco e trava)`.

### Task 2: banco (migration + entidades)

**Arquivos:**
- Modificar: `backend/src/modules/users/users.entity.ts`, `backend/src/modules/invites/invites.entity.ts`
- Criar: `backend/src/migrations/1792700000000-StaffPinLogin.ts`

**Interfaces:**
- Produz:
  - **`Users`:** `email: string | null`, `password_hash: string | null` (`select:false`), `phone: string | null` (varchar 20), `pin_hash: string | null` (`select:false`), `failed_pin_attempts: number` (default 0), `pin_locked_until: Date | null`.
  - **`Invites`:** `email: string | null`, `phone: string | null`, `name: string | null`, `target_user` (ManyToOne `Users`, `target_user_id` nullable; preenchido = convite de "novo acesso").

- [ ] Escrever a migration à mão:
  - **`users`:**
    - dropar o UQ do e-mail, procurando o nome em `sys.key_constraints` (não fixar o nome);
    - `ALTER COLUMN email nvarchar(100) NULL` e `password_hash varchar(150) NULL`;
    - adicionar `phone`, `pin_hash varchar(150) NULL`, `failed_pin_attempts int NOT NULL DEFAULT 0`, `pin_locked_until datetime2 NULL`;
    - `CREATE UNIQUE INDEX "UQ_users_email" ON users(email) WHERE email IS NOT NULL` e o mesmo pra `phone`.
  - **`invites`:** `email` NULL, `phone varchar(20) NULL`, `name nvarchar(150) NULL`, `target_user_id int NULL` + FK pra `users`.
  - **`down()`:** desfaz tudo.
- [ ] Rodar `cd backend && npm run build && npm run test:e2e`. As migrations rodam no banco de teste e a suíte atual continua toda verde.
- [ ] Commit `feat(equipe): banco aceita funcionário só com celular e PIN`.

### Task 3: convite por celular, aceitar com PIN e novo acesso

**Arquivos:**
- Modificar:
  - `backend/src/modules/invites/{invites.service.ts,invites.controller.ts,dto/create-invite.dto.ts,dto/accept-invite.dto.ts,dto/response-invite.dto.ts}`
  - `backend/src/modules/users/users.service.ts`
- Testar: `backend/test/staff-pin.e2e-spec.ts`

**Interfaces:**
- **`POST /invites`** `{ name?, email?, phone?, role }`:
  - exige `email` OU `phone`;
  - com `phone` exige `name`;
  - devolve `{ message, link, qr_data_url, expires_at }`. O `link` é `${FRONTEND_URL}/convite?token=…`. Convite por celular expira em 24 h (o de e-mail continua 7 dias).
- **`POST /invites/access-link`** `{ user_id }`:
  - só o dono; mesmo tenant; o alvo precisa estar ativo e ter `phone`;
  - invalida (marca `used_at`) os convites de acesso pendentes desse usuário;
  - devolve o mesmo formato.
- **`GET /invites/:token`** devolve `{ email, phone, name, role, tenant_name, kind: 'email' | 'phone' | 'access' }`.
- **`POST /invites/accept`** `{ token, name?, password?, pin? }`:
  - convite de e-mail exige `password`;
  - convite de celular ou de acesso exige `pin` válido e não fraco (400 "PIN fácil demais…");
  - o de acesso troca o `pin_hash` do alvo e zera a trava;
  - devolve `{ access_token }`.
- **`UsersService.createFromPhoneInvite(name, phone, pin, tenant, role): Promise<Users>`** e **`UsersService.setPin(userId, pin): Promise<void>`**.

- [ ] Escrever o e2e (helpers `createTestApp`, `createTenantWithOwner`, `createStaff`):
  - **Convite por celular:**
    - o dono convida `{name:'Toninho', phone:'+5514999990001', role:'mechanic'}` → 201 com `link` contendo `/convite?token=` e `qr_data_url` começando com `data:image/png`;
    - o preview tem `kind:'phone'`;
    - aceitar com `pin:'123456'` → 400;
    - aceitar com `pin:'482915'` → 201 com `access_token`;
    - `/users/me` → nome Toninho, e-mail null;
    - reusar o token → 401.
  - **Restrições:**
    - mecânico tentando convidar → 403;
    - o mesmo celular de novo → 409 com a mensagem "Esse celular já está cadastrado.";
    - dois funcionários sem e-mail coexistem (dois convites por celular diferentes, aceitos).
  - **Novo acesso:**
    - o dono pede pro Toninho → link1;
    - pede de novo → link2;
    - aceitar o link1 → 401;
    - aceitar o link2 com `pin:'907364'` → 201.
  - **Outra oficina:**
    - o dono da oficina B pede acesso do Toninho → 403;
    - o dono pede acesso de um usuário sem celular → 400.
  - **E-mail:** o convite por e-mail continua funcionando com senha forte.
- [ ] Rodar `npm run test:e2e -- staff-pin` → falha.
- [ ] Implementar e rodar de novo → passa. Depois, a suíte e2e inteira.
- [ ] Commit `feat(equipe): convite por celular com PIN e novo acesso`.

### Task 4: entrar com celular + PIN

**Arquivos:**
- Modificar: `backend/src/modules/AuthModule/{authModule.controller.ts,authService.service.ts}`, `backend/src/modules/users/users.service.ts`
- Criar: `backend/src/modules/AuthModule/dto/pin-login.dto.ts`
- Testar: `backend/test/staff-pin.e2e-spec.ts` (novo `describe`)

**Interfaces:**
- **`POST /auth/pin-login`** `{ phone, pin }`:
  - `@Throttle` 5/min;
  - devolve `{ access_token }`, com payload `{ sub, email: null, scope: 'access' }`.
- **`UsersService.findPinUser(phone)`:** busca com `addSelect('user.pin_hash')`.

- [ ] Escrever os testes:
  - PIN certo → 201;
  - celular inexistente e PIN errado → 401 com a mesma mensagem "Celular ou PIN inválidos.";
  - 5 erros seguidos → a 6ª tentativa, mesmo com o PIN certo, dá 401 "Muitas tentativas…";
  - depois de `UPDATE users SET pin_locked_until = DATEADD(minute,-1,pin_locked_until)` o PIN certo entra e o contador zera;
  - usuário desativado → 401;
  - `POST /auth/login` com o e-mail de um usuário sem senha → 401 "Usuario ou senha invalidos!" (sem 500).
  - **Usar IPs diferentes (`X-Forwarded-For`)** pra não bater no limite por IP.
- [ ] Rodar → falha.
- [ ] Implementar. O `login` por e-mail trata `password_hash` nulo como falha.
- [ ] Rodar → passa.
- [ ] Commit `feat(auth): entrar com celular e PIN, com trava`.

### Task 5: desativar/reativar + guard conferindo `is_active`

**Arquivos:**
- Modificar: `backend/src/modules/AuthModule/jwt-auth.guard.ts`, `backend/src/modules/users/{users.controller.ts,users.service.ts}`
- Testar: `backend/test/staff-pin.e2e-spec.ts` (novo `describe`)

**Interfaces:**
- **`GET /users/members`** (só o dono): `[{ user_id, name, role, email, phone, is_active, created_at }]` da oficina, incluindo os inativos.
- **`PATCH /users/:id/active`** `{ active: boolean }`:
  - só o dono; mesmo tenant;
  - não pode ser o próprio dono (400);
  - devolve o membro.
- **`JwtAuthGuard`:** pra escopo `access`, consulta `users.is_active` via `DataSource` (`SELECT is_active FROM users WHERE user_id=@0`). Se inativo ou inexistente → 401 "Acesso desativado.".

- [ ] Escrever os testes:
  - o dono lista membros (vê o Toninho com `phone`);
  - mecânico em `/users/members` → 403;
  - o dono desativa o Toninho → o token **já emitido** do Toninho em `/users/me` → 401;
  - reativa → 200;
  - o dono se desativando → 400;
  - o dono da outra oficina desativando o Toninho → 403;
  - o token de onboarding (`POST /auth/register`) ainda consegue `POST /tenants`.
- [ ] Rodar → falha.
- [ ] Implementar e rodar → passa. Depois, a suíte e2e inteira (o guard roda em tudo).
- [ ] Commit `feat(equipe): desativar funcionário corta o acesso na hora`.

### Task 6: telas (equipe, aceitar convite, login)

**Arquivos:**
- Criar: `frontend/oficinasync-web/src/lib/pin.ts` (`isWeakPin`, espelho da Task 1)
- Modificar:
  - `frontend/oficinasync-web/src/pages/{TeamPage.tsx,AcceptInvitePage.tsx,LoginPage.tsx}`
  - `frontend/oficinasync-web/src/lib/whatsapp.ts` (adicionar `whatsappInviteUrl(phoneE164, name, tenantName, link)`)
- Testar: `ui-tests/unit/pin.test.ts`, `ui-tests/e2e/funcionario-pin.spec.ts`

**Interfaces (telas, kit Cinema Escuro, alvos ≥ 48px):**
- **`TeamPage`:**
  - "Adicionar funcionário": nome, celular (`PhoneField`), cargo, e-mail opcional;
  - depois de criar, folha "Mande o acesso pro Toninho" com o botão **"Mandar no WhatsApp"** (`whatsappInviteUrl`), o **QR** (`<img src={qr_data_url}>`), "Copiar link" e "vale por 24 horas";
  - lista **"Funcionários"** (`GET /users/members`): nome, cargo, celular ou e-mail, selo "Desativado", e os botões "Novo acesso" (mesma folha) e "Desativar"/"Reativar" (confirmação);
  - a lista de convites atual continua embaixo.
- **`AcceptInvitePage`:** com `kind` `phone`/`access`, mostra o nome (editável só em `phone`), "Crie seu PIN de 6 números" e "Repita o PIN" (`inputMode="numeric"`, `maxLength 6`), com o aviso de PIN fácil antes de enviar. O `kind:'email'` continua como hoje.
- **`LoginPage`:**
  - abas "Entrar com celular" / "Entrar com e-mail";
  - a escolhida fica em `localStorage` `oficinasync_login_mode` (com try/catch);
  - celular (`PhoneField`) + PIN → `POST /auth/pin-login`;
  - erro visível.

- [ ] Escrever o `ui-tests/unit/pin.test.ts` (mesmos casos da Task 1) e o `ui-tests/e2e/funcionario-pin.spec.ts`:
  - o dono adiciona "Toninho" com celular;
  - a folha mostra "Mandar no WhatsApp" com `href` começando por `https://wa.me/55…` e o QR visível;
  - abrir o link em contexto novo (sem login): PIN `123456` mostra o aviso; PIN `482915` + repetir entra no dashboard;
  - sair → login "Entrar com celular" com o celular e `482915` → dashboard;
  - o dono desativa o Toninho → o login dele mostra o erro.
- [ ] Rodar `cd ui-tests && npx vitest run unit/pin.test.ts && npx playwright test e2e/funcionario-pin.spec.ts` → falha.
- [ ] Implementar.
- [ ] Rodar → passa. Depois a bateria inteira (`npm run test:unit`, `npx playwright test`) e o `npm run build` no frontend.
- [ ] Commit `feat(equipe): telas do funcionário sem e-mail (WhatsApp, QR, PIN)` e atualizar o CLAUDE.md.
