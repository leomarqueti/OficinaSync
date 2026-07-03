# OficinaSync — Contexto do Projeto

## O que é

OficinaSync é um SaaS multi-tenant para gestão de oficinas mecânicas, com foco em **transparência ao cliente**. O diferencial é uma página pública personalizada onde o cliente acompanha o serviço em tempo real com fotos, vídeos, áudios e explicações do mecânico — como um "storytelling" do reparo.

Dono do projeto: Leonardo (mecânico há 11 anos, formado em ADS). Objetivo atual: rodar o sistema na própria oficina (Lima Auto Elétrica, Tupanciretã-SP) e depois evoluir. **Não é mais TCC** — é produto real.

## Stack

**Backend:**

- NestJS + TypeScript
- TypeORM + SQL Server 2022
- JWT (dois escopos: `onboarding` para cadastro em duas etapas e `access` para login normal)
- Argon2id + pepper (hash de senha)
- MinIO (storage de mídias, self-hosted)
- Resend (envio de email de verificação)
- `class-validator` + `validation-br` (validação de CNPJ, CPF)

**Frontend web:**

- React + Vite + TypeScript
- shadcn/ui + Tailwind
- Tema dark/light, cor de destaque `lime-400` (#A3E635)
- Estado local via `localStorage` (débito técnico: migrar para Context global futuramente)

**IoT (OBD):**

- ESP32 + ELM327 (dongle Bluetooth)
- Firmware em C++ com WebServer, BluetoothSerial, Preferences (NVS)
- Serve dados via HTTP local: `/data`, `/snapshot.json`, `/dtc`, etc.

**Mobile:** ainda não iniciado.

## Arquitetura de banco (11 tabelas principais)

1. `tenants` — oficinas cadastradas (PK: `id`, nota: divergente do padrão)
2. `users` — usuários vinculados a um tenant (`tenant_id` nullable até completar cadastro)
3. `email_verifications` — tokens de verificação de email (1:N com users)
4. `clients` — clientes da oficina
5. `cars` — veículos, pertencem a clientes
6. `service_orders` — ordens de serviço, têm `public_token` único para acesso do cliente
7. `sections` — etapas da OS (checkin, obd_scan, diagnosis, repair, preventive, final)
8. `medias` — mídias vinculadas a sections (foto, vídeo, áudio)
9. `obd_devices` — dispositivos ESP32 vinculados ao tenant (entidade recém-criada, ainda sem rotas)
10. `obd_readings` — leituras OBD (ainda não implementado)
11. `dtc_codes` — códigos de falha (ainda não implementado)
12. `tests` — testes estruturados do mecânico (bateria, compressão, vazão de bicos, leitura de scanner etc.), vinculados a `sections`. Modelo genérico: `title` livre + `measurements` (JSON, lista de `{label, expected?, actual}`) + `verdict` (`approved`/`failed`/`inconclusive`) + `notes`. Cobre inclusive a leitura de códigos de falha do scanner (um teste "Leitura de scanner" com uma linha por código), então não existe entidade `dtc_codes` separada na prática — o item 11 acima ficou obsoleto por esse motivo.

**Convenções importantes:**

- Todas as PKs são `<entity>_id` **exceto** `tenants.id` (inconsistência histórica)
- Enums validados via `@Check` no SQL Server (não usar `enum:` no `@Column` porque SQL Server não suporta bem)
- Nenhum enum com múltiplos CASCADE (SQL Server não permite múltiplos caminhos de cascade)
- Padrão de relação: `@ManyToOne` no lado da FK com `@JoinColumn({ name: 'x_id' })`, `@OneToMany` no lado inverso

## Fluxo principal (o que já funciona ponta a ponta)

1. **Cadastro em duas etapas:**
   - `POST /auth/register` cria user (Argon2id, `is_active: false`), gera token de verificação de email, retorna `onboarding_token` JWT com scope `onboarding` (expira em 15 min)
   - `POST /tenants` (protegido por JwtAuthGuard) cria oficina, vincula ao user via `updateTenantId`, envia email via Resend
   - `GET /auth/verify-email?token=` ativa o user
2. **Login:** `POST /auth/login` retorna `access_token` JWT com scope `access`
3. **Abertura de OS:**
   - `POST /clients` cria cliente
   - `POST /cars` cria veículo vinculado ao cliente
   - `POST /service_orders` cria OS com `public_token` gerado via `randomBytes(32).hex`
4. **Storytelling (tela do mecânico):**
   - `POST /sections` cria etapa em `status: draft`
   - `POST /medias` faz upload no MinIO e cria registro de mídia
   - `PATCH /sections/:id/publish` muda status para `published`, seta `published_at` e `published_by`
5. **Página do cliente:**
   - `GET /service_orders/public/:token` (rota pública, sem JWT) retorna só sections publicadas com presigned URLs do MinIO
6. **Finalizar OS:**
   - `PATCH /service_orders/:id/finish` seta `status: done` e `finished_at: new Date()`

## Módulos e serviços do backend

### `AuthModule`

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/verify-email`
- `JwtAuthGuard` (CanActivate) verifica Bearer token
- **IMPORTANTE:** `JwtModule` deve ser importado configurado do `AuthModule`, nunca vazio em outros módulos (bug histórico que quebrou `ServiceOrdersModule` no início do projeto)

### `TenantsModule`

- `POST /tenants` (protegido, scope: onboarding)
- Validação de CNPJ via `@ValidatorConstraint` custom + `validation-br`

### `UsersModule`

- Hash de senha com Argon2id + pepper vindo do `.env` via `ConfigService`
- `findHashPassword` usa `createQueryBuilder` com `addSelect` no `password_hash` (que tem `select: false` na entidade)

### `ClientsModule`, `CarsModule`, `ServiceOrdersModule`

- Padrão: `create` recebe `userId` do token (`req.user.sub`), busca `user.tenant`, valida tenant matching (comparar IDs, não referências), vincula
- Todos têm `findEntityById` (retorna entidade TypeORM crua para uso interno com `save`) e `findById` (retorna objeto mapeado para o frontend)

### `SectionsModule`

- `POST /sections`, `PATCH /sections/:id/publish`, `PATCH /sections/:id` (edita `notes`, implementado)
- `OneToMany` com `TestsModule` (etapa pode ter N testes estruturados)

### `TestsModule`

- `POST /tests`, `PATCH /tests/:id`, `DELETE /tests/:id` — testes estruturados vinculados a uma section (ver tabela `tests` acima)
- Aparecem tanto em `GET /service_orders/:id` (mecânico) quanto em `GET /service_orders/public/:token` (cliente, só para sections publicadas)
- **Fase 4 — tipos especializados:** além do genérico (`title` + `measurements[]`), a entidade `Tests` ganhou `test_type` (`compressao_mecanica`/`leitura_dtc`/`bateria`/`injetores_banco`, nullable — null = genérico) e `data` (JSON livre, schema específico por tipo). Validação do `data` é solta (`@IsObject()`, sem DTO por tipo) — débito técnico aceito por prazo, ver `frontend/oficinasync-web/src/components/tests/testTypes.ts` pros schemas TS de referência.
- Fotos por cilindro/injetor **não** criam uma relação nova — reaproveitam o `POST /medias` normal (mesmo `section_id`), o `media_id` retornado é guardado dentro do `data` do teste (ex: `data.cylinders[0].media_id`) e resolvido de volta pra URL via lookup em `section.medias` no frontend, ou via `Map<media_id, base64>` no `ReportService` pro PDF.
- Outros ~46 tipos do spec `oficinasync_testes_spec.md` continuam cobertos pelo formulário genérico (sem UI dedicada) até serem priorizados.

### `MediasModule` + `MinioModule`

- `MinioService` com `OnModuleInit` (cria bucket se não existir)
- Upload valida mime type via `fileTypeFromBuffer` + whitelist
- Object name gerado como `orders/{uuid}.{ext}`
- `getPresignedUrl(objectName, expiresInSeconds = 3600)` gera URL assinada de 1h
- `getObjectBuffer(objectName)` baixa o objeto como Buffer (usado pelo `ReportModule` para embutir fotos em base64 no PDF)
- `uploadBuffer(buffer, mimeType, extension)` sobe um buffer gerado localmente (usado pelo `VideoModule` para subir o vídeo final do ffmpeg, que não vem de um upload HTTP)
- **Whitelist atual:** photo, video, audio. **Pendente:** aceitar `application/pdf` (só necessário se decidirmos persistir o laudo gerado como `Media` — hoje ele é gerado sob demanda e não é salvo)

### `ReportModule`

- `GET /service_orders/:id/report.pdf` (protegido, valida tenant) — gera o laudo técnico em PDF sob demanda via Puppeteer (HTML/CSS → PDF), não persiste no MinIO
- Reaproveita `tests` (viram o "procedimento realizado" numerado, com veredito e resumo técnico auto-gerado) e `medias` do tipo foto (embutidas em base64, mídia ausente no storage não derruba a geração — só é omitida)
- Testes dos 4 tipos especializados (Fase 4) ganham bloco próprio no PDF (grade de fotos por cilindro, tabela de DTC colorida, cards de métricas da bateria, tabela antes/depois dos injetores) — despacho por `test_type` em `renderProcedureSteps` (`report.template.ts`); fotos referenciadas em `data` (não capturadas pelo scan genérico de `medias`) não duplicam na galeria "Registro fotográfico" (deduplicadas via `claimedMediaIds` em `report.service.ts`)
- Campos de fechamento em `ServiceOrders`: `root_cause`, `conclusion`, `final_verdict` (`resolved`/`not_resolved`/`partial`), preenchidos no `OsFinishPage` junto com o `PATCH /service_orders/:id/finish`
- Header/footer repetidos em toda página via `page.pdf({ displayHeaderFooter: true })` do Puppeteer

### `VideoModule`

- `POST /service_orders/:id/promo-video` (protegido, valida tenant, exige pelo menos 1 mídia tipo vídeo em alguma section) — dispara em fire-and-forget (retorna 202 na hora), processamento roda em background
- Campo `promo_video_status` em `ServiceOrders` (`none`/`processing`/`ready`/`failed`) — frontend faz polling de `GET /service_orders/:id` a cada 4s enquanto `processing`
- Pipeline (`fluent-ffmpeg` + `ffmpeg-static` + `ffprobe-static`, sem precisar instalar ffmpeg no SO): coleta os `medias` tipo vídeo de todas as sections na ordem visual (`checkin → diagnosis → repair → preventive → final`, pula `obd_scan`), normaliza cada clipe pra 1080x1920 vertical/30fps/h264+aac (detecta presença de áudio via ffprobe antes de normalizar), concatena via demuxer do ffmpeg, sobe o resultado via `MinioService.uploadBuffer`
- O vídeo final vira um `Media` (`label: 'Vídeo de divulgação'`) anexado à section `final` (criada automaticamente se ainda não existir, via `SectionsService.create`)
- Testado ponta a ponta com clipes sintéticos de resoluções diferentes (640x480 e 1280x720) — saída normalizada corretamente pra 1080x1920, áudio combinado, duração batendo com a soma dos clipes

### `ObdModule` (recém-criado, incompleto)

- Entidade `ObdDevices` criada (campos: device_id, name, device_token, mac_address, is_active, last_ip, last_seen_at, created_at, tenant)
- **Pendente:** rotas `POST /obd/heartbeat` (ESP32 registra IP) e `GET /obd/scan` (frontend puxa dados)
- **Pausado a pedido do Leonardo** — foco em testes estruturados/PDF/vídeo primeiro

## Frontend web (páginas já implementadas)

- `LoginPage`
- `RegisterUserPage`, `RegisterTenantPage`, `VerifyEmailPage`
- `DashboardPage` — lista OS abertas do tenant (via `GET /service_orders/orders`)
- `OsCreateClientPage`, `OsCreateCarPage`, `OsVehicleDefectPage`, `OsMediaDefectPage`, `OsVehicleEntryPhotosPage` — fluxo guiado de abertura de OS (5 passos)
- `OsWorkPage` — tela do mecânico: gerencia sections, mídias, testes (genéricos + 4 especializados), publica, finaliza OS, gera laudo PDF e vídeo de divulgação
- `OsFinishPage` — fechamento da OS: causa raiz, conclusão, veredito final, fotos de saída, baixar laudo PDF
- `PublicServiceOrderPage` (`/servico/:token`) — página pública do cliente, **reescrita como scrollytelling "Cinema Escuro"** (Fase 1 da reforma visual): hero full-screen animado, capítulos numerados revelados por scroll (relato → check-in → investigação → reparo → veredito → vídeo → fechamento com métricas), lightbox de mídia, mobile-first, `prefers-reduced-motion` respeitado
- `frontend/oficinasync-web/src/components/tests/` — módulo de testes especializados: `testTypes.ts` (schemas TS + labels/cores), `TestTypeSelector.tsx`, `TestFormShell.tsx` (wrapper compartilhado título/veredito/notas/salvar), `PhotoCaptureButton.tsx` (`capture="environment"` — abre câmera no celular, upload inline pro `/medias`), e um par Form+Card por tipo (`BateriaForm/Card`, `LeituraDtcForm/Card`, `CompressaoMecanicaForm/Card`, `InjetoresBancoForm/Card`)

### Reforma visual "Cinema Escuro" (em andamento, faseada)

Direção escolhida pelo Leonardo: fundo quase preto `#0a0a0a`, verde-limão `#A3E635` como assinatura, tipografia grande, storytelling por scroll. Plano completo em 5 fases (`~/.claude/plans/happy-sprouting-panda.md`).

- **Fundação (feita)**: tokens no `src/index.css` — o bloco `.dark` É a paleta Cinema Escuro (`--brand`, `--surface`, lime como `--primary`); páginas ativam com classe `dark` no root. Deps novas: `motion`, `sonner`, `react-hook-form`, `zod`. `src/lib/api.ts` agora exporta `apiFetch()` (Bearer automático + erro → toast sonner; `silent: true` pra tratar manualmente). `<Toaster />` montado no `App.tsx`. Primitivas em `src/components/motion/` (`Reveal`, `Stagger`/`StaggerItem`, `CountUp`, `Parallax`) e `src/components/media/Lightbox.tsx` — todas respeitam `prefers-reduced-motion`.
- **Fase 1 (feita)**: página do cliente reescrita (acima). Blocos de teste dark em `src/components/story/` (`StoryTestBlock` despacha por `test_type` → `StoryBateria`/`StoryCompressao`/`StoryDtc`/`StoryInjetores`, + tabela genérica; chips em `chips.tsx`/`statusMaps.ts`). Fotos com `onError` → somem em vez de mostrar ícone quebrado.
- **Fases pendentes**: 2 (OsWorkPage em componentes + sheets + toasts), 3 (wizard de criação de OS com máscaras CPF/telefone — dor explícita do Leonardo: telefone formata sozinho sem digitar +55, CPF avisa erro na hora), 4 (auth/dashboard sem dados fake + erro de login visível), 5 (PDF premium com QR code). As páginas antigas continuam claras até suas fases migrarem.

## Configuração (.env do backend)

```
JWT_SECRET=...
JWT_EXPIRES_IN=1d
JWT_ONBOARDING_EXPIRES_IN=900
PASSWORD_PEPPER=...
RESEND_KEY=...
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=oficinasync
DB_HOST=...
DB_PORT=1433
DB_USER=sa
DB_PASS=...
DB_NAME=...
FRONTEND_URL=http://localhost:5173
```

**ATENÇÃO:** hoje está com `synchronize: true` no TypeORM. Em produção precisa trocar por migrations antes de ir pro ar (risco aceito conscientemente no primeiro deploy, ver `DEPLOY.md`).

## Deploy em produção

- `DEPLOY.md` (raiz) — runbook completo: VPS (Hetzner/DigitalOcean), DNS (`oficinasync.com.br` + `api.oficinasync.com.br`), Docker, HTTPS automático via Caddy.
- `backend/Dockerfile` — multi-stage, Puppeteer usa Chromium do sistema (Debian, não o bundled) via `PUPPETEER_EXECUTABLE_PATH`.
- `Dockerfile.proxy` (raiz) — builda o frontend estático e serve junto com o proxy reverso Caddy (`Caddyfile`), evita container separado só pra frontend. Roteamento por subdomínio: `oficinasync.com.br` → frontend, `api.oficinasync.com.br` → backend.
- `docker-compose.prod.yml` — sqlserver (edição Express, apropriada pra produção sem custo) + minio + backend + proxy, sem portas de banco/storage expostas publicamente.
- `.env.production.example` (raiz) e `backend/.env.production.example` — templates, nunca reaproveitar segredos do `.env` de desenvolvimento.
- **Frontend não tem mais URL fixa**: `frontend/oficinasync-web/src/lib/api.ts` exporta `API_URL` (lê `VITE_API_URL`, cai pra `http://localhost:3000` em dev). Antes disso, `http://localhost:3000` estava hardcoded em ~23 lugares — quebrava qualquer deploy real. Corrigido.
- **Múltiplos usuários por tenant**: hoje só dá pra criar via script (`backend/scripts/seed-employees.ts`, roda com `npx ts-node -r tsconfig-paths/register scripts/seed-employees.ts`), não existe convite ainda (pendência #2). Também não existe tela de trocar senha — chip já sinalizado no board de tasks.

## Pendências prioritárias (por ordem)

### Curto prazo — fechar o essencial para rodar na oficina

1. ~~`PATCH /sections/:id` para editar `notes`~~ — feito, junto com a `TestsModule` (testes estruturados: bateria, compressão, vazão de bicos etc., com dado esperado/obtido e veredito aprovado/reprovado/inconclusivo)
2. **Cadastro de funcionários** (mecânicos e recepcionistas) — precisa da tabela `invites` para OWNER convidar via link
3. **Deploy** em produção — hoje só roda localhost
4. **Migrar `synchronize: true`** para migrations do TypeORM
5. ~~**Gerar PDF do relatório**~~ — feito. `ReportModule` com Puppeteer, `GET /service_orders/:id/report.pdf`, botão "Baixar laudo PDF" no `OsWorkPage` e `OsFinishPage`. Reaproveita `tests` e `medias`. Gerado sob demanda, não persistido (fast-follow: salvar como `Media` pra aparecer também na página pública, precisa liberar `application/pdf` na whitelist do MinIO).
6. ~~**Vídeo de divulgação automático**~~ — feito. `VideoModule` com `fluent-ffmpeg`, `POST /service_orders/:id/promo-video` (assíncrono, polling via `promo_video_status`), botão "Gerar vídeo de divulgação" no `OsWorkPage`. Testado ponta a ponta com clipes sintéticos. Fast-follow possível: overlay de texto por seção, transições, escolher manualmente quais clipes entram.
7. ~~**Testes especializados (Fase 4)**~~ — feito. Leonardo trouxe um spec externo (`oficinasync_testes_spec.md`, ~50 tipos de teste, stack diferente — só a ideia foi aproveitada) propondo formulário/card/PDF dedicados por tipo. Decisão: híbrido — 4 tipos prioritários da oficina (Compressão Mecânica, Leitura de DTC, Bateria, Injetores no Banco) ganharam UI dedicada com captura de foto direto da câmera do celular (`capture="environment"`); os outros ~46 tipos continuam no formulário genérico. Testado ponta a ponta incluindo geração de PDF com os blocos especializados. Fast-follow: mais tipos do catálogo conforme demanda real da oficina, edição de testes especializados já criados (hoje só criar/excluir).

### Médio prazo — features validadas

8. **OBD:** de momento pausado a pedido do Leonardo (foco em testes estruturados/PDF/vídeo primeiro)
   - `POST /obd/heartbeat` no backend (ESP32 registra IP)
   - `GET /obd/scan` no backend (busca dados do ESP32 via HTTP)
   - Adicionar heartbeat no firmware do ESP32
   - Adicionar suporte a PDF na whitelist do MinioService
9. **Anexar relatórios em PDF** dentro das sections (reaproveitar `medias`, adicionar `application/pdf` na whitelist) — depende do item 5 (geração de PDF)
10. **Mobile** (React Native) para o mecânico usar no chão de oficina

### Longo prazo

11. Landing page + política de privacidade + termos de uso (LGPD)
12. Planos e pagamento (Stripe ou similar)
13. `password_resets` (recuperação de senha)

## Decisões arquiteturais em aberto

- Semântica de `trial` vs `free` no enum de planos do tenant
- Se CPF deve ser único por tenant (índice composto `tenant_id, cpf`)
- `mileage_in` está no `cars` mas deveria estar em `service_orders` (perde histórico entre visitas)
- Se múltiplas sections do mesmo tipo devem ser permitidas na mesma OS
- Parâmetros OBD: colunas individuais vs JSON

## Princípios do projeto

- **DRY:** sem duplicar serialização — usar `plainToInstance` **OU** `ClassSerializerInterceptor`, não os dois (escolhido: `plainToInstance` nos controllers)
- **Separação de módulos:** `EmailModule` isolado para evitar dependência circular com Auth/Tenants
- **Tenants isolados:** toda query sensível filtra por `tenant_id` do usuário logado (segurança multi-tenant)
- **Nunca confiar no frontend:** `service_order_id` do body sempre validado contra tenant do token
- **`public_token` gerado no backend** via `randomBytes(32).hex`, nunca no frontend

## Estilo de comunicação com Leonardo

- Português brasileiro
- Direto e objetivo, sem enrolação
