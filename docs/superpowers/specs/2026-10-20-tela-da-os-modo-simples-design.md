# Tela da OS — uma etapa por vez (Fase 2 da reforma visual)

Aprovado pelo Leonardo em 2026-10-20 ("manda bala") a partir do desenho de dois celulares (meio e fim do serviço).

## Por quê

A `OsWorkPage` ainda é a tela antiga. As personas reclamaram:
- 6 botões no topo, todos com o mesmo peso;
- "Finalizar OS" como botão principal desde o começo;
- a barra de baixo some dentro da OS;
- voltar pequeno;
- botões de etapa de 34px.

O mecânico lê pouco e está de mão suja. Ele precisa saber **o que fazer agora**, sem perder nada do que o sistema já faz. O cliente continua recebendo a página completa, e a tela protege o mecânico mostrando sempre como o carro chegou.

## O que muda (mecânico e escritório usam a mesma tela)

1. **Topo:**
   - voltar de 48px;
   - carro e placa em letra grande; embaixo, "OS #N · cliente X";
   - botão "⋯" com as ações menos usadas (abaixo).
   - O banner "Dados pendentes" continua.
2. **"Como o carro chegou"** (sempre no topo, depois do banner):
   - fotos do check-in, defeito relatado, mídia do relato (`intake`);
   - um toque numa foto abre grande (lightbox);
   - logo abaixo, "Mandar link pro cliente" (WhatsApp), que é o que mais se usa no começo.
3. **Barra de progresso** com as 4 etapas principais: Check-in → Diagnóstico → Reparo → Finalização.
4. **Cartão "Agora"** da etapa atual. A etapa atual é a primeira das 4 que ainda não foi mostrada ao cliente.
   - Botões grandes (≥ 72px): **Falar**, **Foto ou vídeo**, **Teste**, **Achado**.
   - Se a etapa ainda não existe, o primeiro toque cria a etapa sozinho. Acabou o passo "criar etapa".
   - **Falar** abre uma folha com:
     - campo de texto + ditado grátis do navegador (`DictationButton`) → o texto entra na explicação da etapa (`notes`, somado ao que já tinha);
     - "Gravar áudio" (`AudioRecorder`) → vira mídia da etapa.
   - Resumo do que já tem ("2 fotos · 1 teste") e "Ver e editar tudo", que abre o `SectionCard` atual com editar e excluir.
   - **"Pronto, mostrar ao cliente"** publica a etapa. Mantém a confirmação.
   - Etapa vazia (sem texto, foto ou teste) não publica; o botão diz o que falta.
5. **Etapas feitas** viram linhas com ✓ e o resumo. Um toque expande o `SectionCard` (dá pra adicionar coisa depois).
6. **Etapas extras** (Inspeção geral e Scanner/OBD, quando ligado) aparecem como linhas iguais, se existirem. Criar uma nova fica no "⋯".
7. **Fim:**
   - quando as 4 etapas foram mostradas ao cliente, o cartão "Agora" vira **"Tudo pronto"**, com "Finalizar OS" como botão principal, mais WhatsApp e Laudo;
   - antes disso, "Finalizar OS" fica só no "⋯";
   - não bloqueia: tem serviço que pula etapa.
8. **Menu "⋯":**
   - Página do cliente
   - Copiar link
   - Laudo PDF
   - Vídeo (quando liberado)
   - Coletar OBD e Scanner ao vivo (quando há scanner online)
   - Peças e equipe
   - Ficha do escritório (quando pode)
   - Nova etapa extra
   - Finalizar OS
9. **Barra de baixo:** a rota `/os/:id` passa a ficar dentro do `AppShell`. O mecânico vê a barra de baixo; o escritório vê o menu lateral.

## Decisões minhas (Leonardo pode mudar)

- As 4 etapas principais são fixas. "Inspeção geral" e "Scanner" são extras.
- "Pronto, mostrar ao cliente" publica direto, depois de uma confirmação. Não há prévia; a prévia é a "Página do cliente" no "⋯".
- O texto falado é **somado** à explicação da etapa, nunca substitui.

## Fora do escopo

- O modo controle com mais dados (Fase 3).
- Mudar a página do cliente (Fase 4).
- Mudar o backend: tudo usa rotas que já existem.

## Testes

- **Lógica pura** (`src/lib/osFlow.ts`, Vitest):
  - etapa atual;
  - estado de cada etapa;
  - resumo;
  - se pode publicar e o que falta;
  - "tudo pronto";
  - juntar o texto falado.
- **Tela** (Playwright, `e2e/tela-da-os.spec.ts`):
  - voltar ≥ 48px e barra de baixo visível;
  - a etapa atual é Diagnóstico numa OS aberta com check-in;
  - "Falar" grava texto e cria a etapa sozinho;
  - publicar passa para o Reparo;
  - "Finalizar OS" só vira principal no fim;
  - "Como o carro chegou" mostra as fotos.
- Os testes antigos que usavam os botões soltos ("Publicar pro cliente", "Copiar link", "Ficha do escritório", "Peças e equipe") passam a abrir o "⋯" ou usar o cartão "Agora".
