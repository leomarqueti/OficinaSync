# Modo co-op entre mecânicos: design das telas

> **Resumo**
> 1. A tela do mecânico mostra só **MEUS CARROS** (os que ele pegou ou está ajudando). Embaixo vem **um bloco só**, "Esperando mecânico (3)", que abre a lista dos carros sem mecânico. Os carros dos outros ficam fora da tela inicial.
> 2. Pegar um carro custa 2 toques ("PEGAR ESSE CARRO" e confirmar com a foto do carro). Entrar num carro que já tem dono abre a pergunta "O ZÉ JÁ ESTÁ NESSE CARRO. E VOCÊ?", com **2 botões**: AJUDAR O ZÉ (limão) ou OUTRA PARTE (ciano).
> 3. O jeito de cada um no carro tem **ícone + cor + palavra**, nunca só cor. Dono: limão cheio, com chave. Ajudando: limão vazado, com mãos. Outra parte: ciano, com peça e o nome da parte.
> 4. Cada coisa registrada (texto, foto, teste, achado, publicar) ganha a linha "Zé · 14:32". O escritório vê quem fez cada parte. O cliente vê "Feito por Zé e Rafa" no fim de cada capítulo e um fechamento "Quem cuidou do seu carro".
> 5. Serve para os dois tipos de oficina: o mecânico **pega sozinho**, e o escritório ou o dono **passa o carro** ("QUEM VAI MEXER?"). O mecânico recebe o carro no bloco "NOVO PRA VOCÊ", com "A Cida te mandou esse carro" (§6.1).
> 6. Recomendo **2 opções, não 3**: "ajudar" e "trabalhar junto" viram a mesma coisa. Depende do backend registrar o **autor** de cada item, coisa que ele não faz hoje (ver §9).

Status: proposta do `designer-ux`, **não implementada**. As regras de negócio são do `produto-receita` (`01-produto-regras.md`, que ainda não existia quando este arquivo foi escrito). Mockup estático: `mockups/coop-telas.html`.

---

## 0. O que o sistema tem hoje (ponto de partida)

- `SimpleHome` (modo simples, mecânico): saudação, os atalhos "Carro novo" e "Buscar" e **todos** os carros abertos da oficina, em cartões grandes. Com 10 ou mais OS abertas, o mecânico se perde, que é a reclamação do Leonardo.
- A OS já tem **responsável** (`responsible_user_id ?? user_id`) e **ajudantes com tarefa e %** (`TeamSection`, tarefas Diagnóstico/Elétrica/Mecânica/Montagem/Teste). Isso é **interno**: só o escritório edita, e serve para a comissão.
- `sections.published_by` existe no banco, mas nenhuma tela o mostra. Mídias, testes e notas **não têm autor**. As notas são um texto só, e o "Falar" (`SpeakSheet`) soma tudo nele.
- A página do cliente não mostra nenhum nome de mecânico.

O co-op aproveita o responsável e os ajudantes, que já existem. A novidade é que **o próprio mecânico se coloca no carro**, e a autoria aparece em cada coisa.

---

## 1. Vocabulário (a mesma palavra em todas as telas)

| Situação | Palavra na tela | Ícone (lucide) | Cor e estilo | Na OS interna (comissão) |
|---|---|---|---|---|
| Pegou o carro primeiro / é o responsável | **NO CARRO** (o dono) | `Wrench` | limão `#A3E635` **cheio**, letra preta | responsável |
| Mesma tarefa, junto com o dono | **AJUDANDO** | `HandHelping` | limão **vazado** (contorno 2px), letra limão | ajudante, tarefa = a do dono |
| Mexe em outra coisa do mesmo carro | **OUTRA PARTE · ELÉTRICA** | `Puzzle` | **ciano** `#22D3EE` vazado | ajudante, tarefa = a parte escolhida |
| Carro sem mecânico | **ESPERANDO MECÂNICO** | `Clock3` | amarelo `--warning` (pede atenção) | — |

**Por que ciano:** limão já quer dizer "seu/certo", amarelo quer dizer "atenção" e vermelho, "erro". "Outra parte" não é alerta, então precisa de uma cor neutra que se distinga do limão. O ciano `#22D3EE` sobre `#0a0a0a` tem contraste de ~11:1. Proposta de token novo: `--coop-other`. **Decisão do design**, a validar com o Leonardo na tela.

**Avatar:** círculo de 40px (28px nas listas compactas) com as **iniciais**, sobre cinza `white/10`. O anel em volta segue a tabela acima (limão cheio, limão vazado ou ciano). Quem é a pessoa vem pelas iniciais e pelo nome; o que ela faz no carro vem pelo anel e pelo ícone. Não dou uma cor fixa a cada mecânico: isso brigaria com as cores de relação. Uma foto de perfil seria ainda melhor para quem lê pouco; fica como fase 2 (ver §8).

---

## 2. Tela principal do mecânico (modo simples)

**Recomendação:** uma tela, de cima para baixo, sem abas (abas são pequenas e fáceis de errar com a mão suja).

```
┌──────────────────────────────┐
│ BOA TARDE, RAFA              │
│ 2 carros com você            │
│ [+ CARRO NOVO]  [🔍 BUSCAR]  │  ← igual hoje
│                              │
│ NOVO PRA VOCÊ                │  ← só aparece se alguém mandou (§6.1)
│ ┌──────────────────────────┐ │
│ │[foto] GOL 2015           │ │
│ │ A Cida te mandou · 10:42 │ │
│ │ [ BELEZA, VOU VER ]      │ │
│ │   Não posso agora        │ │
│ └──────────────────────────┘ │
│                              │
│ MEUS CARROS                  │
│ ┌──────────────────────────┐ │
│ │[foto] GOL 2012 · ABC1D23 │ │
│ │ 🔧 NO CARRO              │ │  ← limão cheio
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │[foto] CELTA 2010         │ │
│ │ 🤝 AJUDANDO O ZÉ  (ZÉ)   │ │  ← limão vazado + avatar do Zé
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │[foto] HB20 2019          │ │
│ │ 🧩 OUTRA PARTE · LUZES   │ │  ← ciano; carro é do Toninho
│ │    carro do Toninho      │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ⏱ ESPERANDO MECÂNICO   (3) │ │  ← amarelo, 1 bloco só
│ │   toque pra ver          │ │
│ └──────────────────────────┘ │
│  Ver todos da oficina ›      │  ← link discreto, 48px
└──────────────────────────────┘
```

- **MEUS CARROS:** só os carros em que ele está, em qualquer papel. Ordem: dono primeiro, depois ajudando e outra parte; dentro de cada grupo, o mais antigo primeiro (o carro parado há mais tempo pede mais atenção). O cartão é o mesmo de hoje (foto, `carTitle`, placa) e ganha o **selo de papel** no lugar de "Em andamento".
- **ESPERANDO MECÂNICO (n):** um bloco fechado com o número grande. Ao tocar, abre a **lista de espera** (§3). Se o mecânico não tem nenhum carro, o bloco já vem **aberto**: essa é a hora dele procurar serviço. Com n = 0, o bloco some e não ocupa espaço.
- **Ver todos da oficina:** lista completa, com quem está em cada carro (o mesmo selo do escritório). Serve para "onde está o carro do fulano?" e para ir ajudar. Fica fora da vista de propósito.
- **Estado vazio** (nada com ele e nada esperando): "Tudo em ordem. Nenhum carro esperando." e o botão "+ CARRO NOVO".
- Na barra de baixo (`SimpleShell`), o "Início" ganha um ponto amarelo quando há carro esperando. É um sinal só de cor, mas redundante: o número está no bloco.

## 3. Lista "Esperando mecânico"

Cartão grande por carro, com **o botão no próprio cartão**, porque isso economiza um toque:

```
┌──────────────────────────────┐
│[foto] FOX 2018 · FXU1059     │
│ "Não dá partida de manhã"    │  ← defeito, 1 linha, cortado
│ chegou há 2 h                │
│ [   PEGAR ESSE CARRO   ]     │  ← BigButton primary, 56px
└──────────────────────────────┘
```

- O defeito aparece porque o mecânico escolhe o carro **pelo serviço** ("partida é comigo"). O ditado já obriga a abertura a ter texto.
- Tocar na foto ou no título abre a OS **só para ver**: o `ArrivalCard` mais um botão fixo embaixo, "PEGAR ESSE CARRO".
- Ordem: o mais antigo primeiro.

## 4. Pegar o carro (carro sem ninguém)

1. Toque em **PEGAR ESSE CARRO**.
2. Folha de baixo (`Sheet`) com a **foto grande do carro**, porque o mecânico reconhece o carro, não a placa:
   - Título: **PEGAR O FOX?**
   - Linha: "FXU1059 · Não dá partida de manhã"
   - `[🔧 SIM, É MEU]` (primary, hero 64px)
   - `[Não]` (secondary)
3. Ao confirmar: vibração (`haptic`), `celebrate("O Fox é seu")` curtinho, e a tela entra direto na OS na etapa da vez. Toast: "Você pegou o Fox · **Desfazer**" (8 s).

**Por que confirmar** com 2 toques e não 1: com a mão suja, encostar sem querer é comum, e um carro pego por engano some da lista dos outros. O "Desfazer" cobre o resto.

**Corrida** (dois pegam ao mesmo tempo): o segundo recebe a folha do §5, já com o nome de quem pegou antes: "O ZÉ PEGOU ANTES DE VOCÊ. E VOCÊ?". Nada de erro vermelho.

**Atalho sem esquecer o nome:** se o mecânico abre um carro sem ninguém e toca em qualquer ação (Falar, Foto, Teste, Achado), aparece a mesma folha do passo 2 antes da ação. Assim nunca fica um registro sem dono. (Regra a confirmar com o `produto-receita`: "só quem está no carro registra".)

**Quem abriu a OS** (escritório ou mecânico): com o mecânico abrindo pelo "Carro novo", o carro já fica com ele (regra do produto, 1.1); a tela "Conferir" só informa "🔧 Esse carro fica com você". Com o escritório abrindo, o carro cai em "Esperando mecânico", a não ser que ele escolha um mecânico (§6).

## 5. Entrar num carro que já tem dono

Acontece pelo "Ver todos da oficina", pela busca ou ao tentar pegar um carro que acabou de ser pego.

```
┌──────────────────────────────┐
│        (ZÉ)  ← avatar 64px   │
│  O ZÉ JÁ ESTÁ NESSE CARRO    │
│  Celta 2010 · desde 9:10     │
│                              │
│  E VOCÊ?                     │
│ ┌──────────────────────────┐ │
│ │ 🤝 AJUDAR O ZÉ           │ │ limão vazado, 72px
│ │ mesma coisa, junto       │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 🧩 MEXER EM OUTRA PARTE  │ │ ciano, 72px
│ │ mexer em outra coisa     │ │
│ └──────────────────────────┘ │
│        Só olhar              │ texto, 48px
└──────────────────────────────┘
```

- **AJUDAR O ZÉ:** entra direto. Toast: "Você está ajudando o Zé no Celta".
- **MEXER EM OUTRA PARTE:** segunda folha, **"QUAL PARTE?"**, com uma grade de 2 colunas de `ActionTile` com ícone:
  Elétrica (`Zap`) · Luzes (`Lightbulb`) · Motor (`Cog`) · Partida e carga (`BatteryCharging`) · Freio (`Disc`) · Suspensão (`ArrowDownUp`) · Ar-cond. (`Snowflake`) · Outra (`Mic`: ditado ou texto curto).
  Um toque escolhe e entra. A parte aparece no selo: "OUTRA PARTE · LUZES".
- **Só olhar:** abre a OS só para leitura, sem entrar no carro.
- Se já tem duas ou mais pessoas no carro, o topo mostra a fila de avatares e "ZÉ E RAFA JÁ ESTÃO NESSE CARRO". A pergunta continua a mesma, com "AJUDAR O ZÉ" (sempre o dono).
- **O dono fica sabendo?** Na próxima vez que o Zé abrir a OS ou a tela inicial, aparece um aviso limão fino: "Rafa entrou pra ajudar". **Não prometo notificação push:** o sistema não tem push hoje.

**Recomendação (discordância registrada com o pedido literal):** o Leonardo citou três jeitos (trabalhando junto, ajudando, outra parte). Para quem lê pouco, "ajudar" e "trabalhar junto" são a mesma coisa, e três botões quase iguais geram erro e briga ("eu não estava ajudando, estava junto"). Proponho **2 escolhas para o mecânico**. No escritório, "trabalhando junto" é o nome geral de qualquer carro com mais de um mecânico. Quem decide é o Leonardo (pergunta 1).

**Sair do carro:** "Mais ações" (`MoreActionsSheet`) ganha **"Sair desse carro"**, com a confirmação "Sair do Celta? O que você fez continua com seu nome.". Se o dono sai e há ajudantes, a pergunta seguinte é "Passar o carro pro Rafa?" ([PASSAR PRO RAFA] / [Deixar esperando]). Finalizar a OS tira todo mundo sozinho.

## 6. O escritório (ControlShell)

**Num relance, na lista do dashboard**, cada linha de OS ganha uma coluna/linha "**Quem**":

| Caso | Visual | Texto |
|---|---|---|
| ninguém | selo amarelo `⏱ ESPERANDO` | "Esperando mecânico · 2 h" |
| sozinho | avatar com anel limão cheio | "Zé" |
| dupla ajudando | avatar Zé (limão cheio) + avatar Rafa (limão vazado, mini-ícone de mãos) encostados | "Zé **+** Rafa ajudando" |
| outra parte | avatar Zé + avatar Toninho (anel ciano) | "Zé · Toninho nas luzes" |

- Filtro em chips no topo: **Todas · Esperando (3) · Juntos (2)**, mais um chip por mecânico ("Zé (2)"). Chips de 44px.
- **Visão "Por mecânico"** (alternância no topo, recomendada para o escritório): uma linha por pessoa, com os carros dela em miniatura e o papel em cada um. Responde "o Rafa está parado?" em 1 segundo. A última linha é "Esperando mecânico".
- O escritório pode **pôr um mecânico** num carro esperando ("Dar pra…", com avatares grandes para escolher), **tirar** ou **passar**. Isso é regra do `produto-receita`. No design, é o mesmo seletor de avatares em toda tela.
### 6.1 Escritório ou dono passando um carro para um mecânico

O sistema precisa atender **os dois jeitos de oficina**: o da Lima (cada um pega sozinho, ou o dono manda "fulano, mexe naquilo") e o de oficinas em que o dono decide tudo. A recomendação é que **os dois caminhos existam sempre, sem chave de configuração** na primeira versão. O dono que distribui tudo simplesmente usa o "Mandar pra". Uma chave "só o escritório distribui" pode vir depois, se uma oficina pedir (pergunta 3).

**Onde o escritório passa o carro:**
- No fim da abertura de OS (tela "Conferir"), com a pergunta **"QUEM VAI MEXER?"**. A resposta é uma fileira de avatares grandes (64px, nome embaixo) e mais **"Deixar esperando"**, que já vem marcado. Um toque escolhe.
- Na lista do dashboard, num carro esperando: o botão **"Mandar pra…"** abre o mesmo seletor.
- Num carro com gente: **"Pôr mais alguém"** (escolhe a pessoa e depois "Ajudar o Zé" ou "Outra parte → qual parte") e **"Trocar o dono"**.
- Na visão "Por mecânico": arrastar não (difícil no celular). É toque no carro e depois na pessoa.

**Mudar de ideia:** o seletor mostra quem já está no carro, com um "X" para tirar. A pessoa tirada vê no próximo acesso o aviso "O escritório tirou o Gol de você". O que ela registrou continua com o nome dela.

**O que o mecânico vê** quando recebe um carro:
- Na tela inicial, **acima** de "MEUS CARROS", aparece o bloco **"NOVO PRA VOCÊ"**. O cartão vem com borda limão pulsando de leve (respeita "menos movimento"), a foto, o defeito e a linha **"A Cida te mandou esse carro · 10:42"**. O nome mostrado é o de quem mandou: o escritório ou o dono. **O carro já está em "Meus carros"** (regra do produto: mandar não depende de aceite).
- Botão grande **[🔧 BELEZA, VOU VER]** (entra na OS e o carro desce para "MEUS CARROS") e o link **"Não posso agora"**.
- "Não posso agora" pede um motivo com 3 botões: **Tô ocupado · Não é comigo · Falta peça**. O carro volta para "Esperando mecânico" com esse selo, e o escritório vê "Rafa não pôde: tô ocupado". Mesmo assim fica rastro de que o carro foi passado e devolvido, o que também ajuda contra o "ninguém me falou".
- Quem não responde: o carro **já conta como dele** (aparece no escritório com o nome do Rafa e um selo amarelo "ainda não viu"). Assim o dono que manda nunca perde o carro no meio do caminho, e o escritório vê que o mecânico não abriu.
- Se o escritório pôs o mecânico como ajudante ou outra parte, a linha muda para "A Cida te pôs pra ajudar o Zé no Celta" ou "A Cida te pôs nas luzes do HB20".

**No escritório**, o selo do carro passado e ainda não aberto é o avatar do mecânico **tracejado**, com "Mandado pro Rafa · ainda não viu". Ao abrir, vira o anel normal (cheio, vazado ou ciano). Tracejado é "a caminho"; é diferença de forma, não só de cor.

**Pegar sozinho continua igual** (§4). Quando um mecânico pega um carro que o escritório tinha passado para outro e o outro ainda não viu, a folha do §5 aparece com o texto "A Cida mandou esse carro pro Rafa." e as opções Ajudar / Outra parte. Ele **não pode tomar o carro**; só o escritório troca o dono.

- **Ligação com a comissão:** entrar como ajudante ou outra parte **cria a linha na equipe com a tarefa já preenchida e sem %**. A ficha mostra "% a definir" em amarelo, e o escritório ajusta em `OsOfficePage`. Nada é calculado por adivinhação (pergunta 5).

## 7. Dentro da OS

**Topo** (embaixo de placa/OS/cliente/KM): uma faixa **"NO CARRO"** com os avatares e o papel de cada um.

```
NO CARRO  (ZÉ)🔧  (RA)🤝  (TO)🧩 luzes        [+ eu]
```

- Tocar na faixa abre uma folha com a lista: nome, papel, desde quando e o que já registrou ("3 fotos, 1 teste").
- Para quem ainda não está no carro, o `[+ eu]` (limão, 44px) abre o §4 ou o §5.
- Quem está no carro vê o próprio avatar com o texto "VOCÊ".

**Cada registro** (nota falada, foto, vídeo, áudio, teste, achado) ganha embaixo uma **linha de autor**: avatar de 20px, "Zé · 14:32". A cor do anel segue o papel **no momento em que registrou**.
- Na **nota da etapa**, cada fala do "Falar" vira um bloco próprio com autor, e não um texto corrido. **Isso exige mudança no backend** (hoje `notes` é um campo só): ver §9.
- No **cabeçalho da etapa** (`StepNowCard`/`StepRow`), aparece "Feito por Zé e Rafa", calculado a partir dos autores da etapa.
- No **publicar** ("Pronto, mostrar ao cliente"), a confirmação mostra quem vai aparecer: "Vai aparecer pro cliente: **feito por Zé e Rafa**". É a chance de corrigir antes. `published_by` já existe e passa a aparecer: "Mostrado ao cliente por Zé · 15:10".
- **Outra parte** mostra os registros na mesma etapa, com um rótulo ciano "LUZES · Toninho". Não crio etapa separada por parte, para não multiplicar etapas: a ordem continua checkin → diagnóstico → reparo → final.

**Para o "não fui eu":** o escritório ganha um filtro "Ver só do Rafa" na OS, que esmaece o resto. A linha de autor não pode ser editada por ninguém, nem pelo dono.

## 8. Página do cliente

Objetivo: o nome valoriza o mecânico e dá confiança, sem virar lista de funcionários.

- **No fim de cada capítulo publicado:** uma linha discreta, em Archivo 14px `white/70`, com as iniciais em círculo: "**Feito por Zé**" / "**Feito por Zé e Rafa**". Com 3 ou mais: "Feito por Zé, Rafa e Toninho".
- **No fechamento** (antes das métricas): um bloco **"QUEM CUIDOU DO SEU CARRO"** em Saira, com um cartão por mecânico: iniciais grandes (foto na fase 2), **primeiro nome** e **as etapas que fez** ("Diagnóstico e reparo"). A "parte" e o papel interno (ajudando/outra parte) **não aparecem pro cliente**, porque o produto (1.4) deixa isso só para dentro da oficina. Com dupla, a frase de cima é "**Zé e Rafa cuidaram do seu Celta**". É o momento "feito à mão".
- **Só o primeiro nome** e só de quem tem registro **publicado**. Quem entrou e não registrou nada publicado não aparece.
- Nada de %, comissão ou papel interno ("ajudando") para o cliente: todos aparecem iguais. "Ajudando" é coisa de dentro da oficina.
- O laudo PDF espelha o mesmo bloco, perto da assinatura do responsável técnico (`order.user.name` hoje).

## 9. O que o frontend (e o backend) precisam para isso existir

Para o `produto-receita` e o `dev-backend` (não é decisão minha, é a dependência do design):
1. **Quem está no carro agora:** lista por OS de `{user, papel: dono|ajudando|outra_parte, parte?, desde}`, visível para **todos** os mecânicos do tenant. Hoje a equipe interna só mostra ao mecânico a própria linha, então precisa de uma leitura nova, sem %.
2. **Autor em cada registro:** `created_by` em `medias`, `tests` e em cada fala da nota (a nota vira uma lista de entradas, ou ganha uma tabela de falas).
3. A **lista de OS** precisa trazer quem está em cada carro, para o dashboard não fazer N chamadas.
4. Rota pública: só os primeiros nomes e as partes dos autores de etapas publicadas, sem `user_id`.

Componentes novos (em `src/components/coop/`, reaproveitando o kit):
- `WorkerAvatar` (iniciais, anel por papel, tamanhos 20/28/40/64, `aria-label="Zé, ajudando"`)
- `AvatarStack`
- `RoleChip` (estende o `StatusChip` com os tons `owner|helping|other|waiting` e ícone)
- `ClaimSheet` (§4)
- `JoinSheet` + `PartPicker` (§5)
- `OnCarStrip` (§7)
- `AuthorLine`
- `CrewCredits` (página do cliente)
- `WaitingBlock` (§2)
- `PeopleBoard` (escritório)

Tokens: `--coop-other: #22D3EE`. Todo alvo de toque ≥ 44px; os botões das folhas, ≥ 64px.

Estados obrigatórios:
- carregando: esqueleto nos avatares;
- falha ao pegar: "Não deu pra pegar. Tente de novo.", com o botão mantido;
- corrida (§4);
- sem rede: o botão fica "Pegando...", e depois aparece "Sem internet. Tente de novo." (pegar não pode ficar só local: dois pegariam o mesmo carro).

## 10. Microtextos prontos

| Onde | Texto |
|---|---|
| Bloco da tela inicial | **ESPERANDO MECÂNICO** · "toque pra ver" |
| Subtítulo da tela inicial | "2 carros com você" / "Nenhum carro com você" |
| Botão no cartão | **PEGAR ESSE CARRO** |
| Confirmar | **PEGAR O FOX?** · [SIM, É MEU] [Não] |
| Toast | "O Fox é seu · Desfazer" |
| Corrida | **O ZÉ PEGOU ANTES DE VOCÊ.** E você? |
| Carro com dono | **O ZÉ JÁ ESTÁ NESSE CARRO.** E VOCÊ? |
| Opções | [AJUDAR O ZÉ] "mesma coisa, junto" · [MEXER EM OUTRA PARTE] "outra coisa no carro" · Só olhar |
| Parte | **QUAL PARTE?** |
| Selos | NO CARRO · AJUDANDO O ZÉ · OUTRA PARTE · LUZES · ESPERANDO |
| Aviso ao dono | "Rafa entrou pra ajudar" / "Toninho está nas luzes" |
| Ação antes de entrar | **PEGAR ESSE CARRO PRA VOCÊ?** (aparece ao tocar Falar/Foto sem estar no carro) |
| Sair | "Sair desse carro" → "Sair do Celta? O que você fez continua com seu nome." [SAIR] [Ficar] |
| Passar | "Passar o carro pro Rafa?" [PASSAR PRO RAFA] [Deixar esperando] |
| Abertura (escritório) | **QUEM VAI MEXER?** · [avatares] · Deixar esperando |
| Dashboard (escritório) | "Mandar pra…" · "Pôr mais alguém" · "Trocar o dono" |
| Mecânico recebe | **NOVO PRA VOCÊ** · "A Cida te mandou esse carro · 10:42" · [BELEZA, VOU VER] · Não posso agora |
| Recebeu como ajudante | "A Cida te pôs pra ajudar o Zé no Celta" |
| Recusar | "Por quê?" [Tô ocupado] [Não é comigo] [Falta peça] |
| Escritório vê | "Mandado pro Rafa · ainda não viu" · "Rafa não pôde: tô ocupado" |
| Tirado | "O escritório tirou o Gol de você. O que você fez continua com seu nome." |
| Carro já passado | "A Cida mandou esse carro pro Rafa." E você? |
| Linha de autor | "Zé · 14:32" |
| Etapa | "Feito por Zé e Rafa" |
| Publicar | "Vai aparecer pro cliente: feito por Zé e Rafa." |
| Escritório | "Zé + Rafa ajudando" · "Zé · Toninho nas luzes" · "Esperando mecânico · 2 h" |
| Cliente | "Feito por Zé e Rafa" · **QUEM CUIDOU DO SEU CARRO** · "Zé e Rafa cuidaram do seu Celta" |
| Ficha (escritório) | "% a definir" |

## 11. Riscos de usabilidade (quem lê pouco, mão suja) e como evitar

1. **Pegar sem querer:** confirmar com foto, "Desfazer" por 8 s, e o escritório pode tirar.
2. **Confundir os papéis:** só 2 opções, cada uma com ícone, cor e frase de apoio. O nome do colega vai no botão ("AJUDAR O ZÉ"), porque um nome conhecido se lê mais rápido que palavra abstrata.
3. **Cor como única pista** (daltonismo, que é comum em homens, e sol na tela): sempre ícone mais palavra; o vazado e o cheio já distinguem dono e ajudante sem depender da cor.
4. **Esquecer de pegar e registrar sem nome:** a primeira ação pede para pegar o carro (§4).
5. **Esquecer de sair, e "meus carros" enche:** finalizar a OS tira todos. Proposta: aviso ao escritório quando um mecânico está há mais de 2 dias num carro sem registrar nada (regra do `produto-receita`).
6. **Celular compartilhado ou login de outro:** se dois usam o mesmo aparelho logado, os nomes saem errados, e isso quebra a prova contra o "não fui eu". O topo do modo simples precisa mostrar **de quem é a sessão** (avatar e primeiro nome, sempre visíveis). Depende da pergunta 2.
7. **Lista de espera longa:** mostrar o mais antigo primeiro, com o defeito em 1 linha. Sem filtro na versão do mecânico.
8. **A informação atrasa** (sem tempo real; a tela atualiza ao abrir ou a cada ~15 s, igual ao OBD): o caso da corrida é tratado sem erro (§4), e o texto nunca diz "agora mesmo".

## 12. Perguntas que só o Leonardo responde

1. **"Ajudando" e "trabalhando junto" são a mesma coisa pra vocês?** Recomendo que sim: 2 botões (Ajudar / Outra parte).
2. **Cada mecânico usa o próprio celular com o próprio login**, ou tem um aparelho/tablet da oficina? Se for compartilhado, precisa de uma "troca rápida de pessoa" (toque no avatar), senão o nome sai errado.
3. **Os dois caminhos ligados sempre** (pegar sozinho e o escritório passar), como recomendo para começar? Ou já é preciso uma chave "só o escritório distribui" para as oficinas em que o dono decide tudo? E quem trocar o dono de um carro: só o escritório/dono (minha recomendação) ou o próprio dono do carro também pode passar para um colega?
4. **Pode aparecer o primeiro nome dos mecânicos pro cliente?** Algum funcionário pode preferir não aparecer?
5. **Entrar como ajudante já mexe na comissão?** Recomendo que crie a linha com "% a definir" e o escritório decida; nunca um % automático.

## 12b. Alinhamento com `01-produto-regras.md` (lido depois do rascunho)

Batem: 2 papéis (Responsável + Ajudante com "parte" opcional); fila pelo mais antigo; pegar com confirmação e corrida tratada sem erro; modelo único, sem configuração na fase 1; a palavra do dono vence; "% a definir" sem travar a finalização; autor travado em cada item; só quem está no carro registra; primeiro nome por etapa pro cliente; "Você: Zé" no topo.

Ajustes que fiz para seguir o produto:
- os textos agora dizem "Esperando mecânico", "mandou" e "Mexer em outra parte";
- OS aberta por mecânico fica com ele, sem interruptor;
- o carro mandado entra direto em "Meus carros", sem aceite. O "Não posso agora" do §6.1 é o **"Largar" com motivo** do produto (1.1), só que oferecido no cartão "NOVO PRA VOCÊ";
- o fechamento da página do cliente não mostra a parte.

Diferenças de tela que mantenho (são de design, não de regra):
- **"Meus carros" e "Estou ajudando" juntos numa lista**, com selo por papel, em vez de dois blocos. Com 1 a 3 carros por mecânico, dois títulos ocupam a primeira dobra à toa. Se o mecânico tiver mais de 4 carros, separo em 2 blocos.
- **Ciano para "outra parte"**: o produto deixou cor e forma pro design.

O que faltava no design e incluo agora:
- **Histórico do escritório:** na OS (modo controle), "Mais ações" ganha **"Histórico"**, uma lista vertical com hora, avatar e frase curta ("14:30 Rafa entrou: luzes", "15:10 Zé apagou o teste Bateria, que era do Rafa"). Item apagado aparece riscado em `white/50`. Não tem botão de editar.
- **Item editado:** a linha de autor vira "Rafa · 14:32 · editado por Zé 15:02".
- **Item de outro:** o ajudante não vê "Editar" nem "Apagar" no item de outro ajudante (o botão some, não fica cinza).
- **"Mandar" no modo simples para o dono (owner):** se o pai do Leonardo manda pelo celular (pergunta 1 do produto), o owner no modo simples vê, em cada cartão de "Ver todos da oficina", o botão **"Mandar pra…"**, com o mesmo seletor de avatares. Para mecânico comum, o botão não aparece.

## 13. O que o marketing e o produto precisam confirmar

- `produto-receita`: as regras de §4–§6 (quem pega, quem tira, sair, a primeira ação exigir estar no carro) e a dependência de backend de §9. Se o `01-produto-regras.md` decidir diferente, este arquivo se ajusta.
- `marketing-estrategia` (depois): "Quem cuidou do seu carro" é um bom argumento de venda **só quando existir de verdade**. Não usar em texto de venda antes da implementação.
