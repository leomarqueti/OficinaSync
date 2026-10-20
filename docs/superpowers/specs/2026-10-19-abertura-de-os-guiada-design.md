# Abertura de OS guiada — uma pergunta por tela (Fase 2 da reforma visual)

Data: 2026-10-19 · Status: aguardando aprovação do Leonardo.
Mockups: `.superpowers/brainstorm/975-1792456514/content/abertura-os-fluxo.html` (fluxo de 10 telas, aprovado) e as ilustrações do Leonardo (zip abaixo).

## 1. Por que

Hoje a abertura de OS (`OsCreateWizardPage`, `/os-client-create`) tem 5 passos, mas cada passo é um formulário com muitos campos. Na Lima Auto Elétrica (Tupã-SP), quem abre a OS no OficinaSync é **o mecânico, com o carro na frente**, muitas vezes de mão suja e lendo pouco. A OS formal já foi aberta pela moça do escritório em **outro sistema**, e é ela quem tem os dados do cliente.

**Se o OficinaSync obrigar dados do cliente, o mecânico tem que largar o carro e ir pedir no escritório**, o que atrasa e faz o pessoal desistir de usar. Mesmo assim, o jeito *certo* de usar o produto (em outras oficinas) é com o cliente presente, preenchendo tudo na hora. **Os dois caminhos precisam funcionar.**

**O que é sucesso:**
- o mecânico abre uma OS de um carro novo em **menos de 2 minutos**, tocando mais do que digitando, sem ajuda;
- de um carro que já veio antes, abre em **menos de 1 minuto**;
- nada do que protege o mecânico se perde: defeito registrado e 4 fotos de entrada.

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- **Uma pergunta por tela**, botões grandes, animação curta, barra de progresso.
- **Começar pelo carro (placa)**, não pelo cliente.
- **Placa já cadastrada** = reconhecer o carro e pular marca, modelo e ano. Hoje o modo rápido cria carro duplicado; isso acaba.
- **Marca → só os modelos daquela marca → ano**, tudo por toque.
- **KM com ilustração do painel** mostrando onde olhar.
- **Defeito sempre registrado**: escrever, gravar áudio ou filmar. É o registro de como o carro chegou.
- **Cliente opcional**: "O cliente está aqui?" — Sim (preenche agora) / Não (o escritório completa depois).
- **Fotos guiadas**: frente → traseira → lado esquerdo → lado direito, cada uma com a ilustração do lado certo; depois "Quer tirar mais fotos?".

**Não-objetivos (agora)**
- Reconhecer a placa por foto (OCR).
- Buscar modelos numa API externa (FIPE etc.), porque custa e depende de internet de terceiro.
- Tirar a foto com a câmera dentro do app, com moldura sobreposta. Usa a câmera nativa do celular.
- Mudar a tela da OS depois de aberta, que é outra parte da Fase 2.

**Anti-objetivos (o que seria fracasso mesmo funcionando)**
- O mecânico ter que ir ao escritório pedir dado para conseguir abrir a OS.
- Abrir OS sem as 4 fotos de entrada (o mecânico fica sem proteção).
- Perder o que foi digitado numa interrupção. O rascunho já existe (`osDraft.ts`) e tem que continuar valendo.
- Ficar mais lento do que hoje para quem já sabe usar.

## 3. Decidido pelo Leonardo

- **Ordem das telas:**
  1. Placa
  2. Marca
  3. Modelo
  4. Ano
  5. KM
  6. Cor e chassi (opcionais)
  7. Defeito
  8. "O cliente está aqui?"
  9. Fotos guiadas
  10. Conferir
- **Defeito é uma tela que existe sempre**, independente de o cliente estar ou não. **O texto do defeito é obrigatório.** Gravar áudio e filmar são complementos opcionais, que ficam registrados como "o carro estava assim no início".
- **A OS tem o próprio cliente** (opção A). Se o carro já é conhecido e quem trouxe agora é outra pessoa (carro vendido, filho com o carro do pai), essa OS sai no nome de quem trouxe, e as OS antigas continuam no nome do dono anterior.
- **"O cliente está aqui?"** decide só os **dados** do cliente:
  - "Sim" pede os dados agora;
  - "Não" segue sem travar, e a OS fica com "dados pendentes" para o escritório completar. O "Completar dados" e o bloqueio de finalizar já existem.
- **As 4 fotos de entrada são obrigatórias** para abrir a OS.
- **Ilustrações:** as do Leonardo, no estilo cheio/realista simplificado, em SVG. Estão em `C:\Users\domme\Documents\Codex\2026-10-19\https-github-com-leomarqueti-oficinasync-https\outputs\oficinasync-ilustracoes.zip`:
  - `carro-frente.svg`, `carro-traseira.svg`, `carro-lado-esquerdo.svg`, `carro-lado-direito.svg` (cerca de 2 KB cada);
  - `painel-km.svg` (15 KB).
  - Os arquivos foram conferidos: sem script, sem link externo.
  - Os PNGs do zip (1,8 MB cada) **não** entram, pelo peso no 4G.

## 4. As telas

Visual Cinema Escuro Premium (Fase 1): kit `@/components/kit` (`BigButton`, `ActionTile`, `StatusChip`, `AlertBanner`, campos), títulos Saira em caixa alta e animações de `@/components/motion`. Cada tela tem a barra de progresso no topo e "Voltar" grande (≥ 44px).

**1. Placa** — "Qual a placa?"
- Animação: a placa (estilo Mercosul, branca, faixa azul "BRASIL") "salta" na tela e o que é digitado aparece nela.
- Campo único, maiúsculo, aceitando os padrões antigo e Mercosul (`PlateField`/`isValidPlate`, que já existem).
- Ao ter placa válida, busca no backend. **Se achar**, mostra o cartão "É o **VW Gol 2013 prata** do **Seu João**?" com "Sim, é esse" (pula direto para a tela 5) e "Não, é outro carro".
- Se a placa existir em **mais de um** carro do tenant (dado antigo duplicado), mostra a lista para escolher.

**2. Marca** — "Qual a marca?"
- Grade de botões grandes com as marcas comuns (`CAR_BRANDS`, que já existe) e "Outra" (campo livre).
- Tocou, avança. Sem botão "Continuar".

**3. Modelo** — "Qual {Marca}?"
- Lista só dos modelos da marca escolhida, os mais comuns primeiro, mais "Não achei", que abre um campo livre.
- Tocou, avança.

**4. Ano** — "De que ano?"
- Anos em botões, do mais novo para o mais antigo, mais "Outro ano" para digitar.
- Tocou, avança.

**5. KM** — "Quanto marca o painel?"
- `painel-km.svg` com os ponteiros entrando e o retângulo do hodômetro piscando em limão. Tira-se o quadrinho vazio "QUILOMETRAGEM" do centro.
- Campo numérico grande (`KmField`). Para carro reconhecido, vem preenchido com o último KM conhecido, mas destacado como "confira o KM de hoje". É o KM **da visita**: `service_orders.mileage_in`.

**6. Combustível, cor e chassi** — "Se souber (opcional)"
- *Decisão minha:* o **combustível** entra aqui, como botões (Flex, Gasolina, Diesel, Elétrico). Finalizar a OS exige combustível; sem ele a OS só fica pendente.
- Cor por bolinhas de cor comuns mais "outra".
- Chassi num campo opcional.
- Botões "Pular" e "Continuar".
- Carro reconhecido: só aparece o que ainda falta no cadastro dele.

**7. Defeito** — "O que o carro tem?"
- **Texto do defeito obrigatório** (5 letras ou mais), num campo grande.
  - *Decisão minha, seguindo o que o Leonardo já tinha decidido sobre voz:* o campo tem um **botão de microfone que transforma fala em texto** pelo reconhecimento de voz do próprio navegador (grátis, sem serviço pago). Some quando o aparelho não suporta, e a pessoa digita.
- Complementos opcionais, em botões grandes: **Gravar áudio** (`AudioRecorder`) e **Filmar**. Entram na etapa `intake` como hoje e aparecem na página do cliente e no laudo.
- As perguntas rápidas de triagem (`intakeQuestions`) aparecem como **toques** quando são de escolha, opcionais e recolhidas.

**8. Cliente** — "O cliente está aqui?"
- **Sim:** procura um cliente existente (busca que já existe) ou pede os dados **nome e telefone**. CPF, endereço e e-mail aparecem como opcionais, porque o escritório pode completar.
  - O aviso de "CPF já é do cliente X / Usar esse cadastro" (já feito) continua valendo.
  - Se o carro foi reconhecido e já tem dono, pergunta "Quem trouxe é o Seu João?":
    - **Sim:** usa ele.
    - **Não:** procura ou cadastra outro cliente, e a OS fica no nome dessa pessoa (seção 6).
- **Não:** segue, e a OS sai com o cliente pendente. Se o carro tem dono cadastrado, a OS já nasce no nome dele, marcada para o escritório confirmar.

**9. Fotos** — 4 telas seguidas: frente → traseira → lado esquerdo → lado direito.
- Cada uma mostra os 4 cartões, com o lado da vez em destaque (borda limão) e os outros apagados, como no print do Leonardo, e um botão grande "Tirar foto da frente".
- Abre a câmera nativa (`capture="environment"`), comprime (`compressImage`) e roda o `PhotoFlash`. A miniatura toma o lugar da ilustração e avança sozinho para o próximo lado.
- Dá para refazer uma foto tocando nela.
- Depois das 4: **"Quer tirar mais fotos?"** (riscos, avarias), com "Sim" ou "Não, conferir".

**10. Conferir** — "Tudo certo?"
- Resumo em cartões: carro, KM, defeito (texto, áudio e vídeo), fotos, e cliente (ou "o escritório completa" em amarelo).
- Tocar num cartão volta à tela dele.
- Botão "Abrir OS" (`BigButton hero`) e, no sucesso, `celebrate("OS aberta")`.

## 5. Regras que continuam valendo

- **Nada é criado no backend antes do "Abrir OS"**: evita cliente ou carro órfão. Quando o carro é **reconhecido**, nenhum carro novo é criado; a OS usa o `car_id` existente.
- **Rascunho**: o rascunho atual (`osDraft.ts`) passa a guardar as respostas do fluxo novo. Fotos, áudio e vídeo **não** entram no rascunho (são arquivos); ao recuperar, avisa que precisam ser refeitos.
- **Mínimos para abrir:**
  - placa válida;
  - marca e modelo, de lista ou livres (exceto carro reconhecido);
  - ano (idem);
  - KM;
  - defeito, com ao menos um registro;
  - 4 fotos.
  - Cliente e cor/chassi **não** travam. Para **finalizar** a OS continua valendo a regra atual de dados completos (`computeMissingData` e `PATCH /finish` → 409).
- **Botão travado diz o que falta** (`nextHint`, já existe).
- **Os dois modos (simples e controle) usam a mesma abertura.** O escritório vê exatamente o mesmo fluxo.
- **Acessibilidade e movimento:** alvos ≥ 44px, animação ≤ 1s respeitando "menos movimento", texto ≥ 12px e ≥ `white/60`.

## 6. O que precisa existir que hoje não existe
- **Cliente na OS (decisão do Leonardo, opção A).** Hoje o cliente mora só no carro (`cars.client_id`), e as OS leem `car.client`.
  - Passa a existir `service_orders.client_id` (nullable, FK para `clients`, sem cascade), criado por migration.
  - A migration **copia** o `car.client_id` atual para todas as OS existentes, para que nada mude no que já foi feito.
  - Daqui pra frente, a OS guarda quem trouxe o carro naquela visita.
  - Todo lugar que mostra o cliente de uma OS passa a ler `order.client ?? car.client`: tela da OS, página pública, laudo PDF, dashboard, ficha do escritório, comissões e histórico do veículo.
  - `computeMissingData` e `PATCH /complete-data` passam a olhar o cliente da OS. Ao completar, se o carro não tinha dono, o carro ganha esse dono também.
  - Isolamento por oficina: o `client_id` da OS precisa ser da mesma oficina, com teste e2e.
- **Corrigir o carro reconhecido (decisão minha).**
  - Placa é única por oficina: "Não, é outro carro" **não cria carro repetido**; abre as telas 2–6 já preenchidas para **corrigir** o cadastro daquela placa.
  - Carro reconhecido com cadastro incompleto (aberto pelo modo rápido) pergunta só o que falta.
  - O que o mecânico completar ou corrigir é salvo no carro (`PATCH /cars/:id`, que já existe) no "Abrir OS".
- **Defeito só com texto ou com mídia (decisão minha):** `client_complaint` continua sempre texto, porque o texto é obrigatório. Áudio e vídeo vão para a etapa `intake`, como já funciona.

- **Busca por placa exata no backend** (tenant-scoped): devolve o(s) carro(s) com marca, modelo, ano, cor, último KM conhecido e o dono (`client_id`, nome). Hoje só existe a busca por termo (`GET /cars?search=`), que é parcial e mistura modelo e marca.
- **Catálogo de modelos por marca**: uma lista própria, **estática no frontend**, com os modelos mais vendidos no Brasil por marca (cerca de 10 a 20 por marca), na ordem de popularidade. "Não achei" cobre o resto.
- **Anos possíveis**: por padrão, do ano atual até 1980. Restringir pelos anos em que o modelo foi vendido fica a critério do construtor, se o catálogo trouxer isso fácil.
- **Ilustrações** copiadas para `frontend/oficinasync-web/src/assets/illustrations/`, usadas como `<img>` (evita conflito de `id` de gradiente entre SVGs). O piscar do hodômetro pode ser uma camada CSS por cima.

## 7. Deixado para o construtor

- A estrutura de componentes (uma tela por componente, um "roteador de passos"). A ordem e o pulo de telas para carro reconhecido seguem a seção 4.
- A animação exata da placa e da troca de tela, dentro do kit de movimento da Fase 1.
- Como reaproveitar ou aposentar a chave "Abertura rápida" atual: o fluxo novo a substitui, com o cliente opcional e o carro pela placa.
- O conteúdo exato do catálogo de modelos e as cores comuns.

## 8. Como saber que funcionou

- **Testes de tela (Playwright):**
  - abrir OS de carro novo pelo caminho "cliente não está";
  - abrir OS de carro reconhecido pela placa, sem criar carro duplicado (contar carros antes e depois);
  - abrir OS com o cliente presente e CPF já existente;
  - botão travado sem as 4 fotos;
  - rascunho recuperado após interrupção.
  - Os testes atuais do wizard (`criar-os.spec.ts`, `abertura-rapida.spec.ts`, `usabilidade.spec.ts`) são reescritos para o fluxo novo.
- **Backend (e2e):** busca por placa isolada por oficina (a placa da oficina B não aparece para a A).
- **Medir:** cronometrar com as personas simuladas (meta < 2 min para carro novo) e depois com o pessoal da Lima.
