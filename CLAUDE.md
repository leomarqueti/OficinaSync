# OficinaSync — Contexto do Projeto

## O que é

OficinaSync é um SaaS multi-tenant para gestão de oficinas mecânicas, com foco em **transparência ao cliente**. O diferencial é uma página pública personalizada onde o cliente acompanha o serviço em tempo real com fotos, vídeos, áudios e explicações do mecânico — como um "storytelling" do reparo.

Dono do projeto: Leonardo (mecânico há 11 anos, formado em ADS). Objetivo atual: rodar o sistema na própria oficina (Lima Auto Elétrica, Tupã-SP) e depois evoluir. **Não é mais TCC** — é produto real.

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
- **Reescrito na Fase 5 da reforma visual** — antes o laudo jogava todas as fotos numa galeria genérica e todos os testes numa lista plana, **sem nunca incluir o texto que o mecânico escreve em cada etapa** (`section.notes`), o que deixava o PDF "incompleto" perto da página do cliente (que já mostra tudo por capítulo). Agora `report.service.ts` monta um `ReportChapter[]` — um por `section` (check-in, diagnóstico, reparo, preventiva, final, scanner/OBD), cada um com `notes` + fotos daquela etapa + testes daquela etapa — espelhando exatamente a estrutura de capítulos da `PublicServiceOrderPage`. Testes dos 4 tipos especializados (Fase 4) continuam com bloco próprio (grade de fotos por cilindro, tabela de DTC colorida, cards de bateria, antes/depois dos injetores), agora aninhados dentro do capítulo certo; fotos referenciadas em `data` continuam deduplicadas da galeria da etapa via `claimedMediaIds`
- **QR code** (pacote `qrcode`) linkando pra página pública (`public_url`) + bloco de assinatura com o responsável técnico (`order.user.name`) no fechamento do laudo — ponte laudo↔storytelling
- Campos de fechamento em `ServiceOrders`: `root_cause`, `conclusion`, `final_verdict` (`resolved`/`not_resolved`/`partial`), preenchidos no `OsFinishPage` junto com o `PATCH /service_orders/:id/finish`
- Header/footer repetidos em toda página via `page.pdf({ displayHeaderFooter: true })` do Puppeteer
- **Gotcha sério de serialização** (achado ao adicionar `GET /users/me` na Fase 4, vale pra qualquer DTO novo): o app tem um `ClassSerializerInterceptor` global (`main.ts`) que roda `classToPlain` em cima do que o controller já retornou via `plainToInstance`. Um `@Transform` sem `{ toClassOnly: true }` roda de novo nesse segundo passe — mas aí `obj` já é a instância do DTO (não a entidade original), então qualquer campo computado a partir de uma relação (ex: `tenant.name`) vira `null` silenciosamente na resposta final.

### `VideoModule`

- `POST /service_orders/:id/promo-video` (protegido, valida tenant, exige pelo menos 1 mídia tipo vídeo em alguma section) — dispara em fire-and-forget (retorna 202 na hora), processamento roda em background
- Campo `promo_video_status` em `ServiceOrders` (`none`/`processing`/`ready`/`failed`) — frontend faz polling de `GET /service_orders/:id` a cada 4s enquanto `processing`
- Pipeline (`fluent-ffmpeg` + `ffmpeg-static` + `ffprobe-static`, sem precisar instalar ffmpeg no SO): coleta os `medias` tipo vídeo de todas as sections na ordem visual (`checkin → diagnosis → repair → preventive → final`, pula `obd_scan`), normaliza cada clipe pra 1080x1920 vertical/30fps/h264+aac (detecta presença de áudio via ffprobe antes de normalizar), concatena via demuxer do ffmpeg, sobe o resultado via `MinioService.uploadBuffer`
- O vídeo final vira um `Media` (`label: 'Vídeo de divulgação'`) anexado à section `final` (criada automaticamente se ainda não existir, via `SectionsService.create`)
- Testado ponta a ponta com clipes sintéticos de resoluções diferentes (640x480 e 1280x720) — saída normalizada corretamente pra 1080x1920, áudio combinado, duração batendo com a soma dos clipes

### `ObdModule` (Fase 1 do scanner próprio — feito; plano completo no plan file `happy-sprouting-panda.md`)

Scanner OBD da oficina (ESP32 + ELM327). Arquitetura invertida em relação ao firmware v1 (`Iot/OficinaSync_OBD_v1/`): o ESP32 é **cliente** e EMPURRA dados pra API com um token de dispositivo — nunca o contrário (página HTTPS não pode chamar `http://ip-local` por mixed content, e a VPS não enxerga a LAN da oficina).

- **Entidade `ObdDevices`** (`obd_devices`, via migration): `device_id`, `name`, `device_token` (unique, `randomBytes(32).hex`, mostrado UMA vez na criação — igual convite), `is_active`, `last_ip`, `last_seen_at`, `last_reading` (simple-json — só o último snapshot, efêmero; o que importa vira `Test` na OS), `last_reading_at`, `pending_command`, `tenant` (indexado). Sem tabela de readings histórica de propósito.
- **Rotas do dispositivo** (autenticadas por header `X-Device-Token`, throttled 30/min): `POST /obd/heartbeat` e `POST /obd/reading` — ambas devolvem `{ok, command}` e limpam o `pending_command` ao entregar (**canal de comandos**: a UI seta via `POST /obd/devices/:id/command` (`read_dtc`/`clear_dtc`), o ESP recebe no próximo push — é o que permite "ler códigos agora" e futuramente orquestrar teste de bateria).
- **Rotas JWT**: `POST/GET/PATCH/DELETE /obd/devices` (lista calcula `online` = `last_seen_at` < 90s; nunca vaza o token), `GET /obd/devices/:id/latest` (snapshot pro tempo real), `POST /obd/capture` (`{device_id, service_order_id}` → valida tenant de ambos → exige leitura fresca < 60s senão 409 → find-or-create da section `obd_scan` (padrão do VideoModule) → cria `Test` `test_type: 'obd_snapshot'`).
- **`obd_snapshot`** é o 7º `test_type` (migration atualizou o `@Check` — atenção: o `migration:generate` NÃO detecta mudança no corpo de um `@Check` existente, compara por nome; o DROP/ADD foi adicionado à mão na migration `ObdDevicesAndObdSnapshotTestType`). `data`: `{collected_at, device_name, voltage, params: {rpm, temp, ...}, dtcs: [{code, description}]}` — a **descrição do DTC é resolvida na captura** (`backend/src/modules/obd/dtcCatalog.ts`, espelho de `src/lib/dtcCodes.ts` no front) pra página do cliente, PDF e histórico exibirem o mesmo texto.
- Frontend: `ScannerPage.tsx` (`/scanner`, item "Scanner" na sidebar) — cadastro de device (token uma vez + copiar) e lista com badge online (poll 15s); `StoryObdSnapshot.tsx` (grade de parâmetros com `obdParamLabels` + DTCs com descrição) plugado no `StoryTestBlock` (mecânico + cliente); bloco espelho no `report.template.ts` (PDF); botão **"Coletar dados OBD"** no cabeçalho do `OsWorkPage` (aparece só com device online, poll 15s). Teste `obd_snapshot` não tem botão Editar (dado de máquina) — só Excluir.
- **Testado ponta a ponta com dispositivo simulado via curl** (sem hardware): token errado 401, outro tenant 403 (latest e capture), leitura velha 409, comando entregue exatamente uma vez, seção `obd_scan` invisível na página pública até publicar, PDF com o bloco (params + códigos), captura pela UI real com toast. **Gotcha de teste**: pra envelhecer `last_reading_at` no banco em teste, subtrair do valor armazenado (`DATEADD(second,-120,last_reading_at)`) — usar `GETDATE()` cru desloca 3h porque o TypeORM grava datetime em convenção local e lê de volta convertendo, enquanto `GETDATE()` do container é UTC.
- **Fase 2 (feita) — painel ao vivo na ScannerPage**: `src/components/obd/ObdLivePanel.tsx` (poll do `latest` a cada 2,5s) + `Sparkline.tsx` (gráfico SVG próprio, sem dependência). Cards grandes por parâmetro; **"Escolher dados"** (chips por parâmetro, persistido em `localStorage` `obd_visible_params`, default tensão/rpm/temp/velocidade); **modo gráfico** (janela deslizante de 60 pontos acumulada SÓ no navegador — o ponto entra quando `last_reading_at` muda, não a cada poll); **"Ler códigos agora"** e **"Apagar códigos"** (com `AlertDialog` avisando que apagar sem consertar volta) via canal de comandos — botão fica "Aguardando scanner..." até chegar leitura nova pós-envio (se o dongle parar de push, fica aguardando — correto); linha do device na lista é selecionável (painel embaixo, auto-seleciona o primeiro online). **Atalho de OS**: `/scanner?os=ID` mostra "Anexar leitura à OS #ID" (captura e navega de volta); o `OsWorkPage` ganhou botão "Scanner ao vivo" ao lado do "Coletar dados OBD". Verificado com simulador bash (60 pushes/3s, RPM em rampa + tensão em serra): cards atualizando ao vivo, gráficos com o padrão exato do simulador, comando entregue no próximo push, anexar-à-OS navegando com o teste criado.
- **Fase 3 (firmware escrito, AGUARDANDO BANCADA do Leonardo)** — `Iot/OficinaSync_OBD_v2/` (a v1 fica intacta como referência; README com passo a passo de gravação/setup/troubleshooting). Prioridade = **compatibilidade máxima de carros**: protocolo automático `ATSP0` (CAN 2010+ E K-line ISO 9141/KWP da frota BR antiga), `ATAT2` (timing adaptativo), timeout de init 15s (K-line é lenta — causa clássica de "ELM falhou" na v1), **fila de PIDs uma-consulta-por-vez com skip adaptativo** (PID que falha 8x seguidas é desativado — carro sem MAF/fuel/banco 2 não trava o ciclo; reseta a cada conexão nova de carro). Push: heartbeat 30s + reading 5s (`X-Device-Token`), comandos lidos da resposta (`read_dtc`/`clear_dtc` com push imediato pós-execução). NVS agora persiste `bt_device`/`bt_pin`/`dev_token`/`api_url` → **plug-and-play no boot**. `api_url` aceita `http://IP:3000` pra bancada contra o backend dev (sem TLS) e `https://` produção (root CA ISRG X1 embutida, válida até 2035). `/bt_scan` na página local de setup (`SerialBT.discover()` 8s, tocar no resultado preenche o MAC — mata a dor da v1). Página local reduzida a setup/status (o painel de verdade é a tela Scanner do sistema). **Não compilado nesta máquina** (sem toolchain Arduino) — APIs conferidas contra a v1 que compila; qualquer erro de build o Leonardo reporta da IDE.
- **Próximas fases**: Fase 4 = OBD na abertura da OS (wizard) + "puxar do scanner" no `LeituraDtcForm` (depois da bancada validar a Fase 3); Fase 5 = teste de bateria orquestrado, compressão relativa, falha de cilindro, rodagem georreferenciada.

## Frontend web (páginas já implementadas)

- `LoginPage`
- `RegisterUserPage`, `RegisterTenantPage`, `VerifyEmailPage`
- `LoginPage`, `UserRegisterPage`, `TenantRegisterPage`, `EmailSendPage` — **reescritos na Fase 4 da reforma visual**: dark, erro de credencial inválida visível (antes falhava em silêncio), link "Criar grátis"/"Já tem conta" funcionais, força de senha em tempo real (`PasswordStrength`, espelha `@IsStrongPassword()` do backend: 8+ chars, minúscula, maiúscula, número, símbolo), CNPJ com máscara + validação de dígito verificador (`CnpjField`, mesmo algoritmo do `validation-br` do backend)
- `DashboardPage` — lista OS abertas do tenant (via `GET /service_orders/orders`), **reescrito na Fase 4**: dark, busca o usuário logado de verdade via `GET /users/me` (rota nova) pro cabeçalho — sem mais "Carlos Silva" fixo nem "Equipe hoje"/"Scanner OBD" fake. Sidebar (`DashboardSidebar`) com logout funcional (antes não fazia nada) e itens ainda não implementados (Clientes/Veículos/Equipe/Config) mostram toast "em construção" em vez de parecerem quebrados
- `OsCreateWizardPage` (`/os-client-create`) — **reescrito na Fase 3 da reforma visual**, substitui as 5 páginas soltas antigas (`OsCreateClientPage`/`OsCreateCarPage`/`OsVehicleDefectPage`/`OsMediaDefectPage`/`OsVehicleEntryPhotosPage`, removidas). Wizard único (`WizardShell` compartilhado) com 5 passos — cliente, veículo, defeito relatado, fotos de entrada, revisão — e **nada é criado no backend até o passo de revisão** (evita cliente/carro órfão se o mecânico abandonar o fluxo pela metade, diferente do comportamento anterior). No passo final dispara em sequência `POST /clients` → `POST /cars` → `POST /service_orders` → `POST /sections` (checkin) → 4x `POST /medias` → `PATCH /sections/:id/publish`, e navega direto pra `OsWorkPage` da OS recém-criada.
- `OsWorkPage` — tela do mecânico, **reescrita na Fase 2 da reforma visual** como orquestrador dark enxuto (era um monolito de ~1836 linhas): cabeçalho com ações principais, `SectionStepper` (trilha horizontal das 6 etapas do ciclo, toca numa tracejada pra criar), `SectionCard` por etapa (conteúdo + ações), tudo via bottom-sheets (`AddTestSheet`, `MediaUploadSheet`, `EditNotesSheet`, `EditTestSheet`, `CreateSectionSheet`) e confirmação (`AlertDialog`) antes de publicar etapa ou excluir teste — nada de `alert()` cru, tudo com toast (sonner)
- `OsFinishPage` — fechamento da OS: causa raiz, conclusão, veredito final, fotos de saída, baixar laudo PDF
- `PublicServiceOrderPage` (`/servico/:token`) — página pública do cliente, **reescrita como scrollytelling "Cinema Escuro"** (Fase 1 da reforma visual): hero full-screen animado, capítulos numerados revelados por scroll (relato → check-in → investigação → reparo → veredito → vídeo → fechamento com métricas), lightbox de mídia, mobile-first, `prefers-reduced-motion` respeitado
- `frontend/oficinasync-web/src/components/tests/` — módulo de testes especializados: `testTypes.ts` (schemas TS + labels/cores), `TestTypeSelector.tsx`, `TestFormShell.tsx` (wrapper compartilhado título/veredito/notas/salvar), `PhotoCaptureButton.tsx` (`capture="environment"` — abre câmera no celular, upload inline pro `/medias`), e um par Form+Card por tipo (`BateriaForm/Card`, `LeituraDtcForm/Card`, `CompressaoMecanicaForm/Card`, `InjetoresBancoForm/Card`)

### Reforma visual "Cinema Escuro" (em andamento, faseada)

Direção escolhida pelo Leonardo: fundo quase preto `#0a0a0a`, verde-limão `#A3E635` como assinatura, tipografia grande, storytelling por scroll. Plano completo em 5 fases (`~/.claude/plans/happy-sprouting-panda.md`).

- **Fundação (feita)**: tokens no `src/index.css` — o bloco `.dark` É a paleta Cinema Escuro (`--brand`, `--surface`, lime como `--primary`); páginas ativam com classe `dark` no root. Deps novas: `motion`, `sonner`, `react-hook-form`, `zod`. `src/lib/api.ts` agora exporta `apiFetch()` (Bearer automático + erro → toast sonner; `silent: true` pra tratar manualmente). `<Toaster />` montado no `App.tsx`. Primitivas em `src/components/motion/` (`Reveal`, `Stagger`/`StaggerItem`, `CountUp`, `Parallax`) e `src/components/media/Lightbox.tsx` — todas respeitam `prefers-reduced-motion`.
- **Fase 1 (feita)**: página do cliente reescrita (acima). Blocos de teste dark em `src/components/story/` (`StoryTestBlock` despacha por `test_type` → `StoryBateria`/`StoryCompressao`/`StoryDtc`/`StoryInjetores`, + tabela genérica; chips em `chips.tsx`/`statusMaps.ts`). Fotos com `onError` → somem em vez de mostrar ícone quebrado.
- **Fase 2 (feita)**: `OsWorkPage` reescrita (acima), componentes em `src/components/os/` (`types.ts`, `SectionStepper`, `SectionCard`, `GenericTestForm`, e os 5 sheets). Novo `src/components/ui/alert-dialog.tsx` (shadcn, escrito à mão). **Gotcha resolvido**: `Sheet`/`AlertDialog` do Radix renderizam via `Portal` em `document.body`, fora de qualquer `className="dark"` local — por isso o hook `src/hooks/useDarkTheme.ts` (`useEffect` que põe/tira a classe `dark` no `<body>`) é obrigatório em toda página escura que usa esses componentes (não basta o wrapper `<div className="dark">`).
- **Fase 3 (feita)**: `OsCreateWizardPage` (acima). Campos validados em `src/components/fields/` (`PhoneField`, `CpfField`, `PlateField`, `YearField`, `KmField` + `FieldShell` pro rótulo/status/erro inline) e algoritmos em `src/lib/validators.ts`: telefone se formata sozinho — usuário nunca digita `+55`, é anexado por baixo (`phoneToE164`/`e164ToDigits`) porque o backend exige E.164 (`@IsPhoneNumber()` sem região); CPF valida dígito verificador em tempo real (mesmo algoritmo do `class-validator-cpf` do backend) e avisa "CPF inválido" ainda digitando; placa aceita padrão antigo e Mercosul (detecta pelo 5º caractere ser letra ou dígito). **Gotcha de validação**: os `status` inline de cada campo (`válido`/`inválido`) usam o valor já normalizado (ex: `e164ToDigits(phone)`), então qualquer validação feita *fora* do campo (ex: no wizard, pra habilitar o botão "Continuar") precisa normalizar do mesmo jeito — passar o E.164 cru pro `isValidPhone` sempre falha (o país teria dígitos demais). Fotos de entrada (`EntryPhotoSlot`) só guardam `File` local (preview via `URL.createObjectURL`, sem upload) até a revisão confirmar. Também corrigido: `fuel_type` era um `<Input>` de texto livre na página antiga (`@IsEnum(FuelType)` no backend rejeitava "Flex" com F maiúsculo) — agora é um `<select>` com os 4 valores exatos do enum (`flex`/`gasolina`/`diesel`/`eletrico`).
- **Fase 4 (feita)**: Login/Registro/Dashboard (acima). Backend ganhou `GET /users/me` (`UsersController`, protegido por `JwtAuthGuard`) — não existia nenhuma rota pra buscar o próprio usuário logado. `ResponseUserDto` ganhou `user_id` e `tenant_name` (via `@Transform`). **Gotcha sério de serialização**: o app tem um `ClassSerializerInterceptor` global (`main.ts`) que roda `classToPlain` em CIMA do que o controller já retornou via `plainToInstance` — um `@Transform` sem `{ toClassOnly: true }` roda de novo nesse segundo passe, mas aí `obj` já é a instância do DTO (não a entidade original), então `obj.tenant` não existe e o campo vira `null` silenciosamente. Qualquer `@Transform` novo que dependa de uma relação da entidade original precisa de `{ toClassOnly: true }` pra não ser sobrescrito. **Gotcha de módulo**: `UsersModule` não podia importar `AuthModule` pro `JwtAuthGuard` (ciclo, já que `AuthModule` importa `UsersModule`) — resolvido importando `JwtModule.registerAsync(...)` direto no `UsersModule`, igual o `AuthModule` já fazia, em vez de reusar o export.
- **Fase 5 (feita)**: laudo PDF reescrito (ver `ReportModule` acima) — capítulos por etapa com o texto do mecânico, QR code + assinatura no fechamento, acento verde-limão sutil (regra sob o título, número do capítulo em círculo lime) mantendo legibilidade de impressão (fundo claro). Reforma visual concluída nas 5 fases planejadas.

### Captação rica de contexto (em andamento, faseada — plano ativo em `~/.claude/plans/happy-sprouting-panda.md`)

Motivação do Leonardo: informação se perdia entre o balcão (que anota "mais ou menos" no papel) e o mecânico. Objetivo: capturar o relato do cliente com a mesma riqueza de uma conversa direta (foto/vídeo/áudio, não só texto), dar ao mecânico como registrar achados extras, e generalizar o "antes e depois". Fases A/B/C/D/E, ordem: fundação → wizard → mecânico → cliente+PDF → dashboard.

- **Fase A (feita)**: dois novos `test_type` (`achado_adicional`, `antes_depois`) e um novo `SectionType.intake` (relato do cliente, criada automaticamente na abertura da OS, sempre publicada na hora). `GET /service_orders/orders` aceita `?status=` opcional (antes só retornava abertas). Frontend: `AudioRecorder.tsx` (grava direto no navegador via `MediaRecorder`, fallback pra escolher arquivo se o mic for negado) e `MediaCaptureField.tsx` (componente universal: foto/vídeo com botões explícitos câmera-ou-arquivo, áudio via `AudioRecorder`) em `src/components/media/`. **Gotcha importante**: o SQL Server, com `synchronize: true`, **não atualiza o corpo de um `@Check` existente** quando só o texto da constraint muda no código (o nome continua igual) — foi preciso rodar `ALTER TABLE ... DROP/ADD CONSTRAINT` manualmente no banco (dev e depois produção) toda vez que um novo valor é adicionado a um enum com `@Check` (`SectionType`, `TestTypeCategory`).
- **Fase B (feita)**: `OsCreateWizardPage` ganhou dropdown de marcas comuns (`src/lib/carBrands.ts`) + opção "Outra" com campo livre; passo de defeito relatado ganhou captura opcional de foto/vídeo/áudio do cliente (`MediaCaptureField`, múltiplos itens) e um roteiro de perguntas de triagem opcional e colapsável (`src/lib/intakeQuestions.ts` — uso do veículo, há quanto tempo, quando aparece, etc.) que vira texto formatado; fotos de entrada ganharam "+ adicionar mais fotos" pra riscos/avarias além das 4 fixas. `submitAll()` cria a section `intake` (com mídia do cliente + notas do roteiro) publicada antes do `checkin`, só quando há conteúdo de verdade.
- **Fase C (feita)**: `OsWorkPage` mostra a section `intake` fixa no topo, somente leitura (`IntakeCard.tsx`). Novo botão "Achado" no `SectionCard` abre `AddFindingSheet.tsx` (título/severidade baixa-média-alta/descrição/foto opcional, `POST /tests` com `test_type: achado_adicional` — sem seletor de tipo, é um fluxo próprio, diferente do "Teste"). Novo tipo "Antes e Depois" no `TestTypeSelector` (`AntesDepoisForm.tsx`, generaliza o par de fotos que antes só existia dentro de Injetores no Banco). `StoryAchado.tsx` (alerta âmbar/laranja) e `StoryAntesDepois.tsx` (fotos lado a lado) plugados no `StoryTestBlock.tsx` — como esse componente já é compartilhado entre `SectionCard` (mecânico) e `PublicServiceOrderPage` (cliente), os dois novos tipos já renderizam nos dois lugares. `MediaUploadSheet` passou a usar `MediaCaptureField` da Fase A.
- **Fase D (feita)**: `PublicServiceOrderPage.tsx` mostra a galeria de mídia da section `intake` logo abaixo da citação do `client_complaint` (fotos/vídeo/áudio que o cliente mandou na abertura) — os blocos de achado/antes-depois já apareciam de graça desde a Fase C porque `StoryTestBlock` é compartilhado entre cliente e mecânico. `report.service.ts`/`report.template.ts`: a section `intake` é extraída à parte (não vira capítulo numerado) e suas fotos entram logo após "Queixa relatada" no PDF, espelhando a página do cliente; `achado_adicional` ganha bloco com borda âmbar/laranja e badge de severidade, `antes_depois` reaproveita o mesmo grid de fotos lado a lado que já existia pra Injetores no Banco (generalizado). Testado ponta a ponta: PDF real extraído via `pdftotext` confirma a ordem exata (queixa → foto do cliente → capítulo com achado + antes/depois numerados em sequência); página pública confirmada via inspeção de DOM (a ferramenta de screenshot estava instável nesta sessão).
- **Fase E (feita)**: `DashboardPage` ganhou chips de filtro (Abertas/Concluídas/Todas) chamando `GET /service_orders/orders?status=` (Fase A) — antes só existiam as OS abertas, sem jeito de ver o histórico de concluídas. Título do card de métrica principal muda conforme o filtro ("Ordens abertas"/"OS concluídas"/"Total de OS"). Captação rica de contexto concluída nas 5 fases planejadas.

### Busca de cliente/veículo existente na abertura de OS (feito)

Motivação: cada OS nova recriava cliente e carro do zero, mesmo pra quem já era cliente — gerando registros duplicados (o mesmo "Diogo deleon" existia 3x no banco de teste). Pedido do Leonardo: buscar cliente já cadastrado ao abrir uma OS.

- **Achado de segurança corrigido de passagem**: `GET /clients` não tinha `JwtAuthGuard` nem filtro de `tenant_id` — retornava nome/CPF/telefone/endereço de **todos os clientes de todas as oficinas** pra qualquer requisição não autenticada. Corrigido: guard adicionado, `ClientsService.findAll(userId, search?)` agora sempre escopa por `tenant.id` do usuário logado. Princípio "tenants isolados" (ver seção de princípios) valia só pros módulos de OS/carros, não pra clients — vale conferir outros `findAll`/`GET` sem guard se aparecerem novos.
- `GET /clients?search=` busca por nome (`ILike`) e por CPF/telefone (dígitos, `ILike`), tenant-scoped, limit 20 (ou 50 sem termo). `ResponseClientDto` ganhou `email` (fazia falta pro preenchimento automático no wizard).
- `GET /cars?client_id=` (rota nova, `CarsController`/`CarsService.findByClient`) lista os veículos de um cliente, validando que o carro pertence ao mesmo tenant do usuário — não existia nenhum `GET` em `CarsModule` antes disso.
- `OsCreateWizardPage.tsx` passo 1: campo de busca com debounce (350ms) acima do formulário; selecionar um resultado preenche os campos e trava o formulário (mostra card "cliente já cadastrado" com botão "Trocar"). Passo 2: se o cliente selecionado tem carros cadastrados, mostra lista pra reaproveitar (com opção "Cadastrar veículo novo"); senão form normal.
- `submitAll()`: só chama `POST /clients`/`POST /cars` quando não há seleção — usa os IDs existentes direto no `POST /service_orders`. Testado ponta a ponta: reaproveitar cliente+carro não cria registros duplicados (contagem de clientes antes/depois idêntica), OS nova referencia corretamente o cliente/carro reaproveitados.
- ~~**Débito conhecido, não resolvido aqui**: ao reaproveitar um carro existente, o KM de entrada (`mileage_in`) não é atualizado~~ — resolvido depois, ver seção "Histórico do veículo + KM por visita" abaixo.

### Rate limiting em auth (feito)

`@nestjs/throttler` instalado, `ThrottlerModule.forRoot` global (60 req/min por IP, via `APP_GUARD`) em `app.module.ts`, com `@Throttle({ default: { limit: 5, ttl: 60000 } })` mais restritivo em `POST /auth/login` e `POST /auth/register` (`authModule.controller.ts`) — antes não existia nenhum limite, força bruta de senha era viável. `main.ts` ganhou `app.set('trust proxy', 1)` (via `NestExpressApplication`) — necessário porque em produção rodamos atrás do Caddy; sem isso o Throttler enxergaria o IP do proxy pra todo mundo e um usuário bloquearia a oficina inteira. Testado: 6ª tentativa de login em menos de 60s retorna 429.

### Troca de senha + recuperação de senha (feito)

Não existia nenhuma forma de trocar senha (nem logado, nem esquecida) — pendência antiga do roadmap.

- Nova tabela/entidade `PasswordResets` (`backend/src/modules/password_resets/`), molde idêntico a `Email_verifications`: token único (`randomBytes(32).hex`), `expires_at` (1h — mais curto que o de verificação de email por ser mais sensível), `used_at` (uso único, marca na hora que consome).
- `PATCH /users/me/password` (`UsersController`, `JwtAuthGuard`) — troca de senha logada: exige `current_password` correta (verificada via `UsersService.findHashPasswordById` + `verifyHash`, novo método já que o existente `findHashPassword` busca só por email) antes de aceitar a `new_password` (`@IsStrongPassword()`, mesma regra do cadastro).
- `POST /auth/forgot-password` / `POST /auth/reset-password` (`AuthController`, ambos com o mesmo throttle de 5/min do login) — resposta de `forgot-password` é **sempre a mesma mensagem genérica**, exista ou não o email, pra não vazar quais emails têm conta (`AuthService.forgotPassword` só dispara o email se o usuário existir, silenciosamente ignora se não). Email vai via `EmailService.sendPasswordResetEmail` (novo método, reaproveita o `Resend` já configurado) linkando pro **frontend** (`FRONTEND_URL/redefinir-senha?token=`), diferente do link de verificação de email que aponta pro backend.
- `SettingsPage.tsx` (nova, `/configuracoes`) — troca de senha logada, sidebar "Config." agora navega pra lá em vez do toast "em construção". `ForgotPasswordPage.tsx` (`/esqueci-senha`) e `ResetPasswordPage.tsx` (`/redefinir-senha?token=`) novas, reaproveitam `PasswordStrength`/`isStrongPassword` já existentes. `LoginPage.tsx`: botão "Esqueceu a senha?" (antes só mostrava toast "não disponível") agora navega pra `/esqueci-senha`.
- Testado ponta a ponta com usuário descartável (criado via `/auth/register`, ativado direto no banco, removido ao final): troca de senha logada confirma que a senha antiga para de funcionar e a nova funciona; fluxo de esqueci-senha confirma que o token gerado funciona uma vez (login com a nova senha funciona) e falha na segunda tentativa de uso (single-use).

### Cadastro de funcionários via convite (feito)

Antes só dava pra criar conta de mecânico/recepcionista via script manual (`seed-employees.ts`) — pendência antiga #2 do roadmap, o Leonardo era gargalo pra crescer a equipe.

- Nova entidade `Invites` (`backend/src/modules/invites/`): `token` único, `email`, `role` (`@Check` restrito a `mechanic`/`receptionist` — convite não cria `owner`), `expires_at` (7 dias), `used_at` (uso único), `tenant` + `invitedBy` (ManyToOne).
- `POST /invites` (`JwtAuthGuard`) — só `role === 'owner'` pode chamar (`InvitesService.create` lança `ForbiddenException` senão); usa o `tenant` do próprio usuário logado, nunca aceita `tenant_id` do body. `GET /invites` lista os convites do tenant (pendente/aceito/expirado calculado no frontend a partir de `used_at`/`expires_at`). `GET /invites/:token` é público (preview do convite — email/cargo/nome da oficina — antes do aceite). `POST /invites/accept` é público e throttled (5/min, mesmo limite do login), cria o usuário via novo `UsersService.createFromInvite` (já nasce com tenant certo, `role` do convite, `is_active: true` direto — não passa pelo fluxo de verificação de email de 2 etapas, porque só quem tem acesso à caixa de entrada que recebeu o link consegue chegar até o aceite) e retorna `access_token` (login automático).
- `EmailService.sendInviteEmail` (novo) envia o link pro **frontend** (`FRONTEND_URL/convite?token=`).
- Frontend: `TeamPage.tsx` (nova, `/equipe`, sidebar "Equipe" agora navega pra lá em vez do toast "em construção") — formulário de convite (email + cargo) e lista de convites enviados com status (Pendente/Aceito/Expirado). `AcceptInvitePage.tsx` (nova, `/convite?token=`) — busca o preview público, mostra email (travado)/cargo/oficina, formulário de nome+senha, aceita e já loga automaticamente.
- Testado ponta a ponta com usuários descartáveis (dono e convidado, criados/ativados direto no banco, removidos ao final): dono consegue criar convite e ver na lista; usuário sem ser dono recebe 403 ao tentar convidar; aceitar o convite cria o usuário já vinculado ao tenant certo (`Lima auto eletrica`) com o cargo certo, loga automaticamente; reutilizar o mesmo token depois de aceito falha com "Convite já foi utilizado".

### Páginas reais de Clientes/Veículos (feito)

Sidebar "Clientes"/"Veículos" só mostravam toast "em construção" — agora navegam pra páginas reais, reaproveitando a busca tenant-scoped já construída pra abertura de OS.

- `CarsService.findAll(userId, search?)` (novo, mesmo padrão do `ClientsService.findAll`) — tenant-scoped, busca por `ILike` em placa/marca/modelo. `CarsController.findByClient` virou `findAll`: com `?client_id=` chama a busca por cliente (comportamento antigo, usado no wizard), sem isso lista todos os carros do tenant.
- `ResponseCarDto` ganhou `client_id`/`client_name` via `@Transform(..., { toClassOnly: true })` — segue o gotcha já documentado do `ClassSerializerInterceptor` global (sem `toClassOnly`, o campo vira `null` no segundo passe de serialização).
- `ClientsPage.tsx` (`/clientes`) e `CarsPage.tsx` (`/veiculos`) — listas com busca debounced (`GET /clients?search=` / `GET /cars?search=`), somente leitura (sem editar/excluir ainda). Sidebar atualizada pra navegar em vez de mostrar toast; `comingSoon`/`toast` removidos do `DashboardSidebar.tsx` (não sobrou nenhum item placeholder).
- Testado ponta a ponta com usuário descartável logado via UI de verdade: `/clientes` lista os clientes reais do tenant com busca funcionando; `/veiculos` lista os carros reais com o nome do dono resolvido corretamente (confirma que o `@Transform` com `toClassOnly` funciona).

### Health-check (feito, sem Sentry por decisão do Leonardo)

`GET /health` (`HealthModule`, público, sem guard) — testa conectividade real com o banco (`SELECT 1` via `DataSource` do TypeORM), retorna 200 `{status: 'ok', database: 'ok', timestamp}` ou 503 se o banco estiver inacessível. Antes não existia nenhum jeito de saber se o backend estava no ar sem testar manualmente uma rota autenticada. Decisão consciente: **sem Sentry por enquanto** (precisaria de conta/DSN do Leonardo) — recomendado configurar um monitor gratuito (ex: UptimeRobot) chamando esse endpoint a cada minuto pra alertar por WhatsApp/email se cair. Fast-follow se decidirem por rastreamento de erro completo depois.

### Compressão de foto no navegador antes do upload (feito)

Fotos de celular chegavam sem compressão (frequentemente 8-12MB cada) — inflava custo de storage no MinIO e deixava o upload lento no 4G da oficina.

- `frontend/oficinasync-web/src/lib/imageCompression.ts` (novo): `compressImage(file)` usa `createImageBitmap` + `<canvas>` pra redimensionar (máx. 1600px no maior lado) e reencodar como JPEG qualidade 0.8. Pula arquivos que já são pequenos (< 500KB) ou que não são imagem; qualquer falha (canvas indisponível etc.) devolve o arquivo original sem bloquear o upload — nunca quebra o fluxo.
- Plugado nos 3 pontos onde uma foto é capturada: `MediaCaptureField.tsx` (câmera/arquivo genérico, usado no relato do cliente e em mídias soltas), `EntryPhotoSlot.tsx` (as 4 fotos fixas + extras do wizard), `PhotoCaptureButton.tsx` (fotos por cilindro/injetor dos testes especializados). Vídeo e áudio não são tocados.
- Testado com imagem sintética de 2400x3200 (ruído aleatório, pior caso possível pra compressão) via `createImageBitmap`/`canvas` real no navegador: 30MB → 737KB, redimensionada corretamente pro limite de 1600px. Fotos reais de celular (que não são ruído puro) comprimem ainda melhor.

### Edição de testes especializados já criados (feito)

Antes só dava pra criar/excluir testes especializados (bateria, DTC, compressão, injetores, antes/depois, achado) — o botão "Editar" só aparecia pra testes genéricos (`{!test.test_type && ...}` no `SectionCard.tsx`). Débito técnico assumido desde a Fase 4, resolvido agora.

- Backend **não precisou de nenhuma mudança** — `PATCH /tests/:id` já aceitava `test_type`/`data` livremente desde sempre (`UpdateTestDto`/`TestsService.update` já eram genéricos). O buraco era 100% frontend: faltava UI de edição pros 6 tipos especializados.
- `testTypes.ts` ganhou `hydrateSpecializedData(testType, data, sectionMedias)` — ao editar um teste com foto (`compressao_mecanica`, `injetores_banco`, `antes_depois`, `achado_adicional`), o `previewUrl` salvo no `data` persistido é uma **blob: URL morta** (só válida na sessão do navegador em que a foto foi tirada); essa função resolve o `previewUrl` de novo a partir do `media_id` + `section.medias` (reaproveitando o `resolveMediaUrl` que já existia) antes de abrir o formulário.
- Os 5 forms especializados (`BateriaForm`, `LeituraDtcForm`, `CompressaoMecanicaForm`, `InjetoresBancoForm`, `AntesDepoisForm`) ganharam prop opcional `initial` (título/data/veredito/notas) — quando ausente, comportamento de criação idêntico ao de antes.
- `EditTestSheet.tsx` reescrito: dispatcha pelo `test.test_type` pro form certo (genérico continua indo pro `GenericTestForm`), passando `initial` hidratado + `sectionId` (necessário pros forms com foto, que fazem upload direto via `PhotoCaptureButton`). `AddFindingSheet.tsx` ganhou prop `editingTest` (achado_adicional tem fluxo próprio, fora do `TestTypeSelector`) — mesmo sheet agora serve criar e editar, trocando `POST`/`PATCH` conforme o caso.
- `OsWorkPage.tsx`: `onEditTest` agora roteia pro sheet certo (`EditTestSheet` vs `AddFindingSheet`) conforme o `test_type`, carregando `sectionId`/`sectionMedias` da section que contém o teste (o `TestItem` não guarda `section_id` — o contexto vem de qual `section` do loop disparou o clique).
- Testado ponta a ponta numa OS de teste já existente (`TESTE DESCARTAVEL - PODE DELETAR`, #9002): editar "Compressão Mecânica" mostrou a foto do cilindro 1 já resolvida como URL real do MinIO (não blob morta), mudar a ferramenta e salvar persistiu corretamente (`PATCH /tests/4` → 200, confirmado direto no banco) preservando o `media_id` da foto; editar um "Achado adicional" (#9004) confirmou o mesmo fluxo pro tipo com sheet próprio, incluindo troca de severidade persistida no banco.

### Performance: PDF em paralelo, índices de busca, code-splitting (feito)

Primeiros itens da rodada de melhorias pós-deploy (pesquisa de mercado + auditoria de código de julho/2026, ver "Ideias guardadas" acima).

- `report.service.ts`: as fotos do laudo eram baixadas do MinIO **uma por vez** num loop sequencial — com muitas fotos numa OS, a latência do PDF multiplicava. Agora todas as mídias (`intake` + capítulos) são coletadas numa lista e baixadas via `Promise.all`, populando um `photoLookup` único consultado depois na montagem dos capítulos. Testado gerando o PDF da OS #9002 (200 OK, 124KB, sem regressão de conteúdo).
- Índices adicionados (SQL Server não indexa FK automaticamente): `clients.name`, `clients.cpf`, `clients.tenant` (FK), `cars.plate`, `cars.tenant` (FK), `service_orders.tenant` (FK) — cobrem as buscas de cliente/veículo e o filtro por tenant que roda em toda query sensível do sistema. Confirmado via `sys.indexes` que o `synchronize: true` criou os índices no banco de dev sem precisar de script manual (diferente do gotcha de `@Check`, `@Index` novo em coluna existente não tem esse problema).
- `App.tsx`: todas as páginas viraram `React.lazy` (antes um bundle único de 687KB). Build agora gera um chunk por página (a maior, `OsWorkPage`, cai pra 57KB gzip; a página pública do cliente — a que mais importa carregar rápido no 4G — cai pra ~22KB). `<Suspense>` com spinner simples como fallback.

### Editar cliente e veículo (feito)

`ClientsPage`/`CarsPage` eram somente leitura — sem jeito de corrigir um telefone ou placa digitada errada sem mexer direto no banco.

- `PATCH /clients/:id` e `PATCH /cars/:id` (`UpdateClientDto`/`UpdateCarDto`, todos os campos opcionais), tenant-scoped igual todo o resto do sistema (`ForbiddenException` se o registro não pertence ao tenant do usuário). Trocar o CPF do cliente reaproveita a mesma checagem de duplicidade do `create` (exclui o próprio ID da busca).
- `EditClientSheet.tsx`/`EditCarSheet.tsx` (novos, em `src/components/clients/` e `src/components/cars/`) reaproveitam os campos com máscara/validação já existentes (`PhoneField`, `CpfField`, `PlateField`, `YearField`, `KmField`). Botão "Editar" nas duas páginas de listagem abre o sheet pré-preenchido.
- Testado ponta a ponta com usuário descartável: editar endereço de um cliente e cor de um veículo persistiu corretamente no banco em ambos os casos.

### Busca no dashboard (feito)

Com 18+ OS na lista (e crescendo), rolar a página inteira procurando um cliente ou placa vira inviável.

- Filtro **client-side** em `dashBoardPage.tsx` (`filteredOrders`, via `useMemo`) — sem round-trip novo ao backend, já que a lista completa do status selecionado já vem carregada. Busca por nome do cliente, placa (normalizada, ignora hífen/maiúsculas) ou número da OS, combinados num único campo.
- Métricas do topo (Clientes/Veículos/Criadas hoje) continuam calculadas sobre `orders` (não filtrado) — a busca só afeta a lista, não os cartões de resumo.
- Testado: buscar "deleon" filtrou 18 OS pra 2; buscar a placa "doo0037" (sem hífen, minúscula) achou as 9 OS que compartilham essa placa nos dados de teste; buscar "9005" achou só a OS #9005.

### PWA — instalável na tela inicial (feito)

Pesquisa de mercado (julho/2026) apontou PWA como caminho certo antes de app nativo: mesma sensação de "app" (ícone, tela cheia, cache offline básico) por uma fração do custo/tempo — e o frontend já é mobile-first.

- `vite-plugin-pwa` instalado, configurado em `vite.config.ts` (`registerType: 'autoUpdate'`, `devOptions.enabled: true` pra também funcionar no servidor de dev, não só no build de produção). Gera `manifest.webmanifest` + service worker (`sw.js`) automaticamente a cada build; nenhuma mudança necessária no `Dockerfile.proxy` (já copia `dist/` inteiro).
- Ícones (`public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) gerados a partir do `logoOficinaSync.png` existente via `sharp` (usado uma vez, depois desinstalado — não é dependência do projeto). `index.html` ganhou `<meta name="theme-color">` + `apple-touch-icon` + meta tags de app iOS (Safari não lê o manifest do mesmo jeito que Android/Chrome).
- `start_url: '/dashboard'` — o "app" instalável é voltado pro mecânico (quem usa no dia a dia); a página pública do cliente não tem manifest próprio (um único manifest por origem). Deixar o cliente instalar a página dele como app é ideia guardada pra depois, não implementada agora.
- Testado no servidor de dev: manifest serve corretamente via `fetch`, Service Worker registra (`navigator.serviceWorker.getRegistrations()` retorna 1, escopo `/`), os 3 ícones respondem 200. Build de produção gera os arquivos esperados (`dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest`, `dist/icon-*.png`).

### Histórico do veículo + KM por visita (feito)

Antes, `mileage_in` morava só em `cars` — reaproveitar um carro numa OS nova sobrescrevia (ou, na prática, deixava estático) o KM de entrada, perdendo o valor real daquela visita específica; e não existia nenhuma tela pra ver o histórico de OS de um veículo.

- **Decisão arquitetural**: em vez de mover `mileage_in` inteiramente de `cars` pra `service_orders` (migration arriscada, perde a semântica de "KM na primeira entrada"), a solução foi **aditiva**: `service_orders` ganhou uma coluna `mileage_in` nullable própria (KM daquela visita específica), enquanto `cars.mileage_in` continua intocado (KM da primeira entrada do carro, nunca mais sobrescrito ao reaproveitar o carro). Todo lugar que exibe KM (`findById`, `findByPublicToken`, `findAll`, `findByCar`) resolve como `serviceOrder.mileage_in ?? serviceOrder.car.mileage_in` — OS antigas (sem o campo populado) continuam mostrando o KM do carro como fallback.
- Backend: `CreateServiceOrderDto.mileage_in` (opcional), `ServiceOrdersService.findByCar(carId, userId)` (tenant-scoped, retorna as OS do carro ordenadas por criação desc.), `GET /service_orders/by-car/:carId` (rota nova). `CarsService.findOneScoped(carId, userId)` + `GET /cars/:id` (rota nova, não existia nenhum `GET` de carro único antes).
- Frontend: `OsCreateWizardPage.tsx` — ao reaproveitar um carro já cadastrado (fluxo de busca de cliente/veículo existente), mostra um campo **"KM atual (nessa visita)"** pré-preenchido com o último KM conhecido do carro, mas editável; `submitAll()` manda esse valor no `POST /service_orders`. `dashBoardPage.tsx`/`OsWorkPage.tsx` exibem `order.mileage_in` (o da visita) em vez de `car.mileage_in`. Nova `CarHistoryPage.tsx` (`/veiculos/:id`) — resumo do veículo + lista clicável de todas as suas OS com KM por visita, acessível clicando num card em `CarsPage.tsx` (antes só tinha o botão "Editar", sem jeito de ver o histórico).
- Testado ponta a ponta com veículo descartável: criada 1ª OS com KM 50.000, 2ª OS reaproveitando o mesmo carro com KM 55.500 — confirmado via API que `cars.mileage_in` permanece 50.000 (âncora histórica) enquanto cada OS guarda seu próprio valor; `CarHistoryPage` lista as duas OS com "KM 55.500"/"KM 50.000" corretos; dashboard e `OsWorkPage` exibem o KM da visita certa por OS; wizard pré-preenche o campo de KM ao reaproveitar o carro e permite editar antes de enviar.

### Foto do carro no card do dashboard (feito)

Cards da lista de OS eram só texto — difícil bater o olho e reconhecer o carro de longe numa lista com muitas OS.

- `ServiceOrdersService.findAll` passou a usar `createQueryBuilder` (era `repository.find`) pra fazer `leftJoinAndSelect` condicional na section `checkin` + na media com `label = 'Frente do veículo'` (mesma string usada em `photoLabels.front` do `OsCreateWizardPage.tsx` — combinar os dois se um dia mudar). Photo URL vem do `MinioService.getPresignedUrl`, resolvida em `Promise.all` pra não serializar (mesmo padrão do `report.service.ts`). Campo novo `photo_url: string | null` na resposta — `null` quando a OS não tem check-in publicado com essa foto ainda (OS recém-criada, por exemplo).
- `dashBoardPage.tsx`: thumbnail 20x20 à esquerda do card (`hidden sm:block` — some em telas muito estreitas), com fallback pro ícone de carro genérico quando `photo_url` é `null` ou a imagem falha ao carregar (`onError` esconde a tag).
- Testado ponta a ponta: OS com foto "Frente do veículo" enviada mostra o `<img>` com a URL presigned do MinIO carregando de verdade; OS sem check-in publicado mostra o ícone de carro genérico — confirmado inspecionando o DOM das duas variantes lado a lado.

### Templates de teste por componente (feito)

Ideia do Leonardo: pra qualquer sensor/atuador, poder testar separadamente alimentação/sinal/etc. em vez de só um veredito único — ex. "alimentação chegando (12V), mas o sensor não está marcando sinal" no sensor de roda do ABS traseiro.

- O modelo genérico de teste (`title` + `measurements[]` de `{label, expected?, actual}`) já suportava isso sem mudança nenhuma de schema — faltava só a UX de não digitar tudo na mão toda vez.
- `frontend/oficinasync-web/src/lib/testComponentTemplates.ts` (novo): catálogo de 15 componentes comuns num carro flex (sensores MAP/MAF/TPS/CKP/CMP/lambda/ECT/knock/roda ABS, bico injetor, bobina de ignição, válvula IAC, bomba de combustível, relé, motor de partida), cada um com as linhas de medição típicas já com o `label` (e `expected` quando aplicável, ex: "12V") preenchidos.
- `GenericTestForm.tsx` ganhou `applyTemplate()` — clicar num chip do catálogo preenche o título **e** substitui as linhas de medição (mantendo os campos "esperado" sugeridos, deixando "medido" em branco pro mecânico preencher); só aparece na criação (não na edição, pra não sobrescrever um teste já preenchido). Chips ficam visualmente diferenciados dos `titleSuggestions` antigos (borda/fundo lime) por preencherem mais que só o título.
- Testado ponta a ponta: abrir "Outro teste" → catálogo aparece com os 15 componentes → clicar "Sensor de roda ABS" preenche título + 3 linhas (Alimentação/Sinal/Resistência da bobina) com "12V" já sugerido na primeira → preencher "medido" (12V / sem variação) e salvar persistiu corretamente, exibido na etapa exatamente como o cenário que o Leonardo descreveu (alimentação ok, sinal ausente).
- Catálogo é só frontend — fácil de estender (`testComponentTemplates.ts`) conforme surgirem outros componentes recorrentes na oficina.

### Histórico cross-OS de diagnósticos por modelo de carro (feito)

Ideia do Leonardo, a mais ambiciosa das três dessa rodada — um "doutor interno": ao testar um componente num carro, ver o resultado de testes iguais/parecidos já feitos em outros veículos do mesmo modelo, pra comparar o diagnóstico atual com o histórico (ex: "esse Celta 2010 deu 5V na alimentação e sinal normal; esse aqui deu só 1.5V — tem algo errado").

- `TestsService.findHistory(carId, userId, title?, testType?)` (novo) — resolve o carro (`CarsService.findOneScoped`, já tenant-scoped), busca `Tests` via `createQueryBuilder` juntando `test → section → serviceOrder → car`, filtrando por `car.tenant_id` (segurança multi-tenant) + `car.brand`/`car.model` **iguais** ao carro atual (não filtra por veículo específico — o objetivo é justamente comparar entre carros diferentes do mesmo modelo). Casa por `test_type` exato quando informado (testes especializados) ou por `title LIKE %termo%` quando não (testes genéricos); exige pelo menos um dos dois, senão retorna vazio (evita devolver histórico aleatório sem contexto). Ordena por mais recente, limita a 10. `GET /tests/history?car_id=&title=` ou `&test_type=` (rota nova, antes de `:id` na ordem do controller).
- `TestsModule` passou a importar `CarsModule` (sem ciclo — `CarsModule` não depende de `TestsModule`).
- Frontend: `src/components/os/TestHistoryPanel.tsx` (novo) — painel com botão "Buscar histórico" (busca sob demanda, não automática a cada tecla) que lista os testes parecidos encontrados: carro (marca/modelo/ano/placa), data, medições com o `actual`/`expected` de cada linha, veredito, e um link "Ver OS #X" que navega direto pra ela. Plugado no `GenericTestForm.tsx` (aparece assim que o título tem conteúdo — seja digitado à mão ou preenchido por um dos templates de componente da seção anterior) via `carId` novo, passado por `AddTestSheet` → `OsWorkPage` (`data.car.car_id`). Só na criação (`AddTestSheet`), não na edição (`EditTestSheet`) — o mecânico já tem o resultado na mão ao editar.
- Testado ponta a ponta com 2 veículos Chevrolet Celta 2010 descartáveis, tenants diferentes das mesmas features testadas antes: 1º carro recebeu teste "Sensor MAP (pressão do coletor)" com alimentação 5V/sinal normal (aprovado); no 2º carro, abrir o mesmo teste via template mostrou o painel de histórico trazendo exatamente esse resultado do 1º carro (marca/modelo/ano/placa corretos, medições, veredito "Aprovado", link funcional pra OS de origem) — confirmado tanto pela UI quanto por chamada direta à API.

### Testes de isolamento entre oficinas + limites de upload (feito)

Primeira parte do "Lançamento enxuto" (spec `docs/superpowers/specs/2026-10-11-lancamento-enxuto-design.md`, plano `docs/superpowers/plans/2026-10-11-fundacao-segura.md`, relatório `docs/superpowers/audits/2026-10-11-multi-tenant-audit.md`).

- **Suíte e2e** (`cd backend && npm run test:e2e`, precisa de `docker compose up -d sqlserver minio`): sobe o `AppModule` real contra o banco `oficinasync_test` (criado sozinho; o schema vem das migrations) e o bucket `oficinasync-test`, semeia duas oficinas e prova que a A não lê/altera nada da B. **Rodar antes de qualquer deploy que mexa em rotas.** Unit tests: `npm test`. `file-type` e `puppeteer` são ESM-only e não carregam no Jest — o e2e usa stubs (`test/stubs/`), então geração real de PDF e detecção real de tipo de mídia não são exercitadas ali.
- **Mass assignment (achado do revisor final, Critical)**: o `ValidationPipe` global não tinha `whitelist` e os services fazem `repository.create(dto)`/`Object.assign(entity, dto)` — um anônimo em `POST /auth/register` com `tenant`/`is_active`/`user_id` entrava em qualquer oficina ou sobrescrevia outra conta. Agora `appValidationPipe()` (`src/common/validation.ts`, `whitelist: true`) é usado em `main.ts` e nos testes. **Regra: todo campo de DTO de entrada precisa de ao menos um decorator do class-validator, senão é removido** (foi o caso de `LoginDto.password`). Uploads simultâneos limitados a 4 (`UploadConcurrencyInterceptor`).
- **Vazamentos corrigidos**: `GET /service_orders/:id` não validava tenant (qualquer logado lia qualquer OS, com CPF do cliente); `POST /service_orders` aceitava carro de outra oficina; `JwtAuthGuard` ignorava o `scope` (agora `access` por padrão, `@RequireTokenScope('onboarding')` só em `POST /tenants`; token antigo sem scope vale como access); `POST /users` público removido; id inexistente de cliente/carro agora é 404.
- **Limites de upload**: foto 15 MB, áudio 20 MB, vídeo 100 MB (`src/modules/minio/upload-limits.ts`, 413 em português), teto duro do multer 100 MB, **cota por oficina** `TENANT_STORAGE_QUOTA_MB` (default 2048; soma com `CAST(... AS BIGINT)` porque `SUM(int)` estoura em 2 GB no SQL Server).
- **Vídeo de divulgação** (ffmpeg) fica **desligado por padrão** (`PROMO_VIDEO_ENABLED=true` liga; 1 geração por vez via `ConcurrencyLimiter`). `GET /service_orders/:id` devolve `features.promo_video` e o `OsWorkPage` esconde o botão "Gerar vídeo" quando desligado. A captura de vídeo na OS não muda.
- **Pendente do lançamento** (Planos B e C): guard de assinatura/trial 14 dias, painel super-admin, cobrança manual (§4.3–4.5), termos/privacidade/landing e backup/uptime (§4.6–4.7).

### Deploy automático (GitHub Actions) (feito, aguardando configuração dos segredos)

- `.github/workflows/deploy.yml`: push na branch **`production`** (`git push origin main:production`) roda os testes (unitários + e2e com SQL Server e MinIO de teste + builds) e, se passarem, publica na VPS via SSH. Push na `main` **não** publica. `workflow_dispatch` republica a `production`.
- `deploy/deploy.sh` (roda na VPS): lock → recusa se há arquivo rastreado alterado → **backup do banco (aborta se falhar)** → `git fetch` + `merge --ff-only` → `docker compose up -d --build` → espera `/health` → se não responder, **rollback do código** (migrations NÃO são desfeitas; o log aponta o backup) → mantém os 7 últimos backups em `/opt/oficinasync-backups`. Corpo todo dentro de `main()` porque o `git pull` pode trocar o próprio arquivo durante a execução.
- A chave SSH do GitHub é só pra isso: `authorized_keys` com `command="/opt/oficinasync/deploy/deploy.sh"` (sem shell). Passo a passo e os 4 segredos (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`) em `DEPLOY.md` seção 10.
- Verificado localmente: `bash deploy/test-deploy.sh` (22 checagens com `docker`/`curl` falsos: sucesso, rollback, nada novo, árvore suja, backup falhando, rotação), `shellcheck` e `actionlint` limpos, e a suíte inteira passando **sem** `backend/.env` (só variáveis de ambiente, como no CI). **O workflow em si ainda não rodou no GitHub** — a primeira execução real pode pedir ajuste.
- O primeiro deploy leva tudo da `main`, **incluindo o OBD** (decisão do Leonardo em 2026-10-15: as correções de segurança não podem esperar; o OBD fica inerte sem dongle — cria a tabela `obd_devices` por migration).

### Testes de tela e de lógica do frontend (`ui-tests/`) (feito)

Pacote separado na raiz (não mexe no `package.json` do frontend). **Playwright** (`e2e/`): sobe o backend compilado (`backend/dist`) no banco de TESTE na porta 3100 + o frontend em dev na 5183 (portas próprias, não colidem com o dia a dia), cria uma oficina+dono novos (`backend/test/ui-seed.ts`) e começa logado via `storageState`. Cobre login (erro visível, sucesso), rota raiz (regressão da tela branca do Android — provado: com o `App.tsx` antigo os 3 testes falham), e o wizard de abrir OS inteiro (4 fotos obrigatórias, botão travado com CPF inválido). **Vitest** (`unit/`): `validators.ts` (CPF, CNPJ, telefone/E.164, placa, ano, km, senha) e `viaCep.ts` (fetch simulado). Rodar: `cd ui-tests && npm run test:unit` e `npm run test:ui` (pré-requisitos no cabeçalho do `playwright.config.ts`: Docker com SQL Server+MinIO, `npm run build` no backend). O login é limitado a 5/min por IP: o `global-setup` faz 1 login e o `login.spec.ts` 2 — rerodar em menos de 1 minuto pode dar 429. **Ainda não está no CI** (workflow só roda backend + builds); entra quando o `.github/workflows` ganhar um job `telas`.

### Abertura rápida de OS — completar os dados depois (feito)

Pedido do Leonardo: no balcão o cliente às vezes já foi embora ou só deu o nome; o mecânico precisa abrir a OS na hora. Spec: `docs/superpowers/specs/2026-10-15-abertura-rapida-de-os-design.md`; plano: `docs/superpowers/plans/2026-10-15-abertura-rapida-de-os.md`.

- **Mínimo pra abrir = a placa.** Cliente opcional (em branco ou só o nome). Banco: `clients.phone/cpf/address` e `cars.brand/model/year/fuel_type/color/mileage_in/client_id` aceitam NULL (migration `PartialClientAndCarData`, escrita à mão — o `migration:generate` quebra com "Enum is not defined in column fuel_type" ao mudar a nulidade de coluna com `enum:`; só relaxa restrições, sem perda de dado; zero drift conferido com o generate contra o banco de teste).
- **Pendência é calculada, não guardada:** `computeMissingData(car, client)` (`serviceOrder/missing-data.ts`) devolve `{client:[{field,label}], car:[...]}`; `GET /service_orders/:id` e a lista trazem `missing_data` e `is_complete`. Exigido pra finalizar = a regra do wizard completo (cliente: nome, telefone, CPF, endereço; carro: marca, modelo, ano, combustível, cor, chassi ≥ 5, KM). E-mail opcional.
- **`PATCH /service_orders/:id/complete-data`** (atômico, transação, tenant-scoped, mapeamento campo a campo): `client_id` (usar cadastro existente) OU `client` (completa o atual / cria e liga) + `car`. CPF de outro cliente do tenant → **409 com `existing_client`** (a tela oferece "Usar o cadastro de X"). `client_id` e `client` juntos → 400.
- **`PATCH /service_orders/:id/finish`** → **409 `{message, missing_data}`** enquanto faltar dado; o tenant é checado antes (403 vence 409). A tela de finalizar abre a folha "Completar dados" **antes** de subir fotos/publicar etapa.
- **Gotcha:** no `ClientsService.create`, `where: { cpf: undefined }` do TypeORM IGNORA a condição e acharia qualquer cliente do tenant — a checagem de CPF duplicado só roda quando há CPF. Cliente sem CPF (NULL) não conflita com outro sem CPF.
- **Frontend:** `lib/display.ts` (texto reserva "Cliente não identificado", `carTitle`, `kmLabel`, `greeting`), `lib/quickOpen.ts` (validação parcial + payloads só com o preenchido + prévia de pendências), wizard com interruptor "Abertura rápida" + "Pular cliente" + fotos opcionais (sem foto nenhuma, a etapa `checkin` nem é criada), `components/os/CompleteDataSheet.tsx`, banner "Dados pendentes" na `OsWorkPage`, selo no dashboard. No modo rápido o combustível começa em branco (não se "chuta" flex). `ApiError` agora guarda o corpo da resposta (`body`).
- Testes: unit (`missing-data`, `report.template`), e2e backend (`partial-data`, `quick-open-read`, `complete-data`, `finish-gate`, `client-optional-email`), Vitest (`display`, `quickOpen`), Playwright (`abertura-rapida.spec.ts`).
- **Revisão final (corrigido, com teste):** `/clientes` e o Editar cliente quebravam com cliente só-nome (null em phone/cpf); `EditCarSheet` gravava ano 0/KM 0/flex em carro parcial (agora manda só o preenchido; ano exige `@Min(1900)` e `computeMissingData` trata ano < 1900 como faltando); `null` em campo opcional virava "não enviado" (`!= null` no `completeData`/`CarsService.create` — `@IsOptional` deixa `null` passar e `where: { client_id: null }` do TypeORM ignora a condição e acha o primeiro cliente da tabela); tela de finalizar não monta o sheet (que liga o tema escuro no body) enquanto fechado. **Bug antigo achado de passagem:** `GET /cars?search=<placa de 6+ chars>` dava 500 — o `ILike` herda `varchar(7)` da coluna `plate` no mssql; agora usa `Raw(LOWER(col) LIKE LOWER(:p))`. **Decisão em aberto (spec):** o modo rápido com a placa de um carro já cadastrado cria carro duplicado (carros só são listados por cliente) — falta buscar por placa no passo do veículo.
- **Observação de repo:** `frontend/oficinasync-web/` tem um `.git` aninhado antigo (inofensivo) — rode `git` sempre da raiz do projeto.

### Dados internos da OS + ficha do escritório + equipe/comissão + passo a passo (feito)

Pedido do Leonardo pro teste na Lima com todos os funcionários: o escritório monta a OS formal/nota em OUTRO sistema, então precisa receber do mecânico peças (código, quantidade, preço, foto da caixa), serviços e a divisão de comissão. Spec: `docs/superpowers/specs/2026-10-17-dados-internos-e-ficha-do-escritorio-design.md`; plano: `docs/superpowers/plans/2026-10-17-dados-internos-e-ficha-do-escritorio.md`.

- **Tudo é interno**: `InternalModule` (`backend/src/modules/internal/`) com rotas próprias `/service_orders/:id/{internal,parts,services,participants,responsible,office-sheet}`, `/commissions`, `/users/team`. `GET /service_orders/:id`, a rota pública e o laudo **não conhecem** esses dados; `no-leak.spec.ts` trava isso (arquivos do laudo/rota pública não podem referenciar as entidades internas) e `internal-sheet.e2e-spec.ts` varre as respostas com valores-sentinela.
- **Perfis:** dono e recepção = escritório (veem/editam tudo); mecânico vê só o dele. `permissionsFor(viewer, orderDone)` (`internal-access.ts`) é a fonte única. Responsável = `responsible_user_id ?? user_id` (quem abriu; o escritório troca). Mecânico comum recebe só a PRÓPRIA linha da equipe na API.
- **Equipe em %:** ajudantes 1–99 cada, soma ≤ 99, responsável fica com `100 − soma` (não é digitado). `PUT /participants` substitui a lista inteira. Comissão só em % (a OS não tem preço; R$ vem com o orçamento digital).
- **Peças:** retiradas × usadas (`used_quantity` null = sem acerto, ≤ retirada), preço opcional (null = "preço não informado"), foto da caixa interna (`photo_*` na própria peça, **entra na cota** — `MediaService.getTenantUsageBytes` soma; só aceita imagem com tipo DETECTADO). Acerto pendente NÃO bloqueia finalizar (aparece em amarelo na ficha). Após finalizar, só o escritório edita peças/serviços/equipe.
- **Ficha** (`/os/:id/ficha`): escritório + responsável; copiar por bloco/tudo (`sheetToText`), imprimir via `window.print()`; todo texto é escapado pelo React. Telas: `OsOfficePage` (`/os/:id/escritorio`), `CommissionsPage` (`/comissoes`).
- **Didático:** `GuidedTour` + `tours.ts` (por perfil, `localStorage` por usuário e versão; "Rever passo a passo" em Configurações), `HelpHint` ("?"). Menu: Scanner só com `VITE_FEATURE_OBD=true`; Equipe só pro dono.
- **Gotchas:** `@IsOptional()` deixa `null` passar — nos PATCH de peça/serviço `null` em `code/used_quantity/unit_price/price` significa LIMPAR; `decimal` do SQL Server volta string (usar `decimalTransformer`); datas `'YYYY-MM-DD'` do `/commissions` são lidas como dia LOCAL; testes e2e criam funcionários com `createStaff` (token assinado direto, sem `/auth/login` que tem limite de 5/min); o `global-setup` dos testes de tela cria também um mecânico (`e2e/.auth/mechanic.json`) e pré-marca o passo a passo como visto; o ambiente de teste manual (`start-env.sh`) precisa estar parado antes do Playwright.
- **Pré-requisitos pra usar na Lima:** deploy da versão atual (produção está na antiga), e-mail de convite funcionando (SPF/DKIM) e backup mínimo — ver `docs/equipe/lancamento-publico/`.

### Endurecimento pré-lançamento (feito, 2026-10-17) + estado do deploy

Vindo da auditoria do time (`docs/equipe/lancamento-publico/01-seguranca-dados-lgpd.md`, `03-devops-operacao.md`):

- **Login expira:** `JwtModule` (`AuthModule` e `InvitesModule`) usa `signOptions.expiresIn = JWT_EXPIRES_IN || '1d'` (antes o token nascia eterno). Onboarding continua 15 min.
- **HTML escapado:** `src/common/html.ts` (`escapeHtml`, `oneLine`) aplicado em TODO texto do usuário no laudo (`report.template.ts`, cabeçalho/rodapé) e nos e-mails (`emailResend.service.ts`); `report.escape.spec.ts` injeta `"><img src=x onerror=1><script>…` em todos os campos. O Puppeteer roda com **JS desligado e rede bloqueada** (só `data:` URI) — verificado gerando PDF real com Chromium (o e2e usa stub de puppeteer).
- **Sem `console.log`** no código de produção (vazava token de verificação e dados de mídia); `no-console-log.spec.ts` trava.
- **API pública** (`/service_orders/public/:token`) devolve só `client.name` (telefone/CPF nunca); página do cliente com `<meta robots noindex>` e Caddy com `X-Robots-Tag` em `/servico/*`; Caddy também põe HSTS, nosniff, Referrer-Policy; `x-powered-by` desligado.
- `npm audit fix` no backend (altas/críticas zeradas; sobram 7 baixas/moderadas). **Cuidado:** `npm audit fix --omit=dev` PODA as dependências de desenvolvimento do `node_modules` — rode `npm install` depois.
- `.gitignore` ignora `.env.production`; `backend/.env.example` só com placeholders. **O repositório GitHub é público** e o histórico de março ainda tem senhas antigas de dev — trocar os segredos de produção e/ou tornar o repo privado.
- **Primeiro deploy automático FEITO em 2026-10-17** (commit `3720e56`): os 4 segredos estão no GitHub, a chave de deploy está no `authorized_keys` da VPS (Hostinger, `srv1800935`, 187.127.46.129) e o workflow testou e publicou sozinho. Daqui pra frente: `git push origin main:production` publica. As imagens Docker usam **Debian 12 (bookworm)**: a base bullseye saiu de suporte e o `apt-get` dava 404. O CI agora constrói as imagens (passo "Imagens Docker — build") pra pegar isso antes da VPS.
- **Deploy:** `deploy.sh` agora usa `sqlcmd -b` (erro no BACKUP derruba o script) e grava `.last_deployed_sha` (o primeiro deploy reconstrói mesmo com a VPS já no commit da production). Passo a passo e variáveis novas: `DEPLOY.md` 10.3. Em 2026-10-17 a `main` e a `production` foram empurradas pro GitHub; **o passo de publicar na VPS só roda com os 4 segredos do GitHub + chave de deploy na VPS** (ver 10.1/10.3).

### Reforma visual "Cinema Escuro Premium" — Fase 1: Fundação (feito, branch `feat/reforma-visual-fase1`)

Pedido do Leonardo (2026-10-17): o app "parecia amador, feito com IA, não valia R$ 99/mês", sem animação, sem pensar em quem quase não lê nem escreve (mecânico com mão suja, Android, tablet no futuro).

**Plano em 5 fases**, uma spec cada:
- **Fase 1:** fundação (esta).
- **Fase 2:** modo simples do mecânico, com voz pelo reconhecimento grátis do navegador, áudio ou texto, e "Como o carro chegou" (proteção do mecânico).
- **Fase 3:** modo controle do escritório (depois: desempenho por funcionário).
- **Fase 4:** página do cliente vitrine.
- **Fase 5:** landing "acesso antecipado", **deixando explícito que está em desenvolvimento**.

Spec: `docs/superpowers/specs/2026-10-17-reforma-visual-fase1-fundacao-design.md`; plano: `docs/superpowers/plans/2026-10-17-reforma-visual-fase1-fundacao.md`; antes e depois: `docs/equipe/reforma-visual/fase1-antes-depois.md`.

- **Tema global:**
  - `<html class="dark">` no `index.html`. O `useDarkTheme` ficou inofensivo.
  - A ficha (`OsSheetPage`) continua clara de propósito, para impressão.
  - `:where(h1,h2)` em caixa alta e Saira. A página pública neutraliza com `[&_h1]:normal-case`.
- **Fontes:** Saira Condensed (700/800, títulos e botões) e Archivo (400/600/700). São arquivos `.woff2` versionados em `src/assets/fonts` (OFL), **não** `@fontsource`, para não mexer no `package.json` do frontend.
- **Tokens:**
  - `--warning` amarelo `#facc15` para alerta e `--danger`; limão continua `--brand`.
  - Utilitários `app-glow` (brilho limão no topo) e `skeleton-shimmer`.
- **Marca:**
  - `@/components/brand/BrandLogo` (`BrandLogo`, `BrandSymbol`), em vetor, `data-brand="oficinasync-gear"`.
  - Ícones do app gerados com `node ui-tests/scripts/gen-brand-icons.mjs`.
- **Animações** (`@/components/motion`), todas respeitando "menos movimento":
  - `celebrate("msg")` dispara a comemoração; o `CelebrationHost` está montado no `App`.
  - `PhotoFlash` para o flash da foto.
  - `haptic()` em `@/lib/haptics` para a vibração.
- **Kit** (`@/components/kit`): `BigButton` (≥56px, `hint` diz o que falta quando desabilitado), `ActionTile`, `StatusChip`, `AlertBanner`, `PageHeader`, `TextField`/`SelectField`/`TextAreaField`. `fieldClass`/`fieldClassCompact` é o visual único de **todo** campo do sistema; use-o em campo novo.
- **Duas caras** (`@/components/shell`):
  - `AppShell` envolve as 8 rotas com menu e escolhe pelo `modeFor(role, preferência)` (`@/lib/mode`).
  - Mecânico → `SimpleShell` (barra embaixo). Escritório → `ControlShell` (menu lateral).
  - O dono alterna (`ModeSwitch`); a preferência fica em `localStorage` `oficinasync_mode_<id>`, lida de forma síncrona para não piscar.
  - As páginas **não** montam mais `DashboardSidebar`/`SidebarInset`. `logout()` fica em `@/lib/session`.
- **Testes:**
  - O Vitest (`ui-tests/unit`) agora renderiza componentes do frontend via `react-dom/server` (alias de `@/` e do React do frontend no `vitest.config.ts`).
  - `e2e/fundacao.spec.ts` cobre fundo escuro, letra, favicon, as duas caras, a comemoração e as regressões da revisão.
  - O passo a passo foi para a v2. O `global-setup` usa `tourKey()`.
- **Limite da API configurável:**
  - O padrão continua 60 req/min por IP; `THROTTLE_LIMIT` ajusta.
  - Os testes de tela e o `start-env.sh` usam 1000, porque a bateria estourava o limite.
  - **Decisão pendente do Leonardo:** subir em produção, já que a oficina inteira sai pelo mesmo IP.

### Rodada de usabilidade simulada + correções (feito, 2026-10-19)

Personas simuladas (Seu Zé 6/10 no modo simples, Dona Cida 6,5/10 no balcão — relatórios em `docs/equipe/feedback/2026-10-17-*.md`). Corrigido com teste de regressão (`backend/test/usability-round.e2e-spec.ts`, `ui-tests/e2e/usabilidade.spec.ts` + unitários):
- **Datas em UTC** (`useUTC: true` no mssql, `app.module.ts` e `data-source.ts`): em máquina fora de UTC, `GETDATE()` do banco e as datas gravadas pelo Node ficavam 3h desencontradas ("criada 01:28 do dia seguinte"). Produção já rodava em UTC, então os dados de lá não mudam.
- **CPF repetido:** `POST /clients` devolve 409 com `message` ("Este CPF já é do cliente X…") e `existing_client`; o cadastro de OS avisa **na hora** que o CPF é digitado e oferece "Usar esse cadastro".
- **Busca de veículo pelo nome do dono**, sem acento (`COLLATE Latin1_General_CI_AI`).
- **Rascunho da abertura de OS** (`src/lib/osDraft.ts`, `localStorage` `oficinasync_os_draft`, 24h, sem fotos): interrupção não apaga; toast "Rascunho recuperado" com "Começar do zero"; limpa ao criar a OS.
- **"Continuar" travado diz o que falta** (`src/lib/wizardMissing.ts`, prop `nextHint` do `WizardShell`).
- **OS:** botão "Mandar no WhatsApp" (`src/lib/whatsapp.ts`, `wa.me`, sem API paga) e "Copiar link" avisa e mostra o link quando o celular bloqueia a cópia.
- **Ficha:** com peça retirada sem acerto o total vira "TOTAL PARCIAL" com aviso (antes parecia R$ 0,00).
- **Saudação** "Olá, Sr. Antônio." (antes "Olá, Sr.."); teste de bateria pergunta o resultado uma vez só (`bateriaResultadoFromVerdict`).
- Ambiente de teste: `FRONTEND_URL` na porta 5183 (o link do cliente apontava pra 5173).
- **Ficou pra Fase 2** (tela da OS): 6 botões no topo, "Finalizar" principal cedo demais, barra de baixo some dentro da OS, voltar pequeno, botões de etapa de 34px.

### Abertura de OS guiada — uma pergunta por tela (feito, 2026-10-19; Fase 2 da reforma visual)

Substitui o `OsCreateWizardPage` (apagado, junto com `WizardShell`, `EntryPhotoSlot`, `lib/quickOpen.ts` e o rascunho v1) na rota `/os-client-create`. Spec: `docs/superpowers/specs/2026-10-19-abertura-de-os-guiada-design.md`; plano: `docs/superpowers/plans/2026-10-19-abertura-de-os-guiada.md`.

- **Telas** (`GuidedOpenPage` + `src/components/guided-open/`):
  1. Placa
  2. Marca
  3. Modelo
  4. Ano (2 a 4: toque e avança)
  5. KM, com `painel-km.svg` e o hodômetro piscando
  6. Combustível, cor e chassi (opcionais)
  7. Defeito: **texto obrigatório** + ditado grátis do navegador (`DictationButton`/`lib/dictation.ts`) + áudio e vídeo opcionais
  8. "O cliente está aqui?" (Não → o escritório completa)
  9. 4 fotos guiadas **obrigatórias**, com as ilustrações do Leonardo em `src/assets/illustrations/`, + "mais fotos?"
  10. Conferir

  Mecânico e escritório usam a mesma tela.
- **Regras puras** em `src/lib/guidedOpen.ts`: `stepsFor` (carro reconhecido pula o que o cadastro já tem; "corrigir" reabre tudo), `missingFor` (vira o `nextHint`), `buildCarPayload` (carro novo → create; reconhecido → patch só do que mudou; **nunca cria carro repetido**), `buildOrderPayload`, `editPlate`. Catálogo de modelos e cores em `src/lib/carCatalog.ts`.
- **Envio retomável e em fila** (`src/lib/guidedSubmit.ts`): cliente → carro → OS → etapa `intake` (áudio, vídeo, triagem) → `checkin` (fotos com os rótulos "Frente do veículo" etc., que o dashboard usa). Falha no meio + tocar de novo continua de onde parou. Uploads vão **um por vez**, porque o servidor aceita só 4 envios simultâneos no total.
- **Rascunho v2** (`osDraft.ts`: `saveGuidedDraft`/`loadGuidedDraft`): guarda as respostas e a tela, não os arquivos. O formato antigo é ignorado. Recuperado na revisão, volta pras fotos.
- **Backend:**
  - **`service_orders.client_id`** (opção A: a OS guarda quem trouxe o carro naquela visita). A migration `ServiceOrderClient` copiou o dono do carro pra todas as OS existentes.
  - **Leia o cliente de uma OS SEMPRE por `orderClient(order)`** (`serviceOrder/order-client.ts`, `order.client ?? car.client`), nunca `car.client`. `POST /service_orders` aceita `client_id`: valida o tenant; sem ele, herda o dono do carro; carro sem dono ganha esse dono. `completeData` mexe no cliente da OS e só dá dono ao carro se ele não tinha.
  - **`GET /cars/by-plate/:plate`**: placa exata, normalizada, por oficina, com `last_mileage` (OS mais recente) e `owner`. Declarada antes de `:id`. Usa `Raw(UPPER(REPLACE(...)))` por causa do `varchar(7)`.
- **Medição** (persona Seu Zé, `docs/equipe/feedback/2026-10-19-seu-ze-abertura-guiada.md`):
  - nota 8/10 (o wizard antigo tinha 6);
  - carro conhecido em 56s (15 toques);
  - carro novo em ~2 min (23 toques).
- **Pendências anotadas:**
  - avisar quando o carro já tem OS aberta;
  - KM da visita anterior vem preenchido (decidir: deixar em branco com a dica?);
  - tela da OS (resto da Fase 2);
  - os menores da revisão (ver o histórico do commit `53c2ae0`).

### Agentes por área (time de subagentes do projeto)

Definições em `.claude/agents/` (carregam ao abrir a sessão; `/agents` lista). Cada um é dono de uma área e conhece as regras deste arquivo. Eles trabalham **sob demanda** (não ficam vigiando sozinhos); rotinas recorrentes precisam de uma tarefa agendada.

| Agente | Área | Observação |
|---|---|---|
| `guardiao-seguranca` | segurança multi-tenant, auth, DTOs, uploads | **somente leitura**; reporta achados + teste que reproduz |
| `dev-backend` | `backend/` (NestJS, TypeORM, migrations) | TDD, tenant isolado, DTO com decorator |
| `dev-frontend` | `frontend/oficinasync-web/` e `ui-tests/` | mobile-first, Cinema Escuro |
| `qa-testes` | todas as suítes de teste | roda a bateria, acha lacunas, prova o vermelho |
| `devops-deploy` | `.github/`, `deploy/`, Docker, backup | nunca age na VPS nem faz push sozinho |
| `produto-receita` | planos, cobrança, LGPD, landing, specs | produz specs/planos; não implementa |
| `dev-mobile-iot` | `mobile/` (Android) e `Iot/` (OBD) | OBD pausado por decisão do Leonardo |
| `marketing-estrategia` | posicionamento, oferta, canais, textos de venda | nunca inventa número/cliente/depoimento; trabalha em dupla com o designer |
| `designer-ux` | identidade (Cinema Escuro), landing, fluxos, microtexto, acessibilidade | usa o plugin Design; entrega specs pro `dev-frontend` |
| `persona-seu-ze`, `persona-rafa`, `persona-dona-cida` | mecânicos/recepcionista **simulados** que usam o sistema de teste e dão feedback | Playwright MCP (`@playwright/mcp@0.0.83`) inline, só em `localhost:5183`; geram hipóteses, não prova |

**Protocolo do time** (fluxo por tema, pasta `docs/equipe/<tema>/`, regras, entrega ao Leonardo): `docs/equipe/README.md`. **Mecânicos simulados:** o coordenador sobe o ambiente de teste com `bash ui-tests/scripts/start-env.sh` (backend 3100 + frontend 5183 + oficina falsa; credenciais em `ui-tests/.persona-env.json`) e para com `bash ui-tests/scripts/stop-env.sh`; rode o `start-env.sh` com `run_in_background` (os servidores ficam vivos). **Agent teams** (agentes se falando direto) está ligado em `.claude/settings.local.json` (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, experimental, só sessão interativa, fora do git). O plugin **Marketing** (Anthropic) foi oferecido para instalar; as skills de design (plugin Design) já estão ativas. **Não verificado ainda:** os agentes novos só carregam em sessão nova, então as personas ainda não rodaram de ponta a ponta.

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

### Migrations do TypeORM (feito — `synchronize: false`)

O schema agora é versionado por **migrations**, não mais sincronizado automaticamente. `synchronize: true` era arriscado em produção (podia dropar/recriar coluna e perder dado — ex: renomear uma coluna vira DROP + ADD).

- `app.module.ts`: `synchronize: false`, `migrations: [__dirname + '/migrations/*{.ts,.js}']`, `migrationsRun: true` (roda as pendentes na subida — o deploy continua sendo só `git pull` + rebuild, as migrations rodam sozinhas).
- `src/data-source.ts` (novo): DataSource usado **só pelo CLI** do TypeORM (`migration:generate`/`run`/`revert`/`show`), lê as mesmas env vars via `dotenv`. Scripts no `package.json`: `npm run migration:generate -- src/migrations/Nome`, `migration:run`, `migration:revert`, `migration:show`.
- **Baseline de banco existente**: a `InitialSchema` (retrato fiel do schema atual, gerado com zero drift contra o dev real) tem uma guarda no topo do `up()` — `if (await queryRunner.hasTable('users')) return;`. Em banco já provisionado (dev e produção, criados pelo synchronize antigo) ela **não recria nada**, só é registrada como aplicada; em banco vazio (novo), cria tudo. Assim `migrationsRun: true` funciona em qualquer ambiente sem passo manual de baseline. Testado: dev real (11 users / 21 cars) intacto após rodar; banco vazio recria as 11 tabelas + FKs + checks + índices.
- **Gotcha de build resolvido de passagem**: o `nest build` local aninhava o output em `dist/src/` quando `scripts/` era compilado junto (rootDir subia pra raiz) — no Docker isso não acontecia porque o `.dockerignore` exclui `scripts`, mas o `dist/migrations/*.js` precisava ficar em `dist/migrations` (não `dist/src/migrations`) pro `migrationsRun` achar. Adicionado `scripts` ao `exclude` do `tsconfig.build.json` pra o build local ficar plano e determinístico, igual ao Docker (`dist/main.js` + `dist/migrations/*.js`).
- **Como criar uma migration nova daqui pra frente**: mudar a entidade → `npm run migration:generate -- src/migrations/DescricaoDaMudanca` (gera o diff automático contra o banco dev) → conferir o `up()`/`down()` gerado → commitar. No deploy o `migrationsRun` aplica sozinho. **Não usar mais `@Check`/`ALTER TABLE` manual** pra enums — a migration cuida disso agora (resolve o gotcha histórico de `@Check` que o synchronize não atualizava).

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
2. ~~**Cadastro de funcionários**~~ — feito. Tabela `invites`, `POST /invites` (só OWNER), aceite público em `/convite?token=` cria a conta já com tenant/cargo certos e loga automaticamente (ver seção "Cadastro de funcionários via convite" acima).
3. ~~**Deploy** em produção~~ — feito, rodando na VPS (`oficinasync.com.br`)
4. ~~**Migrar `synchronize: true`** para migrations do TypeORM~~ — feito, ver seção "Migrations do TypeORM (feito — `synchronize: false`)" acima
5. ~~**Gerar PDF do relatório**~~ — feito. `ReportModule` com Puppeteer, `GET /service_orders/:id/report.pdf`, botão "Baixar laudo PDF" no `OsWorkPage` e `OsFinishPage`. Reaproveita `tests` e `medias`. Gerado sob demanda, não persistido (fast-follow: salvar como `Media` pra aparecer também na página pública, precisa liberar `application/pdf` na whitelist do MinIO).
6. ~~**Vídeo de divulgação automático**~~ — feito. `VideoModule` com `fluent-ffmpeg`, `POST /service_orders/:id/promo-video` (assíncrono, polling via `promo_video_status`), botão "Gerar vídeo de divulgação" no `OsWorkPage`. Testado ponta a ponta com clipes sintéticos. Fast-follow possível: overlay de texto por seção, transições, escolher manualmente quais clipes entram.
7. ~~**Testes especializados (Fase 4)**~~ — feito. Leonardo trouxe um spec externo (`oficinasync_testes_spec.md`, ~50 tipos de teste, stack diferente — só a ideia foi aproveitada) propondo formulário/card/PDF dedicados por tipo. Decisão: híbrido — 4 tipos prioritários da oficina (Compressão Mecânica, Leitura de DTC, Bateria, Injetores no Banco) ganharam UI dedicada com captura de foto direto da câmera do celular (`capture="environment"`); os outros ~46 tipos continuam no formulário genérico. Testado ponta a ponta incluindo geração de PDF com os blocos especializados. ~~Edição de testes especializados já criados (antes só criar/excluir)~~ — feito depois, ver seção "Edição de testes especializados já criados". Fast-follow restante: mais tipos do catálogo conforme demanda real da oficina.

### Médio prazo — features validadas

8. **OBD:** retomado — **Fase 1 feita** (ver seção `ObdModule` acima: backend completo + ScannerPage + captura pra OS, testado com dispositivo simulado). Próximo: Fase 2 (tela dedicada com tempo real/gráfico) → Fase 3 (firmware v2 na bancada) → Fase 4 (wizard + LeituraDtcForm) — plano completo no plan file `happy-sprouting-panda.md`
9. **Anexar relatórios em PDF** dentro das sections (reaproveitar `medias`, adicionar `application/pdf` na whitelist) — depende do item 5 (geração de PDF)
10. **Mobile** (React Native) para o mecânico usar no chão de oficina

### Longo prazo

11. Landing page + política de privacidade + termos de uso (LGPD)
12. Planos e pagamento (Stripe ou similar)
13. ~~`password_resets` (recuperação de senha)~~ — feito (ver seção "Troca de senha + recuperação de senha")

### Ideias guardadas (decisão consciente de adiar, não descartar)

- **Orçamento digital com aprovação na página do cliente** — recomendação estratégica nº 1 da pesquisa de mercado de julho/2026 (mercado DVI americano: ticket médio +15–30%, aprovação +70% quando a foto acompanha o preço). Desenho: itens de orçamento (peça + mão de obra + valor) linkados à foto/teste que os justifica; botões Aprovar/Recusar por item na página pública com registro de data/hora; `achado_adicional` evolui de informativo pra oportunidade de venda; laudo PDF vira também fatura. Complementos: botões wa.me (WhatsApp sem API oficial), lembretes de revisão por KM/tempo, retorno de itens recusados. Leonardo pediu pra guardar pra depois.
- **Scanner OBD próprio (visão do plano Pro)** — dongle ESP32+ELM327 da OficinaSync incluso no plano Pro. Em fases: (1) DTCs + temperatura coletados na abertura da OS (firmware parcial já existe: `/data`, `/snapshot.json`, `/dtc`); (2) teste de bateria automático via comando ATRV do ELM327 (amostrar tensão em repouso → partida → carga, preenchendo o BateriaForm sozinho); (3) **teste de rodagem georreferenciado** — celular conectado no AP WiFi do ESP32, grava GPS (funciona sem internet) + parâmetros a cada 1s em IndexedDB, sobe tudo ao voltar pra oficina; mapa com Leaflet/OpenStreetMap traçando a rota com pinos onde DTC apareceu ou parâmetro saiu da faixa. Nenhum concorrente BR tem hardware próprio.

## Decisões arquiteturais em aberto

- Semântica de `trial` vs `free` no enum de planos do tenant
- Se CPF deve ser único por tenant (índice composto `tenant_id, cpf`)
- Se múltiplas sections do mesmo tipo devem ser permitidas na mesma OS
- Parâmetros OBD: colunas individuais vs JSON

## Princípios do projeto

- **DRY:** sem duplicar serialização — usar `plainToInstance` **OU** `ClassSerializerInterceptor`, não os dois (escolhido: `plainToInstance` nos controllers)
- **Separação de módulos:** `EmailModule` isolado para evitar dependência circular com Auth/Tenants
- **Tenants isolados:** toda query sensível filtra por `tenant_id` do usuário logado (segurança multi-tenant)
- **Nunca confiar no frontend:** `service_order_id` do body sempre validado contra tenant do token
- **`public_token` gerado no backend** via `randomBytes(32).hex`, nunca no frontend
- **Todo bug corrigido ganha um teste de regressão (regra do Leonardo, 2026-10-15):** escreva o teste que reproduz o bug, veja-o FALHAR pelo motivo certo, corrija, veja-o passar e rode a suíte inteira. O teste é commitado junto com a correção (e a mensagem do commit o cita). Backend: unitário em `backend/src/**/*.spec.ts` (`npm test`) ou e2e em `backend/test/*.e2e-spec.ts` (`npm run test:e2e`); script de deploy: `bash deploy/test-deploy.sh`. Se for impossível testar automaticamente, diga isso explicitamente e o motivo — não pule em silêncio.

## Estilo de comunicação com Leonardo

- Português brasileiro
- Direto e objetivo, sem enrolação
