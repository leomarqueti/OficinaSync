# Modo co-op entre mecânicos

Leonardo aprovou a direção em 2026-10-21 a partir das telas mostradas. O detalhe do time está em:
- regras: `docs/equipe/coop/01-produto-regras.md`;
- telas e microtexto: `docs/equipe/coop/02-design-telas.md`.

Este documento é o que vale. Onde os dois divergem, a decisão está aqui.

## Por quê

Na Lima Auto Elétrica (4 mecânicos e 1 pessoa no escritório), a distribuição é "na conversa": o mecânico pega o que sobra, ou o dono manda "fulano, mexe naquilo".

Quando dois trabalham num carro, cada um manda a prestação de serviço no WhatsApp ("fulano fez comigo"). Isso gera briga na comissão ("não é 50%, eu fiz mais") e o "não fui eu".

O sistema hoje piora isso de três jeitos:
- mostra **todas** as OS pra todo mundo, e o mecânico se perde;
- não sabe quem está em cada carro;
- quase não registra quem fez o quê: só `sections.published_by`. Testes e mídias não têm autor e as falas viram um texto único.

**Sucesso:**
- o mecânico acha os carros dele e os que estão esperando, sem se perder;
- o escritório vê num relance quem está em cada carro e como;
- cada coisa registrada tem dono, e ninguém consegue trocar;
- o cliente vê quem cuidou do carro;
- a comissão deixa de ser briga.

**Precisa servir pra qualquer oficina:** as que distribuem "na conversa" e as que têm o dono decidindo tudo.

## Anti-objetivos
- Mais de 2 escolhas pro mecânico ao entrar num carro (vira briga de nome).
- Tela do mecânico listando todos os carros da oficina.
- Autor editável, por qualquer um, inclusive o dono.
- Mostrar ao cliente porcentagem, comissão ou "ajudante".
- Configuração por oficina na fase 1.

## Decisões

### 1. Quem está no carro
- **Dois papéis:**
  - **Responsável:** 1 por carro, o "dono" do carro. Selo **NO CARRO**, limão cheio.
  - **Ajudante:** com um modo, que é ou **AJUDANDO** (mesma tarefa; limão vazado) ou **OUTRA PARTE · <parte>** (ciano `#22D3EE`, token novo `--coop-other`).
- **As partes:** Elétrica, Luzes, Motor, Partida e carga, Freio, Suspensão, Ar-cond., Outra (texto curto/ditado).
- **Carro sem responsável = "Esperando mecânico"** (selo amarelo).

### 2. Como um mecânico chega no carro (um modelo só, sem configuração)
- **Pegar:**
  - qualquer mecânico pega um carro da fila, com confirmação de 2 toques ("PEGAR O FOX?" / "SIM, É MEU") e toast com "Desfazer" (8 s);
  - **o pegar é atômico:** se outro pegou antes, a resposta é 409 com o nome de quem pegou, e a tela oferece entrar como ajudante ("O ZÉ PEGOU ANTES DE VOCÊ. E VOCÊ?").
- **Mandar** (dono ou escritório):
  - define o responsável ou põe um ajudante;
  - **sem aceite:** o carro já conta como do mecânico;
  - o mecânico vê "NOVO PRA VOCÊ · A Cida te mandou";
  - enquanto ele não abre, o escritório vê o avatar tracejado com "ainda não viu";
  - "Não posso agora" pede o motivo (Tô ocupado · Não é comigo · Falta peça) e devolve o carro pra fila com esse selo.
- **Entrar num carro com dono:** "O ZÉ JÁ ESTÁ NESSE CARRO. E VOCÊ?" com as opções **Ajudar o Zé** / **Mexer em outra parte** (escolhe a parte) / Só olhar.
  - o dono do carro vê "Rafa entrou pra ajudar" no próximo acesso. Não há push.
  - **Só o escritório ou o dono troca o responsável.** O mecânico não toma carro de ninguém.
- **Abrir a OS:**
  - mecânico abrindo → já é o responsável;
  - escritório abrindo → o carro vai pra fila, a não ser que ele escolha "QUEM VAI MEXER?" no Conferir.
  - **Corrige o bug de hoje:** a recepcionista virava responsável por `responsible ?? user_id`.
  - Migration: as OS antigas mantêm o responsável que tinham, então a comissão antiga não muda.
- **Sair:**
  - o responsável larga com motivo opcional. Se há ajudante, a pergunta é "Passar o carro pro Rafa?"; senão, o carro volta pra fila.
  - o ajudante sai.
  - **o que cada um registrou continua com o nome dele.**
  - finalizar a OS tira todo mundo.
- **Pra registrar algo, o mecânico precisa estar no carro.** Ao tocar numa ação sem estar, abre a folha de pegar/entrar antes. O servidor recusa o registro de mecânico de fora do carro. Escritório e dono podem sempre.

### 3. Telas
Seguem `02-design-telas.md` §2–§8. Resumo:
- **Mecânico (modo simples):**
  - NOVO PRA VOCÊ;
  - MEUS CARROS (todos os papéis numa lista, com selo; dono primeiro e o mais antigo primeiro);
  - bloco ESPERANDO MECÂNICO (n): abre a lista; vem aberto se ele não tem carro; some com 0;
  - link discreto "Ver todos da oficina";
  - ponto amarelo no "Início" quando há carro esperando.
- **Lista de espera:** cartão com foto, carro, defeito em 1 linha, "chegou há X" e o botão PEGAR ESSE CARRO; mais antigo primeiro.
- **Escritório (modo controle):**
  - cada OS mostra "Quem", com avatares e anéis de papel;
  - chips Todas / Esperando / Juntos / por mecânico;
  - "Mandar pra…", "Pôr mais alguém", "Trocar o dono" e "Tirar" com seletor de avatares grandes.
- **Dentro da OS:**
  - faixa NO CARRO com avatares e [+ eu];
  - linha de autor em cada registro ("Zé · 14:32");
  - "Feito por Zé e Rafa" no cabeçalho da etapa;
  - a confirmação de publicar mostra "Vai aparecer pro cliente: feito por Zé e Rafa";
  - "Mostrado ao cliente por Zé · 15:10";
  - registro de "outra parte" leva o rótulo ciano da parte, na mesma etapa (nunca cria etapa nova).
  - **Escritório e dono têm ainda:** "Histórico" em Mais ações, filtro "Ver só do Rafa" e "editado por Zé 15:02" na linha de autor.

### 4. Autoria e histórico (o fim do "não fui eu")
- **O servidor grava o autor** (o usuário do token) em: teste, achado, foto/vídeo/áudio, e cada trecho falado ou escrito da etapa.
  - A nota da etapa deixa de ser um texto único: **cada fala vira um trecho com autor e hora.**
  - As notas antigas viram um trecho sem autor ("registro antigo").
  - O texto juntado continua indo pro cliente e pro laudo.
- **Ninguém edita o autor.** Editar ou apagar o item de outra pessoa: só o autor, o responsável do carro ou o escritório/dono. Pra quem não pode, o botão some.
- **Histórico só de inserção**, por OS:
  - pegou, mandou, entrou (papel e parte), saiu, largou (motivo), não pôde (motivo);
  - publicou, editou e apagou item (de quem era);
  - finalizou.
  - **Só o escritório e o dono veem.**

### 5. Comissão
- **A comissão continua em %** da OS (decisão do Leonardo, 2026-10-21: "mais prático assim").
- **"Outra parte":** também entra na equipe com **"% a definir"**, igual ao ajudante.
- **"Feito por":** cada serviço da ficha interna ganha "feito por". O padrão é quem lançou o serviço; o escritório troca.
  - Serve de **prova** pro escritório decidir a %: "as luzes foram o Toninho".
  - A ficha e as Comissões mostram os serviços de cada mecânico.
- **Comissão em R$ por serviço fica pra depois**, junto com o orçamento digital, quando a OS passar a ter preço.
- **"Ajudando" (mesma tarefa):** reaproveita `service_order_participants`.
  - O ajudante entra com **"% a definir"** (o `share_percent` passa a aceitar vazio).
  - **Fase 1 sem configuração:** o campo de % mostra **30% como sugestão** (botão "usar 30%"), nunca preenchido sozinho. Com 2 ou mais ajudantes, a sugestão é dividir os 30% entre eles. *(minha call)*
  - A validação de soma ≤ 99 só conta % confirmados.
  - O escritório confirma ou ajusta, olhando o histórico.
- **Finalizar com % pendente é permitido.** A ficha e Comissões avisam em amarelo e não somam até alguém confirmar.

### 6. O que o cliente vê
- **No fim de cada capítulo publicado:** "Feito por Zé" / "Feito por Zé e Rafa" (primeiro nome de quem tem registro naquela etapa).
- **No fechamento:** o bloco "QUEM CUIDOU DO SEU CARRO" ("Zé e Rafa cuidaram do seu Celta"), com as iniciais e as etapas de cada um.
  - O laudo PDF espelha esse bloco.
- **Nunca aparecem:** porcentagem, "ajudante", a parte e o histórico.
- O `no-leak.spec.ts` / `internal-sheet.e2e-spec.ts` passa a permitir **só o primeiro nome por etapa**; o resto continua bloqueado.

### 7. Permissões e casos de borda *(minhas calls, a partir da revisão do builder)*
- **Quem abre fica com o carro?** Depende do papel de quem abre:
  - mecânico → fica com ele;
  - recepção → vai pra fila;
  - dono → no modo simples fica com ele; no modo controle vai pra fila.
  - O "QUEM VAI MEXER?" do Conferir já vem com esse padrão marcado e pode ser trocado.
- **Dono e escritório** nunca recebem 403 de "fora do carro". O dono que entra no carro conta como mecânico em tudo, inclusive no "Quem cuidou".
- **Crédito pro cliente ("Feito por" / "Quem cuidou"):** só quem esteve no carro (responsável ou ajudante em algum momento) e tem registro publicado naquela etapa.
  - O que a recepção registra na abertura (fotos do check-in, relato) não dá crédito de mecânico. Continua com autor, mas só pro histórico interno.
- **Mostrar etapa ao cliente:** quem está no carro + escritório/dono.
- **Finalizar OS:** responsável + escritório/dono. O ajudante não finaliza.
- **Falas:**
  - cada trecho é editado ou apagado pela mesma regra dos outros itens (autor, responsável, escritório/dono), e isso vai pro histórico;
  - o texto antigo vira um trecho "registro antigo", sem autor, que só o responsável e o escritório editam;
  - o `EditNotesSheet` e a finalização passam a gravar trechos, em vez de regravar o `notes` inteiro.
- **OS abertas no dia do deploy:**
  - abertas pela recepção sem responsável escolhido (hoje herdam a recepcionista) → vão pra fila;
  - abertas por mecânico → ficam com ele;
  - finalizadas → não mudam (a comissão antiga continua igual).

## Fase 1 (pra testar na Lima) x depois
- **Fase 1:** tudo das seções 1 a 6, menos o que está abaixo.
- **Depois:**
  - PIN por pessoa em celular compartilhado;
  - "pedir ajuda" (chamar outro mecânico);
  - carro "parado esperando peça" como estado próprio;
  - notificação push;
  - foto de perfil no avatar;
  - painel de desempenho por funcionário;
  - a chave "só o escritório distribui".

## Restrições
- **Tenant isolado em toda rota nova:** mandar ou entrar só com usuário da mesma oficina; mecânico de outra oficina → 403.
- **DTO com decorator** em todo campo.
- **Migrations** escritas e conferidas (sem `synchronize`).
- **Todo bug achado ganha teste de regressão.**
- O backend é a fonte da verdade de "quem está no carro" e do autor. O frontend nunca manda `author_id`.
- Telas no padrão Cinema Escuro e kit (`BigButton`, `ActionTile`…), alvos ≥ 48px.
- O modo simples continua com a barra de baixo.

## Calls que fiz (Leonardo pode mudar)
- Ciano pra "outra parte".
- 30% como padrão do ajudante.
- Mandar sem aceite.
- Notas antigas viram "registro antigo" sem autor.
- O cliente vê só o primeiro nome.

## Fica pro builder
- Nomes de tabelas e rotas, e o formato do histórico.
- Como a lista do mecânico é calculada (rota nova x filtro na existente).
- A quebra em tarefas e a ordem.
