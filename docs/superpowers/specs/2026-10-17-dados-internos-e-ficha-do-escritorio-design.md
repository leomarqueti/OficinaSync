# Dados internos da OS + ficha do escritório + equipe/comissão + uso guiado — Design

> **Resumo (5 linhas):** O teste na Lima exige que todos os funcionários usem o sistema com conta própria e que o **escritório receba, do OficinaSync, os dados concretos da OS** pra montar a OS formal e a nota em outro sistema. Criamos uma área **interna** (nunca visível ao cliente final, nem na página pública nem no laudo) com: **peças** (retiradas × usadas, código, quantidade, preço opcional, foto da caixa), **serviços** (valor opcional), **equipe da OS em porcentagem** (comissão), **anotações do escritório** e a **ficha do escritório** (tela organizada, imprimível, fácil de copiar). Permissão: **escritório vê tudo; mecânico vê só o dele**. Mais: passo a passo guiado no 1º acesso e dicas curtas. Sem R$ de comissão e sem nota fiscal por enquanto.

Data: 2026-10-17 · Autor: sessão com o Leonardo · Branch: `feat/dados-internos` (empilhada em `feat/abertura-rapida`).

## 1. Contexto e objetivo

- A Lima Auto Elétrica vai **testar o sistema com todos os funcionários**, cada um com a própria conta (convite por e-mail já existe; cargos `owner`, `receptionist`, `mechanic`).
- **Hoje o escritório monta a OS formal e emite a nota fiscal em outro sistema** (o OficinaSync não emite nota). Logo, precisa **receber do mecânico tudo que é concreto**: peças usadas (código, quantidade, preço), serviços feitos e quem trabalhou.
- Na oficina a remuneração é **comissão**: quando um colega ajuda, o mecânico responsável registra **quem ajudou, com o quê e quanto (%)**.
- O sistema precisa ser **didático** pra equipe aprender sem o Leonardo ao lado.

**Critério de sucesso:** um mecânico novo, sozinho, consegue (1) abrir uma OS, (2) registrar etapa e fotos, (3) registrar peças retiradas e usadas, (4) marcar quem ajudou e quanto, (5) finalizar; e o escritório abre a **ficha** daquela OS e lança tudo no outro sistema **sem perguntar nada ao mecânico**. Nada interno aparece pro cliente final.

## 2. Decisões do Leonardo (2026-10-17)

| # | Decisão |
|---|---|
| D1 | Ajuda entre funcionários medida em **porcentagem da OS** (soma 100%). |
| D2 | **Escritório (dono + recepção) vê tudo; cada mecânico vê só a parte dele.** Cliente final nunca vê. |
| D3 | **Quem abriu a OS é o mecânico responsável** e preenche a equipe: aparecem os nomes de todos, ele clica em quem ajudou, **com o quê** e **quanto**. |
| D4 | Peças: o mecânico registra o que **retirou do estoque** (com **foto das caixas**) e, no final, informa **só o que realmente usou**. Se souber o preço, preenche; se não, fica "preço não informado". Sem código → foto da caixa. |
| D5 | Além de peças, **lista de serviços** (mão de obra) com **valor opcional**, pra nota. |
| D6 | Entrega ao escritório: **tela "ficha" organizada, boa de imprimir e fácil de copiar** pro outro sistema. |
| D7 | Didático: **passo a passo guiado no 1º acesso** + **dicas curtas** dentro das telas. |

## 3. Decisões que tomei (rulings — o Leonardo pode trocar)

- R1. **Comissão só em %** (sem R$): a OS não guarda preço de venda. A tela de comissões soma porcentagens. R$ entra quando houver valor da OS (orçamento digital).
- R2. **Acerto de peças não bloqueia finalizar**: peças retiradas e não acertadas aparecem em amarelo na ficha e no aviso ao finalizar ("3 peças retiradas sem acerto"). Bloquear atrapalharia o começo do teste.
- R3. **Qualquer funcionário** pode adicionar peças/serviços numa OS da oficina (o ajudante também pega peça); só **escritório + responsável** editam equipe (%) e anotações internas.
- R4. **O escritório pode trocar o responsável** da OS (ex.: a recepção abriu no modo rápido). Padrão: quem abriu.
- R5. A parte do **responsável é o que sobra** (100 − soma dos ajudantes); não é digitada.
- R6. Fotos de caixa são **internas** (não entram em `medias` de etapa; nunca na página do cliente nem no PDF) e **contam na cota de armazenamento** da oficina.
- R7. **Ficha e comissões ficam em porcentagem/itens**; sem emissão de nota, sem estoque, sem integração com o outro sistema (copiar/imprimir basta agora).

## 4. Modelo de dados (migration única, só adiciona)

- `service_orders`: `+ internal_notes` (nvarchar(max) null), `+ responsible_user_id` (FK users, null; efetivo = `responsible_user_id ?? user_id`).
- `service_order_parts`: `part_id`, `service_order_id` (FK, indexado), `tenant_id` (FK, indexado — isolamento), `description` (≤150, obrigatório), `code` (≤60, null), `taken_quantity` (decimal(10,2) ≥ 0), `used_quantity` (decimal(10,2) null — null = ainda não acertada), `unit_price` (decimal(10,2) null — null = "preço não informado"), `photo_object_name` / `photo_mime` / `photo_size` (null), `created_by_user_id`, `created_at`, `updated_at`.
- `service_order_services`: `service_id`, `service_order_id`, `tenant_id`, `description` (≤200), `price` (decimal(10,2) null), `created_by_user_id`, `created_at`.
- `service_order_participants`: `participant_id`, `service_order_id`, `tenant_id`, `user_id` (FK), `share_percent` (int 1–99), `task` (≤150), `created_at`. Único por (`service_order_id`, `user_id`).
- Regras: soma dos `share_percent` ≤ 100 − 1 (o responsável fica com ≥ 1%); o responsável não aparece como participante; todo `user_id` precisa ser da mesma oficina e ativo.
- Cota: a soma de armazenamento por oficina passa a incluir `photo_size` das peças (`CAST ... AS BIGINT`, mesmo cuidado do SUM de int).

## 5. API (módulo novo `InternalModule`; nada disso passa por `GET /service_orders/:id` nem pela rota pública)

Todas exigem `JwtAuthGuard` (scope access), checam o tenant da OS pelo usuário do token e usam DTO com `class-validator` (whitelist).

| Rota | Quem | O que |
|---|---|---|
| `GET /service_orders/:id/internal` | escritório; responsável; mecânico (visão reduzida) | Peças, serviços, equipe e anotações **filtrados por perfil**. Mecânico não-responsável: peças/serviços sim; da equipe só a própria linha; sem anotações. |
| `PUT /service_orders/:id/internal/notes` | escritório + responsável | Anotações internas. |
| `POST/PATCH/DELETE /service_orders/:id/parts[/ :partId]` | todos | CRUD de peças (após a OS finalizada só escritório). |
| `POST /service_orders/:id/parts/:partId/photo` | todos | Foto da caixa (multipart; tipo/tamanho validados como em `/medias`; conta na cota). |
| `POST/PATCH/DELETE /service_orders/:id/services[/:serviceId]` | todos (finalizada: escritório) | CRUD de serviços. |
| `PUT /service_orders/:id/participants` | escritório + responsável (finalizada: escritório) | Substitui a lista de ajudantes `[ {user_id, share_percent, task} ]`. |
| `PATCH /service_orders/:id/responsible` | escritório | Troca o responsável. |
| `GET /service_orders/:id/office-sheet` | escritório + responsável | Ficha consolidada (ver §6). |
| `GET /commissions?from&to&user_id` | escritório (todos); mecânico (só ele) | Totais por pessoa nas OS **concluídas** no período. |
| `GET /users/team` | todos | Lista `{user_id, name, role}` da oficina (sem e-mail pra mecânico). |

Erros em português e específicos (ex.: "A soma das porcentagens passa de 99%.", "Esse funcionário não pertence à oficina."). Fotos de caixa saem por URL assinada de 1 h, só nas respostas acima.

## 6. Ficha do escritório (tela `/os/:id/ficha`)

Uma página limpa, tema claro de impressão, com blocos que **o escritório copia pro outro sistema** (botão "Copiar" em cada bloco e "Copiar tudo" como texto; botão Imprimir/Salvar PDF via `window.print()` com CSS de impressão — sem Puppeteer):

1. **Cliente e veículo** (nome, telefone, CPF, endereço; placa, marca, modelo, ano, chassi, KM) + **pendências** de dados (reaproveita `missing_data`).
2. **Defeito relatado e o que foi feito** (queixa; resumo das etapas publicadas com suas explicações).
3. **Peças usadas** (descrição, código, qtd usada, preço unitário ou "preço não informado", total quando houver preço) + **retiradas sem acerto** em amarelo + **foto da caixa** quando não há código.
4. **Serviços/mão de obra** (descrição, valor ou "não informado").
5. **Equipe e porcentagens** (responsável + ajudantes, com o quê).
6. **Anotações internas.**
7. **Totais** (soma dos valores informados; aviso "X itens sem preço").

Visível a escritório e ao responsável; **nunca** na página pública nem no laudo.

## 7. Tela de comissões (`/comissoes`)

Filtro por período e funcionário. Para cada pessoa: nº de OS concluídas em que participou, soma das porcentagens (ex.: 3,4 "OS inteiras"), lista das OS com a % de cada uma. Escritório vê todos; mecânico vê só o próprio total ("Minhas comissões"). Exportação: só "copiar/imprimir" agora.

## 8. Uso didático

- **Passo a passo no 1º acesso** (componente `GuidedTour`, sem dependência nova): destaca elementos por `data-tour`, 4–6 passos **por perfil**, pode pular, pode rever em Configurações ("Rever passo a passo"). Estado no `localStorage` por usuário + versão do tour.
  - Mecânico: abrir OS → registrar etapa e foto → peças retiradas/usadas → marcar quem ajudou → finalizar.
  - Recepção: abrir OS rápida → completar dados → ficha.
  - Dono: convidar equipe → ficha → comissões.
- **Dicas "?"** (`HelpHint`) nos pontos que confundem (modo rápido, pendências, % da equipe, peça usada × retirada, preço não informado), em linguagem de oficina.
- **Limpeza:** esconder "Scanner" do menu e da trilha enquanto o OBD estiver desligado (flag `VITE_FEATURE_OBD`, padrão off); corrigir o texto do scanner ("vai configurado").

## 9. Segurança e privacidade (requisitos, não opcionais)

- Toda consulta filtra por `tenant_id`; mecânico não lê a linha de outro (teste e2e por perfil).
- **Teste de vazamento:** semear valores-sentinela em notas/peças/serviços/equipe e provar que **não aparecem** em `GET /service_orders/public/:token` nem no HTML do laudo.
- **Escapar HTML** do que entra na ficha/cópia; o laudo PDF e a página pública não ganham nenhum campo novo.
- Upload da foto da caixa: mesma whitelist de tipo (magic bytes), limite de 15 MB, cota por oficina, concorrência limitada.
- Comissão é dado sensível entre colegas: o mecânico só recebe a **própria** linha na API (não só escondido na tela).

## 10. Pré-requisitos pro teste na Lima (fora deste código, mas bloqueiam)

1. **Deploy da versão atual** (produção está na antiga, sem as correções de segurança) — decisão do Leonardo; ver `docs/equipe/lancamento-publico/03-devops-operacao.md`.
2. **E-mail dos convites funcionando** (Resend com domínio verificado — SPF/DKIM) e conta de cada funcionário criada.
3. **Backup mínimo** antes de usar dados reais com a equipe.

## 11. Fora de escopo (decidido)

R$ de comissão, valor da OS/orçamento digital, controle de estoque, emissão de nota fiscal, integração automática com o outro sistema, controle por horas, exportação CSV, notificações.

## 12. Testes

- **Backend (Jest e2e, 2 oficinas):** matriz de perfis (dono, recepção, mecânico responsável, mecânico comum) × cada rota; isolamento entre oficinas; validação (soma de %, usuário de outra oficina, duplicado, quantidades negativas, e `used_quantity` maior que `taken_quantity` é recusada — usada ≤ retirada); vazamento na rota pública; cota inclui foto da caixa; finalizada → só escritório edita.
- **Backend (unit):** cálculo da parte do responsável e dos totais de comissão.
- **Vitest:** formatação do texto "copiar", cálculo de totais, regras de %.
- **Playwright:** fluxo do mecânico (peças retiradas com foto → acerto → marcar ajudantes → finalizar), ficha do escritório (copiar/imprimir visível só pro escritório), mecânico comum não vê comissão de colega, passo a passo aparece no 1º acesso e some depois, "Rever passo a passo".
- Regra do projeto: todo bug achado ganha teste que falha antes.

## 13. Ordem de entrega sugerida (cada fatia é testável sozinha)

1. Modelo + permissões + peças/serviços + anotações (API) **e a ficha** → o escritório já consegue lançar.
2. Equipe/porcentagens + tela de comissões.
3. Passo a passo e dicas + limpeza do menu.
