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

### `ObdModule` (recém-criado, incompleto)

- Entidade `ObdDevices` criada (campos: device_id, name, device_token, mac_address, is_active, last_ip, last_seen_at, created_at, tenant)
- **Pendente:** rotas `POST /obd/heartbeat` (ESP32 registra IP) e `GET /obd/scan` (frontend puxa dados)
- **Pausado a pedido do Leonardo** — foco em testes estruturados/PDF/vídeo primeiro

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
2. ~~**Cadastro de funcionários**~~ — feito. Tabela `invites`, `POST /invites` (só OWNER), aceite público em `/convite?token=` cria a conta já com tenant/cargo certos e loga automaticamente (ver seção "Cadastro de funcionários via convite" acima).
3. **Deploy** em produção — hoje só roda localhost
4. **Migrar `synchronize: true`** para migrations do TypeORM
5. ~~**Gerar PDF do relatório**~~ — feito. `ReportModule` com Puppeteer, `GET /service_orders/:id/report.pdf`, botão "Baixar laudo PDF" no `OsWorkPage` e `OsFinishPage`. Reaproveita `tests` e `medias`. Gerado sob demanda, não persistido (fast-follow: salvar como `Media` pra aparecer também na página pública, precisa liberar `application/pdf` na whitelist do MinIO).
6. ~~**Vídeo de divulgação automático**~~ — feito. `VideoModule` com `fluent-ffmpeg`, `POST /service_orders/:id/promo-video` (assíncrono, polling via `promo_video_status`), botão "Gerar vídeo de divulgação" no `OsWorkPage`. Testado ponta a ponta com clipes sintéticos. Fast-follow possível: overlay de texto por seção, transições, escolher manualmente quais clipes entram.
7. ~~**Testes especializados (Fase 4)**~~ — feito. Leonardo trouxe um spec externo (`oficinasync_testes_spec.md`, ~50 tipos de teste, stack diferente — só a ideia foi aproveitada) propondo formulário/card/PDF dedicados por tipo. Decisão: híbrido — 4 tipos prioritários da oficina (Compressão Mecânica, Leitura de DTC, Bateria, Injetores no Banco) ganharam UI dedicada com captura de foto direto da câmera do celular (`capture="environment"`); os outros ~46 tipos continuam no formulário genérico. Testado ponta a ponta incluindo geração de PDF com os blocos especializados. ~~Edição de testes especializados já criados (antes só criar/excluir)~~ — feito depois, ver seção "Edição de testes especializados já criados". Fast-follow restante: mais tipos do catálogo conforme demanda real da oficina.

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

## Estilo de comunicação com Leonardo

- Português brasileiro
- Direto e objetivo, sem enrolação
