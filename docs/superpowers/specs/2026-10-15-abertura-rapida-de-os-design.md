# Abertura rápida de OS (completar os dados depois)

Data: 2026-10-15 · Dono: Leonardo · Status: desenho fechado em conversa; aguardando revisão do spec escrito

## 1. Problema e objetivo

No balcão o carro está lá, mas o cliente já foi embora, ou só deu o nome. Hoje o wizard de abrir OS exige
tudo antes de criar a OS (cliente: nome, telefone, CPF, endereço; carro: placa, marca, modelo, ano,
combustível, cor, chassi, KM; 4 fotos), e o banco também não aceita cliente/carro incompletos
(`cars.client_id` é NOT NULL; `clients.phone/cpf/address` e `cars.brand/model/year/color/mileage_in` são NOT NULL).

**Objetivo:** o mecânico abre a OS na hora com o que souber; o sistema deixa, marca a OS como "dados
pendentes" e **só cobra o que falta na hora de finalizar**.

**Decisões do Leonardo (2026-10-15):**
- **Mínimo pra abrir = a placa do carro.** O cliente é opcional: pode ficar em branco ou só com o nome.
- Os dados faltantes são cobrados **ao finalizar**.
- Nas demais escolhas ele disse "o que for melhor" — marcadas abaixo como *(decisão do Claude)*, pra ele vetar.

## 2. Fora de escopo (YAGNI)

Lembretes/notificações de dado pendente, mesclar clientes duplicados depois de criados, modo rápido
em outras telas (cadastro avulso de cliente/carro continua como está), cobrar os dados antes de
compartilhar o link com o cliente.

## 3. Dados

- **`cars`:** `brand`, `model`, `year`, `fuel_type`, `color`, `mileage_in` passam a aceitar NULL (`chassis` já aceitava);
  `client_id` passa a aceitar NULL. `plate` continua obrigatória.
- **`clients`:** `phone`, `cpf`, `address` passam a aceitar NULL (`email` já aceitava). `name` continua obrigatório:
  só existe linha de cliente quando há ao menos o nome. Carro sem nada de cliente = `car.client = null`.
- **Uma migration** (`ALTER COLUMN ... NULL`, não destrutiva) gerada com `npm run migration:generate`; roda sozinha no deploy.
- **Nada de flag "incompleto" no banco:** o que falta é **calculado** a cada leitura por uma função pura
  `computeMissingData(car, client)` (backend), que devolve a lista de campos faltantes com rótulo em português.
  Lista exigida pra finalizar = a regra de hoje do wizard: cliente (nome, telefone, CPF, endereço) e carro
  (marca, modelo, ano, combustível, cor, chassi com 5+ caracteres, KM). E-mail segue opcional.
- Uma OS é "completa" quando `computeMissingData` devolve vazio.

## 4. API (tudo tenant-scoped, DTOs com `whitelist`)

- `POST /clients` — `phone`, `cpf`, `address` viram opcionais (continuam validados quando presentes: `@IsPhoneNumber`, `@IsCPF`). Só o `name` é obrigatório.
- `POST /cars` — só `plate` e (opcional) `client_id`; o resto opcional. Se vier `client_id`, valida o tenant do cliente (como hoje).
- `GET /service_orders/:id`, `/orders` (lista), `/public/:token`, `/by-car/:id`, relatório — passam a tolerar `client = null` e campos de carro nulos (hoje fazem `serviceOrder.car.client.name` e quebrariam com 500).
  `GET /service_orders/:id` e a lista devolvem `missing_data: { client: string[], car: string[] }` e `is_complete: boolean`.
- **Novo `PATCH /service_orders/:id/complete-data`** (atômico, numa transação, valida o tenant da OS):
  corpo `{ client_id?: number, client?: {name?, phone?, cpf?, address?, email?}, car?: {brand?, model?, year?, fuel_type?, color?, chassis?, mileage_in?} }`.
  - `client_id` = usar um cliente já cadastrado (valida o tenant dele) e ligá-lo ao carro;
  - `client` = completar o cliente atual do carro, ou **criar** um novo e ligá-lo se o carro não tem cliente;
  - se o CPF informado já pertence a OUTRO cliente do tenant → **409** com `existing_client` (nome + id), e o frontend oferece usar o cadastro existente (nada de duplicar);
  - o mapeamento DTO → entidade é **campo a campo**, nunca `Object.assign(entidade, dto)` com relação (lição do mass assignment).
  Devolve o novo `missing_data`.
- **`PATCH /service_orders/:id/finish`** passa a recusar com **409** `{ message, missing_data }` enquanto faltar algo — o backend é quem garante, não o frontend.

## 5. Frontend *(decisões do Claude, marcadas)*

- **Wizard:** um interruptor no topo do primeiro passo, "Abertura rápida — completo os dados depois" (desligado por padrão; o fluxo completo atual não muda). Ligado:
  - passo do cliente: botão **"Pular cliente"**; se preencher, só o nome é obrigatório;
  - passo do veículo: só a **placa** é obrigatória; o **KM de entrada** continua sendo pedido (é o único dado que só dá pra ler na chegada do carro) mas pode ficar em branco;
  - passo do defeito relatado: continua obrigatório;
  - passo das fotos: opcionais (botão "Pular fotos");
  - revisão: lista "Vai ficar pendente: ..." antes de criar.
- **Tela do mecânico (`OsWorkPage`):** banner no topo "Dados pendentes: telefone do cliente, chassi..." com botão **"Completar dados"** (abre `CompleteDataSheet`, que mostra só os campos que faltam; se o cliente não existe, busca por CPF/nome pra reaproveitar um cadastrado).
- **Dashboard:** selo "dados pendentes" no card da OS; busca e contadores toleram cliente nulo.
- **`OsFinishPage`:** se `missing_data` não está vazio, "Finalizar" abre primeiro o mesmo `CompleteDataSheet`; só segue depois de completar (e o backend confere de novo).
- **Texto reserva** "Cliente não identificado" onde faltar o nome: dashboard, tela da OS, finalizar, PDF; na página pública "Olá!" no lugar de "Olá, Fulano.".
- Modo rápido também esconde/desabilita nada no resto do sistema — a OS é uma OS normal, só com pendências.

## 6. Segurança

- Todo endpoint novo/alterado valida o tenant do usuário contra a OS, o carro e o cliente (nunca confia em `client_id`/`car_id` do corpo sem checar).
- `complete-data` não aceita `tenant`, `*_id` de chave primária nem campos fora do DTO (whitelist).
- Suíte de isolamento ganha: A não completa a OS da B; A não liga o cliente da B ao carro da A.

## 7. Testes (regra do projeto: todo bug/regra tem teste que falha antes)

- **Unit:** `computeMissingData` (tabela de casos: tudo faltando, só cliente, só carro, completo, `chassis` com 4 caracteres, e-mail ausente não conta).
- **E2E backend:** abrir OS só com placa → 201 e `missing_data` lista cliente + carro; só com nome do cliente; finalizar incompleta → 409 com a lista; `complete-data` cria cliente, completa carro, usa `client_id` existente; CPF duplicado → 409 com `existing_client`; finalizar completa → 200; página pública, lista e PDF com cliente nulo **não dão 500**; isolamento entre oficinas.
- **Playwright:** abrir OS rápida só com placa → banner de pendência → "Finalizar" abre o formulário → completar → finalizar com sucesso; o fluxo completo existente continua passando.
- **Migration:** sobe do zero no e2e; revisar o `up()` gerado (só `ALTER COLUMN ... NULL`).

## 8. Critérios de sucesso

1. Abrir uma OS digitando só a placa e o defeito, em poucos toques.
2. Nenhuma OS incompleta consegue ser finalizada (garantido no backend).
3. Nenhum 500 com cliente/carro incompletos (dashboard, tela da OS, página do cliente, PDF).
4. Completar os dados não duplica cliente que já existe (por CPF).
5. Suíte de isolamento continua verde, com os casos novos.

## 9. Pré-requisito e riscos

- **Pré-requisito:** o e-mail opcional e a busca de CEP (já feitos, ainda sem commit) mexem nos mesmos arquivos (`CreateClientDto`, `OsCreateWizardPage`, `EditClientSheet`). Entram **primeiro**, num commit próprio com teste, antes desta funcionalidade.
- `OsCreateWizardPage.tsx` tem ~1000 linhas: o modo rápido deve ser pequeno e não piorar isso (extrair a regra "o que é obrigatório" pra um helper em vez de espalhar `if`).
- O trabalho do app Android (Capacitor) continua fora: não é tocado.
- Deploy: a migration só relaxa restrições; não há perda de dado. O deploy automático já faz backup antes.
