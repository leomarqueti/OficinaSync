# Modo co-op entre mecânicos — regras de produto

**Resumo (5 linhas)**
1. O mecânico não vê todos os carros: a tela dele mostra **"Meus carros"**. Os carros sem ninguém ficam numa **fila "Esperando mecânico"**, de onde qualquer mecânico **pega pra ele** com um toque. O dono/escritório também pode **mandar** um carro pra alguém e trocar quem está nele, e a palavra do dono vence. É **um modelo só pra todas as oficinas, sem configuração na fase 1** (seção 1.1b).
2. Só **2 papéis**: **Responsável** (1 por carro) e **Ajudante**. Um ajudante pode estar só "ajudando" ou "mexendo em outra parte (ex.: lâmpada)". A diferença é **o texto da parte**, não um terceiro papel.
3. Reaproveita a equipe e a comissão em % que já existem: quem entra como ajudante vira participante com **"% a definir"**, e o escritório confirma.
4. Cada teste, foto, achado e fala grava **quem fez, com o login, na hora, sem poder editar**. Existe também um **histórico** que só cresce (pegou, largou, publicou, editou, apagou). É isso que acaba com o "não fui eu".
5. O cliente vê **o primeiro nome de quem fez cada etapa** (um nome ou os dois). Percentual e histórico ficam só pro escritório. A fase 1 cabe num teste na Lima. O PIN no celular compartilhado e o "pedir ajuda" ficam pra depois.

Marcação: **[REC]** = recomendação minha (produto), **[LEONARDO]** = decisão dele. Nada aqui foi implementado.

---

## 0. O que o código faz hoje (conferido)

- `ServiceOrders.user_id` = quem abriu. O responsável é `responsible_user_id ?? user_id`. **Problema:** quando a recepção abre a OS, a recepcionista vira "responsável" sem ninguém perceber. Isso suja a comissão e a ficha. O co-op precisa resolver isso.
- `service_order_participants`: ajudantes com `share_percent` (1–99, **obrigatório**) e `task` (texto, obrigatório). `PUT /participants` substitui a lista inteira, e só o responsável (com a OS aberta) ou o escritório pode chamar. Mecânico comum vê só a própria linha.
- **Autoria hoje é quase nenhuma:**
  - só `sections.published_by` (quem apertou "mostrar ao cliente");
  - `tests` e `medias` **não guardam quem criou**;
  - `sections.notes` é **um texto só**, e o "Falar" vai somando nesse texto. Não dá pra saber quem falou cada trecho;
  - peças e serviços internos já têm `created_by_user_id`, e esse é o modelo a seguir.
- O dashboard lista **todas** as OS abertas da oficina pra todo mundo. É exatamente o "ele se perde" do Leonardo.

---

## 1. As regras

### 1.1 Pegar o carro [REC]

**Como a tela do mecânico fica:**
- **Meus carros** (topo): onde ele é responsável.
- **Estou ajudando**: um rótulo diferente, "ajudando o Fulano".
- Botão grande **"Pegar carro"**, com o número de carros esperando (ex.: "Pegar carro · 3 esperando").
- A **fila** mostra só os carros **sem responsável**, do mais antigo pro mais novo, com foto da frente, placa e "esperando há 40 min".
- **"Buscar placa"** acha qualquer carro aberto, inclusive o de outro mecânico, pra entrar como ajudante. Os carros dos outros **não aparecem na tela principal**: só pela busca.

**Quem pega:**
- **Qualquer mecânico pega** da fila, com um toque e uma confirmação ("Pegar o Gol ABC-1234 pra você?"). Hoje é assim na oficina, e travar no escritório cria gargalo numa equipe de 1 pessoa no balcão.
- O **escritório pode atribuir e trocar** a qualquer momento (já existe `PATCH /responsible`). Ele também pode **devolver pra fila**.
- **Quem abre a OS:**
  - se é um **mecânico**, ele já vira o responsável (abriu, está nele);
  - se é o **escritório**, o carro **vai pra fila** (sem responsável). Isso corrige o problema da seção 0.

**Soltar o carro:**
- O responsável toca em "Largar este carro" e escolhe um motivo rápido e opcional: "acabou minha parte", "vou pegar outro", "falta peça".
  - Se tem ajudante, o sistema pergunta: **"Passar o carro pro Ciclano?"** Sim → o ajudante vira responsável. Não → volta pra fila.
  - Se não tem ajudante → volta pra fila, com o selo "largado por Fulano · falta peça".
- O ajudante toca em "Sair deste carro". Ele some de "Estou ajudando"; o que ele fez **continua com o nome dele**.

### 1.1b Um modelo só, que serve pra todas as oficinas [REC]

**Contexto (informação do Leonardo):**
- Na Lima a distribuição é "na conversa". Às vezes o mecânico diz "vou mexer naquilo". Às vezes o dono (o pai dele) manda "fulano, vai mexer naquilo". Às vezes sobra um carro e alguém pega.
- Em outras oficinas o dono decide tudo.
- O Leonardo prefere uma forma prática que sirva pra todas, em vez de uma configuração.

**Modelo único, as duas portas sempre abertas:**
- **Porta do mecânico:** ele **pega** da fila, ou **entra** num carro com dono (ajudar / outra parte).
- **Porta do dono/escritório:** ele **manda**. Escolhe o carro, toca no nome do mecânico, e pronto: o carro aparece em "Meus carros" do mecânico com o selo **"Mandado por Antônio"** (e na fase 2, aviso no celular). O dono também pode **mandar alguém ajudar**, com a parte.
- O dono pode **trocar** a qualquer hora, inclusive tirar um carro que o mecânico pegou sozinho. **A palavra do dono vence sempre**, e fica no histórico.
- O histórico registra **como** cada um chegou no carro: "pegou da fila", "entrou pra ajudar" ou "mandado por Fulano". O dono vê no painel quem se mexeu sozinho e quem foi mandado.

**Por que isso já serve à oficina rígida sem configuração:** lá o dono manda cada carro **logo que a OS abre**, então a fila quase não aparece pros mecânicos. Na oficina "na conversa", os dois caminhos convivem, como na Lima hoje. É o mesmo sistema; muda só o costume de cada oficina.

**A configuração vale a pena? Não na fase 1.** Os motivos:
1. O caso rígido é atendido pelo modelo único (o dono manda antes; se alguém pegar sozinho, ele vê no painel e troca com 1 toque).
2. Toda configuração é mais uma coisa pra explicar no onboarding e no suporte pelo WhatsApp do Leonardo, e dobra os testes (cada tela tem 2 jeitos).
3. Ainda não temos nenhuma oficina pagante pedindo isso. É hipótese, não demanda.

**Quando passa a valer a pena:** se uma oficina real (cliente ou em teste) disser que mecânico pegando carro sozinho é problema **mesmo podendo trocar depois**. Aí entra **uma única chave**, desligada por padrão, no Configurações do dono: **"Só o escritório distribui os carros"**. Com ela ligada:
- o botão "Pegar carro" some;
- o mecânico continua podendo **entrar como ajudante**, porque isso registra quem fez e não tira o carro de ninguém. A oficina rígida pode querer travar isso também, mas só se pedirem.

Custo baixo de adicionar depois, porque as regras de pegar e mandar já estarão separadas no servidor.

**Carro esperando peça [REC, fase 2]:** um estado "parado" que não fica na fila nem pesa em ninguém. Na fase 1, "largar · falta peça" já resolve.

### 1.2 Papéis: no mínimo 2 [REC]

| Papel | Quantos por carro | O que significa |
|---|---|---|
| **Responsável** | 1 (ou nenhum = na fila) | "O carro é meu." Publica as etapas, finaliza, monta a equipe. |
| **Ajudante** | 0 a vários | "Estou nesse carro também." Pode ter uma **parte**. |

A **parte** é opcional, com chips ou ditado: "motor de partida", "lâmpada", "suspensão"...
- **Sem parte** = "ajudando o Fulano".
- **Com parte** = "mexendo na lâmpada (junto com Fulano)".

Isso cobre as 3 frases do Leonardo ("ajudando", "trabalhando junto", "mexendo em outra parte") sem criar 3 papéis. "Trabalhando junto" e "ajudando" são a mesma coisa na prática, e separar só gera discussão de rótulo. **[LEONARDO]** confirmar se na Lima "ajudar" e "fazer junto" pesam diferente na comissão; se pesam, isso entra no %, não num papel novo.

**Quando um mecânico entra num carro que já tem dono**, a pergunta é uma só, com botões grandes:

> **O Fulano já está nesse carro. O que você vai fazer?**
> [ Ajudar o Fulano ]  [ Mexer em outra parte ]  [ Voltar ]

"Mexer em outra parte" abre os chips de parte, ou o ditado.

**Como o escritório vê** (o designer-ux define cor e forma; a regra é esta):
- carro só com responsável: "Fulano";
- com ajudante sem parte: "Fulano + Ciclano (ajudando)";
- com ajudante com parte: "Fulano · Ciclano na lâmpada";
- na fila: "Esperando mecânico · há 1h10".

### 1.3 Ligação com participantes e comissão (%) [REC: reaproveitar, não substituir]

- Entrar como ajudante **cria a linha em `service_order_participants`** sozinho. A parte vira o `task` ("ajudando" quando vazio), e o % fica **"a definir"** (vazio).
- **O mecânico declara presença; o escritório confirma o %.** O responsável também pode preencher o %, como já pode hoje. O mecânico ajudante **nunca** define o próprio %.
- Enquanto houver % "a definir":
  - a OS **finaliza normalmente**. Não travar o mecânico por causa de conta do escritório; é a mesma lógica da peça sem acerto;
  - a **Comissões** e a **ficha** mostram em amarelo "% a definir: Ciclano", e aquela OS **não entra no total** de ninguém até alguém confirmar. Assim ninguém recebe um valor errado sem ver.
- Quem saiu do carro **continua na equipe** se fez alguma coisa. Se entrou e saiu sem registrar nada, a linha some sozinha.
- **Sem % automático na fase 1** (nada de "ajudante = 50%"), salvo se o Leonardo tiver uma regra fixa. Ver pergunta 2.

### 1.4 Autoria: quem fez cada coisa

**Regra única:** todo registro grava **autor = usuário logado + data/hora**, no servidor (nunca vem do celular), e **não tem campo pra trocar o autor**. Nem o escritório troca.

| Coisa | Como fica a autoria |
|---|---|
| Teste / achado / antes e depois | `criado por` + `editado por/quando` (último), se mudar |
| Foto / vídeo / áudio | `enviado por` |
| Fala/texto da etapa | cada "Falar" vira **um trecho com dono** (não mais um texto único sem autor) |
| Etapa | **"Feita por"** = quem tem algum item nela (calculado) + **"publicada por"** (já existe) |
| Peça/serviço interno | já tem `criado por`, e continua |

**Feito junto:** cada um registra o que fez com o próprio login, e a etapa mostra os dois nomes.

Não existe "registrar em nome de outro" na fase 1. Se o Fulano fez e o Ciclano é quem tirou a foto, aparece o Ciclano na foto, e os dois estão na equipe do carro. É assim que é verdade.

**O que cada um vê:**

| | Cliente (página e laudo) | Mecânico | Escritório |
|---|---|---|---|
| Nome por etapa ("Por Fulano e Ciclano") | sim, primeiro nome **[LEONARDO]** | sim | sim |
| Autor de cada foto/teste/trecho | não, para não poluir | sim | sim |
| "Ajudando / outra parte" | não | o próprio e o do carro | sim |
| % de comissão | **nunca** | só o próprio (já é assim) | sim |
| Histórico (pegou, largou, apagou...) | **nunca** | não na fase 1 | sim |

### 1.5 O que impede o "não fui eu"

1. **Autor automático e travado.** Vem do login, gravado pelo servidor, sem edição.
2. **Histórico que só cresce** (fase 1, simples): uma lista por OS com "14:02 Fulano pegou o carro", "14:30 Ciclano entrou: lâmpada", "15:10 Fulano apagou o teste 'Bateria' (criado por Ciclano)", "16:00 Fulano publicou Reparo". Não existe rota pra editar nem apagar o histórico. **Apagar um teste ou foto continua possível, mas fica registrado quem apagou e o que era.**
3. **Quem pode mexer no item dos outros [REC]:**
   - o **autor** edita e apaga o próprio item;
   - o **responsável** e o **escritório** também podem, mas fica no histórico;
   - um ajudante **não** edita o item de outro ajudante.
4. **Só quem está no carro registra nele.** Se um mecânico que não é responsável nem ajudante tenta adicionar algo, a tela faz a pergunta da seção 1.2 antes. O servidor recusa mecânico de fora do carro. O escritório é exceção.
5. **Nome grande no topo:** "Você: Zé". Num celular compartilhado, isso faz o erro aparecer na hora.

Limite honesto: o sistema prova **qual login** fez, não **qual pessoa**. Se dois dividem celular e não trocam de login, o nome sai errado. Ver o caso "celular compartilhado" na seção 1.6.

### 1.6 Casos difíceis

| Caso | Regra [REC] |
|---|---|
| **Carro sem ninguém** | Fica na fila, a mais antiga primeiro, com "esperando há X". O escritório vê a fila inteira e pode atribuir. Na fase 2, aviso se passar de N horas **[LEONARDO]**. |
| **Pega e larga** | Largar fica registrado, com o motivo opcional. O que ele fez continua com o nome dele. Volta pra fila com o selo "largado por" ou vai pro ajudante. |
| **Dois pegando ao mesmo tempo** | Quem chega primeiro no servidor ganha (operação atômica). O segundo vê: **"O Fulano acabou de pegar esse carro. Quer ajudar ele?"** [Ajudar] [Voltar pra fila]. |
| **Celular compartilhado** | Fase 1: cada mecânico com **o próprio login** (já existe convite), e "Sair" fácil no menu. Fase 2: troca rápida de mecânico com **PIN de 4 dígitos**, sem digitar e-mail e senha. Ver pergunta 4. |
| **Mecânico faltou** | O escritório **troca o responsável** ou **devolve pra fila**. O que o faltante já fez continua no nome dele; a comissão é decidida no %. |
| **Mecânico desligado da oficina** | Os registros dele continuam com o nome dele. Os carros abertos dele vão pra fila automaticamente quando a conta for desativada. |
| **OS finalizada** | Mecânico não entra nem sai do carro. Equipe e % só pelo escritório (já é a regra hoje). Autoria nunca muda. |
| **Escritório abre e o próprio dono (owner) trabalha no carro** | Owner pode pegar da fila como um mecânico. Ele é escritório e mecânico ao mesmo tempo, então as permissões de escritório valem. |
| **Responsável quer finalizar com ajudante ainda "no carro"** | Pode finalizar. Os ajudantes saem automaticamente. % a definir continua pendente pro escritório. |

---

## 2. Fase 1 (teste na Lima) x depois

**Fase 1, o mínimo que resolve o pedido:**
1. Fila "Esperando mecânico" + "Pegar carro" + "Largar".
2. Mecânico que abre a OS já fica com ela; OS aberta pelo escritório vai pra fila.
3. "Meus carros" e "Estou ajudando" na tela do mecânico; o dashboard do mecânico **deixa de listar tudo**. Busca por placa pra achar os outros.
4. Entrar num carro com dono: Ajudar / Outra parte (com chips de parte).
5. Escritório: vê quem está em cada carro (com parte), atribui, troca, devolve pra fila.
6. Ajudante entra na equipe com "% a definir"; Comissões e ficha avisam e não somam até confirmar.
7. Autor gravado em teste, achado, foto, vídeo, áudio e em cada trecho de fala.
8. "Feita por" em cada etapa, na OS, na página do cliente e no laudo (primeiro nome).
9. Histórico da OS, só leitura e só pro escritório, incluindo o que foi apagado.
10. Regra de quem edita e apaga o item dos outros (seção 1.5 item 3).

**Depois:**
- PIN de troca rápida no celular compartilhado;
- "Pedir ajuda" (o mecânico chama alguém, que recebe aviso);
- estado "parado esperando peça";
- aviso de carro esperando há muito tempo;
- sugestão automática de %;
- tempo trabalhado por pessoa;
- desempenho por funcionário (já previsto na Fase 3 da reforma visual);
- carga de cada mecânico no painel ("Zé com 3 carros").

**Medir no teste da Lima (2 semanas, sugestão):**
- quantas OS ficaram com responsável certo, sem o escritório corrigir;
- quantas vezes alguém entrou como ajudante;
- quantos "% a definir" o escritório teve que resolver;
- se ainda houve prestação de serviço pelo WhatsApp em paralelo, o sinal de que algo não serve.

---

## 3. Mudanças prováveis no backend (alto nível)

Tudo pelo `InternalContextService.load` (tenant do token), com usuários sempre validados contra o tenant, como já é no `setResponsible`/`setParticipants`.

**Dados:**
- `service_orders.responsible_user_id` passa a valer como "**null = na fila**", e **para de cair pro `user_id`** em OS novas abertas pelo escritório. A migration preenche o `responsible_user_id` das OS **existentes** com o `user_id`, pra comissão antiga não mudar. *Atenção:* o fallback `?? user_id` está espalhado em comissão, ficha e permissões; precisa trocar em todos os lugares.
- `service_order_participants`:
  - `share_percent` passa a aceitar vazio ("a definir");
  - `task` fica opcional;
  - novo `joined_at`;
  - novo `share_confirmed_by/at` (opcional, pra saber quem fechou o %).
  - A validação "soma ≤ 99" passa a considerar só os % preenchidos.
- `tests` e `medias`: `created_by_user_id` + `updated_by_user_id/updated_at`. Os registros antigos ficam sem autor e a tela mostra "—".
- Trechos de fala: nova tabela de trechos por etapa (autor, texto, data). O `sections.notes` continua existindo pra cliente/laudo/OS antigas, montado a partir dos trechos, ou mantido em paralelo (decisão técnica do `dev-backend`).
- Nova tabela de **histórico** da OS (tenant, OS, usuário, tipo do evento, detalhe curto, data), **só inserção**: sem update nem delete em nenhuma rota.

**Rotas (nomes indicativos):**
- `GET /service_orders/queue`: fila sem responsável, do tenant.
- `GET /service_orders/mine`: onde eu sou responsável ou ajudante, com o papel.
- `POST /service_orders/:id/claim`: atômico ("só pega se ainda está sem responsável"). Se alguém pegou antes, responde 409 com o nome de quem pegou.
- `POST /service_orders/:id/join` `{part?}` e `POST /service_orders/:id/leave`. O responsável que larga recebe a opção "passar pra fulano".
- `PATCH /responsible` (já existe) aceita também "devolver pra fila".
- `GET /service_orders/:id/events`: histórico, só pro escritório.
- Criar teste, mídia ou fala: 403 pra mecânico que não está no carro (o escritório passa).

**Cuidado com vazamento:**
- A rota pública e o laudo hoje **não conhecem** dados internos, e o `no-leak.spec.ts` trava isso.
- O "feita por" público expõe **só o primeiro nome por etapa**. % e histórico continuam proibidos.
- O teste de vazamento precisa ser atualizado pra permitir exatamente esse campo e nada mais (`guardiao-seguranca` revisa).

---

## 4. Perguntas pro Leonardo (a mais importante primeiro)

1. **Você topa o modelo único da seção 1.1b, sem configuração na fase 1?** É o mecânico pegando ou entrando + o dono mandando, e a palavra do dono vence. A chave "Só o escritório distribui" só entra quando uma oficina real pedir. Também: **o seu pai (dono) vai usar o celular pra mandar, ou quem manda no sistema é a pessoa do escritório?** Isso define se o "mandar" precisa ser fácil no modo simples também.
2. **Quando alguém ajuda, como decide o % hoje?** É caso a caso, ou existe uma regra fixa (ex.: ajudante sempre X%)? Se é caso a caso, o escritório confirma cada um.
3. **O cliente deve ver o nome dos mecânicos (incluindo o ajudante) na página e no laudo?** Minha recomendação: sim, primeiro nome por etapa.
4. **Cada mecânico tem o próprio celular, ou dividem aparelho?** Se dividem, o PIN de troca rápida sobe pra fase 1.
5. **Um mecânico pode corrigir ou apagar o que outro registrou?** Minha recomendação: só o autor, o responsável e o escritório, com tudo no histórico.
