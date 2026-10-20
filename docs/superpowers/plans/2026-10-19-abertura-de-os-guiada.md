# Abertura de OS guiada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o wizard de abertura de OS por um fluxo de uma pergunta por tela, que começa pela placa. O fluxo reconhece o carro já cadastrado, tem cliente opcional (e a OS passa a guardar o próprio cliente), KM com ilustração do painel, defeito com texto obrigatório e fotos guiadas obrigatórias.

**Architecture:**
- **Backend:**
  - `service_orders` ganha `client_id`, preenchido por migration a partir do carro.
  - Todo lugar que mostra o cliente de uma OS passa a usar `orderClient(order) = order.client ?? order.car.client`.
  - Nova rota `GET /cars/by-plate/:plate` (placa exata, por oficina).
- **Frontend:**
  - A regra do fluxo (quais telas aparecem, o que trava, o que é enviado) fica num módulo puro testado: `src/lib/guidedOpen.ts`.
  - As telas ficam em `src/components/guided-open/`.
  - A página `GuidedOpenPage` substitui `OsCreateWizardPage` na rota `/os-client-create`.

**Tech Stack:** NestJS + TypeORM (mssql), React 19, Tailwind v4, `motion`, kit da Fase 1, Vitest (`ui-tests/unit`, renderiza componentes), Playwright (`ui-tests/e2e`), Jest e2e (`backend/test`).

**Spec:** `docs/superpowers/specs/2026-10-19-abertura-de-os-guiada-design.md`

## Global Constraints

- **Ordem das telas:**
  1. placa
  2. marca
  3. modelo
  4. ano
  5. KM
  6. combustível, cor e chassi (opcionais)
  7. defeito
  8. cliente
  9. 4 fotos guiadas + "mais fotos?"
  10. conferir
- **Mínimos para abrir:**
  - placa válida;
  - marca e modelo;
  - ano;
  - KM;
  - texto do defeito com ≥ 5 letras;
  - as 4 fotos (frente, traseira, lado esquerdo, lado direito).
  - Cliente, combustível, cor e chassi **não** travam.
- **Finalizar a OS** continua exigindo dados completos (`computeMissingData` + `PATCH /finish` → 409). A regra muda só para olhar o **cliente da OS**.
- **Nada é criado no backend antes do "Abrir OS".** Placa já cadastrada **nunca** cria carro novo.
- **Rascunho** (`src/lib/osDraft.ts`) continua: guarda as respostas, não guarda arquivos.
- **Cada OS existente** recebe o `client_id` do seu carro na migration. Nada muda no que já foi feito.
- **Ilustrações:** só os SVGs do zip do Leonardo (`carro-frente.svg`, `carro-traseira.svg`, `carro-lado-esquerdo.svg`, `carro-lado-direito.svg`, `painel-km.svg`), copiados para `frontend/oficinasync-web/src/assets/illustrations/` e usados como `<img>`. Os PNGs **não** entram.
- **Visual e movimento:** kit `@/components/kit` e `@/components/motion` da Fase 1. Alvos ≥ 44px, botões grandes ≥ 56px, texto ≥ 12px e ≥ `white/60`, animação ≤ 1s respeitando "menos movimento".
- **Voz:** transcrição pelo reconhecimento de voz do próprio navegador (`SpeechRecognition`/`webkitSpeechRecognition`), sem serviço pago. O botão some quando o aparelho não suporta.
- **Tenant:** todo `client_id`/`car_id` vindo do body é validado contra a oficina do token (403 se for de outra).
- **Arquivos que NUNCA entram em commit** (são do Leonardo, mudanças sem commit do app Android):
  - `frontend/oficinasync-web/package.json`
  - `frontend/oficinasync-web/package-lock.json`
  - `frontend/oficinasync-web/src/main.tsx`
  - `frontend/oficinasync-web/src/lib/nativeShell.ts`
  - `mobile/`
  - `.claude/launch.json`
  - `Laudo_Fox_2018_FXU1059.pdf`
- **Commits:** sempre `git add` com caminhos explícitos e conferindo o stage. Mensagem em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Branch:** `feat/abertura-guiada`, a partir da `main`.
- **Todo bug achado ganha teste de regressão** (vermelho antes, verde depois).

## Review Focus

1. **Placa digitada com hífen/minúscula/espaço** ("abc-1d23 ") reconhece o mesmo carro que "ABC1D23". O teste fica na Task 3 ("placa normalizada").
2. **Placa com dois carros no mesmo tenant** (duplicados antigos) devolve os dois, e a tela mostra a lista para escolher; não pega o primeiro calado. Teste na Task 3 (e2e) e na Task 5 (`resolvePlateMatch`).
3. **Carro reconhecido com cadastro incompleto** (aberto no modo rápido, sem marca, modelo ou ano) pergunta só o que falta e salva no carro. Teste na Task 5 (`stepsFor`) e na Task 9 (e2e).
4. **Cliente da OS diferente do dono do carro:** as OS antigas do carro continuam com o dono antigo, no laudo e na página pública. Teste na Task 1.
5. **`client_id` de outra oficina no `POST /service_orders`** dá 403 e não grava. Teste na Task 1.

---

### Task 0: Branch

- [ ] `git switch -c feat/abertura-guiada` a partir da `main` atualizada. Os arquivos do Leonardo continuam modificados e não rastreados, sem mexer neles.

---

### Task 1: A OS tem o próprio cliente (backend)

**Files:**
- Create: `backend/src/migrations/<timestamp>-ServiceOrderClient.ts`
- Create: `backend/src/modules/serviceOrder/order-client.ts`
- Modify: `backend/src/modules/serviceOrder/serviceOrder.entity.ts`, `dto/create-service-order.dto.ts`, `serviceOrder.service.ts`
- Modify: `backend/src/modules/internal/office-sheet.service.ts`, `backend/src/modules/report/report.service.ts`
- Test: `backend/src/modules/serviceOrder/order-client.spec.ts`, `backend/test/order-client.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `ServiceOrders.client: Clients | null`, coluna `client_id`, nullable, `ManyToOne`, sem cascade, `@JoinColumn({ name: 'client_id' })`.
  - `orderClient(order: { client?: Clients | null; car?: { client?: Clients | null } | null }): Clients | null`
  - `CreateServiceOrderDto.client_id?: number | null`
- **Regra do create:**
  - `client_id` informado → precisa ser da mesma oficina (senão 403). A OS recebe esse cliente e, se o carro não tinha dono, o carro passa a ter esse dono.
  - `client_id` ausente → a OS recebe o dono atual do carro (pode ser null).

- [ ] **Step 1: Testes que falham**
  - Unitário `order-client.spec.ts`:
    - `orderClient` devolve `order.client` quando existe;
    - cai para `car.client` quando `order.client` é null;
    - devolve `null` sem nenhum dos dois.
  - e2e `order-client.e2e-spec.ts`, oficinas A e B:
    1. **"OS no nome de quem trouxe"**: carro do cliente X → `POST /service_orders {car_id, client_id: Y}` → `GET /service_orders/:id` traz `client.name === Y.name`; a OS **antiga** do mesmo carro continua com X em `GET`, em `GET /service_orders/public/:token` e em `GET /service_orders/:id/office-sheet`.
    2. **"sem client_id herda o dono do carro"**: carro do X → OS sem `client_id` → `client.client_id === X.client_id`.
    3. **"carro sem dono ganha o dono"**: carro só-placa → OS com `client_id: Y` → `GET /cars/:id` mostra `client_id === Y`.
    4. **"cliente de outra oficina"**: `client_id` da oficina B → 403, e nenhuma OS criada (contar antes e depois).
    5. **"completar dados mexe no cliente da OS"**: OS com `client_id: Y` em carro do X; `PATCH /service_orders/:id/complete-data` com `client: {phone, ...}` altera Y, não X.
- [ ] **Step 2: Rodar e ver falhar**

  Run: `cd backend && npx jest src/modules/serviceOrder/order-client.spec.ts && npx jest --config test/jest-e2e.json test/order-client.e2e-spec.ts`

  Expected: FAIL. O unitário falha por módulo inexistente; o e2e responde 400 em `client_id` (o whitelist remove o campo e o cliente continua X).
- [ ] **Step 3: Implementar**
  - **Migration:** escrita à mão. Mesma técnica da `PartialClientAndCarData`.
    - `up`:
      - `ADD client_id int NULL`;
      - FK para `clients(client_id)` com `ON DELETE NO ACTION`;
      - índice;
      - `UPDATE so SET client_id = c.client_id FROM service_orders so JOIN cars c ON c.car_id = so.car_id`.
    - `down`: desfaz.
  - **Entidade e DTO:**
    - `client_id` no DTO com `@IsOptional() @Type(() => Number) @IsInt()`.
    - `null` explícito é tratado como "sem cliente": usar `!= null`, por causa do gotcha do `@IsOptional`.
  - **Service:**
    - `create` aplica a regra acima.
    - Todos os pontos que hoje leem `serviceOrder.car.client` passam a usar `orderClient(...)`: `findById`, `findByPublicToken`, `findAll` (incluir o join `serviceOrder.client`), `findByCar`, `completeData`, `finish`/`computeMissingData`, `office-sheet.service.ts` e `report.service.ts`.
    - Carregar a relação `client` em cada consulta.
  - **`completeData`:**
    - opera no cliente da OS: cria e liga à OS quando não há;
    - liga também ao carro se o carro não tem dono.
    - A regra de CPF duplicado (409 + `existing_client`) continua.
- [ ] **Step 4: Rodar e ver passar + suítes do backend**

  Run: `cd backend && npm test && npx jest --config test/jest-e2e.json`

  Expected: tudo passa. Os 158 e2e atuais continuam verdes; ajuste apenas o que mudar de contrato e anote no commit.
- [ ] **Step 5: Conferir a migration contra o banco de teste**

  Run: `cd backend && DB_NAME=oficinasync_test npm run migration:generate -- src/migrations/Drift`

  Expected: "No changes in database schema were found". Se gerar algo, ajuste a migration à mão e **apague** o arquivo `Drift` gerado.
- [ ] **Step 6: Commit** — `feat(api): OS guarda o proprio cliente (opcao A) — historico do carro preservado`

---

### Task 2: (removida — incorporada à Task 1)

---

### Task 3: Buscar carro pela placa exata (backend)

**Files:**
- Modify: `backend/src/modules/cars/cars.controller.ts`, `cars.service.ts`
- Test: `backend/test/car-by-plate.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /cars/by-plate/:plate` (`JwtAuthGuard`), declarada **antes** de `GET /cars/:id`. Devolve `PlateMatch[]` (lista vazia quando não acha):

  ```ts
  type PlateMatch = {
    car_id: number; plate: string; brand: string | null; model: string | null; year: number | null;
    fuel_type: string | null; color: string | null; chassis: string | null;
    last_mileage: number | null;            // mileage_in da OS mais recente do carro ?? car.mileage_in
    owner: { client_id: number; name: string } | null;
  };
  ```
- A placa é normalizada: maiúscula, só `A-Z0-9`. A comparação é exata e só dentro da oficina do token.

- [ ] **Step 1: Teste que falha** — `car-by-plate.e2e-spec.ts`:
  - **"acha pela placa exata"**: devolve 1 item com marca, modelo e dono.
  - **"placa normalizada"**: `abc-1d23` acha `ABC1D23`.
  - **"último KM"**: carro com OS de KM 50000 e depois 55500 → `last_mileage === 55500`.
  - **"duas placas iguais na mesma oficina"** (inserir 2 carros com a mesma placa): devolve os 2.
  - **"outra oficina não vê"**: a placa da oficina B pedida pela A → `[]`.
  - **"placa inexistente"**: `[]`, com status 200.
- [ ] **Step 2: Ver falhar.** Run: `npx jest --config test/jest-e2e.json test/car-by-plate.e2e-spec.ts`. Expected: 404 ou 400 (a rota cai em `:id`).
- [ ] **Step 3: Implementar** `CarsService.findByPlate(plate: string, userId: number): Promise<PlateMatch[]>`.
  - Comparar com `Raw(alias => \`UPPER(REPLACE(${alias},'-','')) = :p\`)`, porque o `ILike`/parâmetro herda `varchar(7)` no mssql (ver o gotcha no CLAUDE.md).
- [ ] **Step 4: Ver passar + e2e inteiro.** Run: `npx jest --config test/jest-e2e.json`.
- [ ] **Step 5: Commit** — `feat(api): GET /cars/by-plate/:plate (placa exata, por oficina, com ultimo KM e dono)`

---

### Task 4: Ilustrações e catálogo de modelos

**Files:**
- Create: `frontend/oficinasync-web/src/assets/illustrations/{carro-frente,carro-traseira,carro-lado-esquerdo,carro-lado-direito,painel-km}.svg`, copiados de `C:\Users\domme\Documents\Codex\2026-10-19\https-github-com-leomarqueti-oficinasync-https\outputs\oficinasync-ilustracoes.zip`
- Create: `frontend/oficinasync-web/src/lib/carCatalog.ts`
- Test: `ui-tests/unit/carCatalog.test.ts`

**Interfaces:**
- Produces:
  - `MODELS_BY_BRAND: Record<string, readonly string[]>`, com chaves iguais a `CAR_BRANDS`.
  - `modelsFor(brand: string): readonly string[]`, que devolve `[]` para marca desconhecida.
  - `yearOptions(now?: Date): number[]`, do ano atual + 1 até 1980, decrescente.
  - `COMMON_COLORS: { name: string; hex: string }[]`, com 8 a 10 cores: Branco, Prata, Preto, Cinza, Vermelho, Azul, Marrom/Bege, Verde, Amarelo.
  - `FUEL_OPTIONS`: os 4 valores exatos do enum (`flex`, `gasolina`, `diesel`, `eletrico`) com rótulo.

- [ ] **Step 1: Teste que falha** — `carCatalog.test.ts`:
  - toda marca de `CAR_BRANDS` tem ao menos 3 modelos, sem repetidos;
  - `modelsFor('Volkswagen')` contém `Gol` e não contém `Uno`;
  - `modelsFor('Xpto')` é `[]`;
  - `yearOptions(new Date('2026-06-01'))[0] === 2027` e o último é `1980`;
  - os valores de `FUEL_OPTIONS` são exatamente `['flex','gasolina','diesel','eletrico']`.
- [ ] **Step 2: Ver falhar.** `cd ui-tests && npx vitest run unit/carCatalog.test.ts`
- [ ] **Step 3: Implementar.**
  - **Modelos:** 10 a 20 por marca, os mais vendidos no Brasil na frota atual, os mais comuns primeiro (ex.: VW: Gol, Voyage, Fox, Polo, Saveiro, Up!, T-Cross, Virtus, Nivus, Jetta, Amarok, Golf, Parati, Kombi).
  - **SVGs:** extrair do zip e conferir de novo (sem `<script>`, sem URL externa). Em `painel-km.svg`, remover o grupo do quadro vazio "QUILOMETRAGEM" do centro.
- [ ] **Step 4: Ver passar.** Mesmo comando.
- [ ] **Step 5: Commit** — `feat(os): catalogo de modelos por marca e ilustracoes do Leonardo (painel e 4 lados do carro)`

---

### Task 5: Regras do fluxo (módulo puro)

**Files:**
- Create: `frontend/oficinasync-web/src/lib/guidedOpen.ts`
- Test: `ui-tests/unit/guidedOpen.test.ts`

**Interfaces:**
- Consumes: `isValidPlate`, `isValidYear`, `onlyDigits`, `isValidCpf`, `isValidPhone`, `e164ToDigits` (validators); `PlateMatch` (shape da Task 3).
- Produces:
  ```ts
  type StepId = 'plate'|'brand'|'model'|'year'|'km'|'extras'|'defect'|'client'|'photos'|'review';
  type PhotoSide = 'front'|'rear'|'left'|'right';
  type GuidedState = {
    plate: string; match: PlateMatch | null;          // carro reconhecido escolhido
    brand: string; model: string; year: string; km: string;
    fuel: string; color: string; chassis: string;
    defect: string; answers: Record<string,string>; hasAudio: boolean; hasVideo: boolean;
    clientPresent: boolean | null; client: { client_id: number | null; name: string; phone: string; cpf: string; email: string; address: string };
    photos: Record<PhotoSide, boolean>; extraPhotos: number;
  };
  emptyGuidedState(): GuidedState
  resolvePlateMatch(matches: PlateMatch[]): { kind: 'none' } | { kind: 'one'; match: PlateMatch } | { kind: 'many'; matches: PlateMatch[] }
  applyMatch(state: GuidedState, match: PlateMatch): GuidedState   // preenche marca/modelo/ano/cor/chassi/combustível/km(last_mileage)/cliente-dono
  stepsFor(state: GuidedState): StepId[]          // ordem fixa; com match pula brand/model/year se já preenchidos no carro; 'extras' some só se fuel+color+chassi já existem
  missingFor(step: StepId, state: GuidedState): string[]   // rótulos em pt-BR pro nextHint; [] = pode continuar
  buildCarPayload(state: GuidedState): { create: object } | { patch: { car_id: number; body: object } } | null  // patch só com campos que mudaram; null se nada mudou
  buildOrderPayload(state: GuidedState, carId: number, clientId: number | null): { car_id: number; client_id?: number; client_complaint: string; mileage_in: number }
  ```
- **Regras pinadas:**
  - **Mínimos do `missingFor`:**
    - `plate`: placa válida;
    - `brand`/`model`: preenchidos;
    - `year`: válido;
    - `km`: dígitos;
    - `defect`: texto ≥ 5 após `trim`;
    - `client`: `clientPresent !== null`; se `true` e não há `client_id`, nome ≥ 2 e telefone válido; CPF e e-mail, se preenchidos, precisam ser válidos;
    - `photos`: as 4 `true`;
    - `extras`: nada obrigatório.
  - **`client_complaint`:** o texto do defeito; as respostas da triagem continuam indo na etapa `intake` (como hoje).
  - **`clientPresent === false` com `match.owner`:** `buildOrderPayload` envia `client_id` do dono.

- [ ] **Step 1: Testes que falham** — `guidedOpen.test.ts`, um `it` por regra:
  - `resolvePlateMatch` com 0, 1 e 2 itens;
  - `stepsFor`:
    - carro novo → as 10 etapas;
    - match completo → sem brand, model e year;
    - match sem modelo → inclui model;
    - match com fuel, color e chassis → sem extras;
  - `missingFor`:
    - `defect` com 'abc' → `['descrever o defeito (5 letras ou mais)']`;
    - `photos` com 3 → `['foto do lado direito']`;
    - `client` com `clientPresent: null` → `['dizer se o cliente está aqui']`;
    - `client` presente sem nome → `['nome','telefone']`;
  - `buildCarPayload`:
    - carro novo → `create` com placa normalizada e `year` número;
    - match sem mudança → `null`;
    - match com cor nova → `patch` só com `color`;
  - `buildOrderPayload`:
    - `mileage_in` número;
    - `clientPresent false` + dono → `client_id` do dono;
    - `clientPresent false` sem dono → sem `client_id`.
- [ ] **Step 2: Ver falhar.** `npx vitest run unit/guidedOpen.test.ts`
- [ ] **Step 3: Implementar** o módulo. Funções puras, sem React.
- [ ] **Step 4: Ver passar + Vitest inteiro.** `npx vitest run`
- [ ] **Step 5: Commit** — `feat(os): regras da abertura guiada (etapas, o que falta, payloads) com testes`

---

### Task 6: Ditado por voz

**Files:**
- Create: `frontend/oficinasync-web/src/lib/dictation.ts`, `frontend/oficinasync-web/src/components/guided-open/DictationButton.tsx`
- Test: `ui-tests/unit/dictation.test.tsx`

**Interfaces:**
- Produces:
  - `getSpeechRecognition(win?: unknown): (new () => SpeechRecognitionLike) | null`, que devolve `SpeechRecognition ?? webkitSpeechRecognition ?? null`;
  - `DictationButton({ onText: (text: string) => void })`, que renderiza **nada** quando não há suporte. Configuração: `lang='pt-BR'`, `interimResults=false`. Cada resultado final é anexado com espaço.

- [ ] **Step 1: Teste que falha:**
  - `getSpeechRecognition({})` é `null`;
  - `getSpeechRecognition({ webkitSpeechRecognition: Fake })` é `Fake`;
  - `renderToStaticMarkup(<DictationButton onText={...}/>)` em Node (sem `window`) é `''`.
- [ ] **Step 2: Ver falhar.**
- [ ] **Step 3: Implementar.** Botão grande "Falar" (ícone de microfone). Enquanto escuta, mostra "Ouvindo…" e o botão "Parar". Se der erro (permissão negada), mostra o toast "Não deu pra usar o microfone — escreva o defeito".
- [ ] **Step 4: Ver passar.**
- [ ] **Step 5: Commit** — `feat(os): botao de ditado por voz (gratis, do navegador; some se o aparelho nao suporta)`

---

### Task 7: As telas

**Files:**
- Create: em `frontend/oficinasync-web/src/components/guided-open/`: `StepFrame.tsx`, `PlateStep.tsx`, `BrandStep.tsx`, `ModelStep.tsx`, `YearStep.tsx`, `KmStep.tsx`, `ExtrasStep.tsx`, `DefectStep.tsx`, `ClientStep.tsx`, `PhotosStep.tsx`, `ReviewStep.tsx`
- Test: `ui-tests/unit/guidedSteps.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 5 e 6; o kit; `AudioRecorder`, `MediaCaptureField`, `PlateField`, `KmField`, `compressImage`, `PhotoFlash`, `celebrate`.
- Produces:
  - `StepFrame({ step: StepId; index: number; total: number; title: string; onBack: () => void; next?: { label?: string; disabled: boolean; hint?: string; onNext: () => void }; children })`: barra de progresso, título Saira, "Voltar" ≥ 44px, botão `BigButton` com `hint`, transição de entrada (≤ 0,4s, sem animação com "menos movimento").
  - Cada `XStep` recebe `{ state: GuidedState; onChange: (patch: Partial<GuidedState>) => void; onNext: () => void }`. `PhotosStep` e `DefectStep` recebem também `files` e `onFiles` (os arquivos ficam fora do `GuidedState`).
- **Comportamento por tela:** conforme a spec, seção 4. Pontos decididos:
  - **Marca, modelo e ano:** tocar avança sozinho, sem "Continuar". "Outra" e "Não achei" abrem um campo livre com "Continuar".
  - **PlateStep:**
    - placa estilo Mercosul animada (`pop`), com o texto digitado aparecendo na placa;
    - com placa válida, chama `GET /cars/by-plate/:plate` (debounce 400ms);
    - `one` → cartão "É o {modelo} {cor} do {dono}?" com [Sim, é esse] [Não, é outro carro];
    - `many` → lista para escolher;
    - "Não, é outro carro" mantém o `match` (mesmo `car_id`) e força as telas 2–6 para correção.
  - **KmStep:**
    - `<img src={painelKm}>` com uma camada limão pulsando sobre o hodômetro;
    - os ponteiros podem ficar estáticos, porque estão dentro da `<img>`;
    - carro reconhecido: o KM vem preenchido com `last_mileage` e o aviso "Confira o KM de hoje".
  - **PhotosStep:**
    - 4 cartões com os SVGs (o lado da vez com borda limão);
    - botão "Tirar foto da {lado}" com `capture="environment"`;
    - a miniatura toma o lugar do desenho e avança para o próximo lado;
    - tocar na miniatura refaz;
    - depois das 4, "Quer tirar mais fotos?" com [Sim] [Não, conferir].

- [ ] **Step 1: Testes que falham** (render estático):
  - `BrandStep` lista todas as marcas de `CAR_BRANDS` + "Outra";
  - `ModelStep` com `brand: 'Volkswagen'` mostra "Gol" e não mostra "Uno";
  - `PhotosStep` com `front: true` destaca `rear` (`data-current="rear"`);
  - `ReviewStep` com `clientPresent: false` mostra "O escritório completa";
  - `StepFrame` com `next.disabled` e `hint` mostra o hint.
- [ ] **Step 2: Ver falhar.**
- [ ] **Step 3: Implementar** as telas.
- [ ] **Step 4: Ver passar + `npx tsc -b`** (frontend).
- [ ] **Step 5: Commit** — `feat(os): telas da abertura guiada (placa, marca, modelo, ano, KM com painel, opcionais, defeito, cliente, fotos guiadas, conferir)`

---

### Task 8: Página, envio e rascunho

**Files:**
- Create: `frontend/oficinasync-web/src/pages/GuidedOpenPage.tsx`
- Modify: `frontend/oficinasync-web/src/App.tsx` (a rota `/os-client-create` aponta para `GuidedOpenPage`), `frontend/oficinasync-web/src/lib/osDraft.ts` (o rascunho guarda `GuidedState` com versão)
- Delete: `frontend/oficinasync-web/src/pages/OsCreateWizardPage.tsx` e o que só ela usava, **depois** da Task 9 verde.
- Test: `ui-tests/unit/osDraft.test.ts` (ajustar)

**Interfaces:**
- Consumes: Tasks 5 e 7, `osDraft`, `apiFetch`.
- **Rascunho:** muda o formato (versão `2`, guarda `GuidedState` e o índice da tela). Rascunho da versão antiga é **ignorado**, sem quebrar a tela. Teste: `loadOsDraft` com JSON v1 devolve `null`.
- **Envio ao tocar "Abrir OS"**, nesta ordem, sem passo extra:
  1. **Cliente**, se presente e sem `client_id`: `POST /clients`. No 409 com `existing_client`, oferece "Usar esse cadastro".
  2. **Carro:** `buildCarPayload` → `create` (`POST /cars`, com `client_id` se houver), `patch` (`PATCH /cars/:id`) ou nada.
  3. **OS:** `POST /service_orders` com `buildOrderPayload`.
  4. **Etapa `intake`**, só se há triagem, áudio ou vídeo: `POST /sections` + mídias + publicar.
  5. **Check-in:** `POST /sections` + 4 fotos + extras + publicar.
  6. **Fim:** `clearOsDraft`, `celebrate("OS aberta")` e navegação para `/os/:id`.
- **Erro no meio:** os passos que já foram feitos **não** são repetidos ao tocar de novo. Guardar em estado os ids criados (`createdClientId`, `carId`, `orderId`).

- [ ] **Step 1: Ajustar o teste do rascunho:** acrescentar `it('rascunho do formato antigo é ignorado')` e ver falhar.
- [ ] **Step 2: Implementar** a página, o envio e o novo formato do rascunho.
- [ ] **Step 3:** `npx vitest run` e `npx tsc -b` verdes.
- [ ] **Step 4: Commit** — `feat(os): abertura guiada substitui o wizard em /os-client-create`

---

### Task 9: Testes de tela do fluxo novo

**Files:**
- Create: `ui-tests/e2e/abertura-guiada.spec.ts`
- Modify: `ui-tests/e2e/criar-os.spec.ts`, `abertura-rapida.spec.ts`, `usabilidade.spec.ts`, `fundacao.spec.ts`. São os testes que dependem do wizard antigo: **reescrever** para o fluxo novo, sem apagar a intenção de cada um.

**Cenários** (a placa é aleatória em cada teste; as fotos usam o `PNG_1PX` que os testes já têm):

1. **Carro novo sem cliente:**
   - placa → VW → Gol → 2013 → KM 123456 → Pular extras → defeito "Barulho na suspensão" → "Não, o escritório completa" → 4 fotos → "Mais fotos? Não" → Abrir OS;
   - a URL vai para `/os/:id`;
   - a página mostra o banner "Dados pendentes".
2. **Placa reconhecida não duplica:**
   - criar o carro pela API com cliente X;
   - no fluxo, digitar a placa em minúsculas com hífen → aparece "É o … do X?" → Sim → a tela seguinte é a do KM, com o KM vindo preenchido;
   - contar os carros com essa placa via `GET /cars/by-plate`: continua **1**.
3. **Cliente presente com CPF já existente:**
   - o aviso "Este CPF já é do cliente …" aparece;
   - "Usar esse cadastro" leva à OS no nome desse cliente.
4. **OS no nome de quem trouxe:**
   - carro do X;
   - no fluxo, "Quem trouxe é o X?" → Não → buscar Y → a OS aberta mostra Y, e a OS antiga do carro continua com X.
5. **Fotos obrigatórias:** com 3 fotos, o botão está travado e mostra "Falta: foto do lado direito".
6. **Defeito obrigatório:** só áudio, sem texto → travado com "descrever o defeito".
7. **Rascunho:** parar na tela do KM, ir ao dashboard e voltar → reabre no KM, com placa, marca e modelo preservados.

- [ ] **Step 1:** Escrever os cenários e rodar contra o código da Task 8. Expected: passam. Se algum falhar por bug, a correção leva teste de regressão.
- [ ] **Step 2:** Reescrever os specs antigos afetados e rodar a suíte inteira.

  Run: `cd backend && npm run build && cd ../ui-tests && npx playwright test`

  Expected: tudo passa.
- [ ] **Step 3:** Apagar `OsCreateWizardPage.tsx` e o que ficou sem uso. Rodar `npx tsc -b` e a suíte de novo.
- [ ] **Step 4: Commit** — `test(os): testes de tela da abertura guiada; wizard antigo removido`

---

### Task 10: Verificação, medição e publicação

- [ ] **Todas as suítes:**
  - `cd frontend/oficinasync-web && npx tsc -b && npx vite build`
  - `cd backend && npm test && npx jest --config test/jest-e2e.json`
  - `cd ui-tests && npx vitest run && npx playwright test`
- [ ] **Prints no celular (375×812)** das 10 telas, salvos em `docs/equipe/reforma-visual/img/f2-abertura-*.jpg`.
- [ ] **Persona Seu Zé** (agente `general-purpose` lendo `.claude/agents/persona-seu-ze.md`, aba própria do navegador interno, ambiente `bash ui-tests/scripts/start-env.sh`):
  - **cronometrar** a abertura de um carro novo (meta < 2 min) e de um carro já cadastrado (meta < 1 min);
  - salvar o relatório em `docs/equipe/feedback/`.
- [ ] **Revisão final** do branch inteiro (revisor independente, modelo mais capaz). Uma rodada de correções com teste.
- [ ] **CLAUDE.md:**
  - nova seção "Abertura de OS guiada";
  - atualizar as seções do `OsCreateWizardPage` e da "Abertura rápida" (substituídas);
  - registrar `service_orders.client_id` / `orderClient`.
- [ ] **Publicar:** merge fast-forward na `main` e `git push origin main` + `git push origin main:production`. Acompanhar o GitHub Actions até "Publicar na VPS" verde e conferir `https://api.oficinasync.com.br/health`. A migration roda sozinha na subida e o deploy faz backup antes.
