# Reforma visual "Cinema Escuro Premium" — Fase 1: Fundação

Data: 2026-10-17 · Status: aguardando aprovação do Leonardo
Mockups aprovados: `.superpowers/brainstorm/418-1792271782/content/` (`direcao-visual-v2.html` opção 3, `tipografia.html` opção 2, `logo.html` opção 2, `animacoes.html` todas, `duas-caras.html`).

## 1. Por que

Leonardo: o sistema "parece amador, feito com IA, não parece valer R$ 99/mês", não tem animação e não foi pensado para quem quase não lê. O público real é a Lima Auto Elétrica (Tupã-SP): 4 mecânicos e 1 pessoa no escritório, de 21 a 50 anos, Android (tablets no futuro). Alguns mal escrevem, usam áudio no WhatsApp e mexem no celular com a mão suja. O escritório é mais letrado e precisa de dados e controle total.

**O que é sucesso:**
- Numa demo de 3 minutos, o dono de oficina sente que vale o preço.
- O mecânico usa sozinho no primeiro dia.
- O escritório enxerga tudo.

## 2. Mapa da reforma (5 fases, uma spec cada)

| Fase | Entrega |
|---|---|
| **1. Fundação (esta spec)** | identidade, tokens, letra, animações, componentes grandes, as duas "caras" escolhidas pelo cargo |
| 2. Modo simples do mecânico | início com os carros dele, OS em passos grandes, foto com um toque, entrada por texto/voz/áudio, "Como o carro chegou", alerta de foto de entrada |
| 3. Modo controle do escritório | painel do dia, peças, comissões, histórico. **Depois:** desempenho por funcionário (quanto fez no mês, quem deixa de pôr foto, quem é mais caprichado) — ideia do Leonardo, guardada para o fim da Fase 3 ou depois |
| 4. Página do cliente vitrine | status no topo, WhatsApp da oficina, prévia do link, áudio do mecânico |
| 5. Landing "acesso antecipado" | lista de espera, deixando **explícito que está em desenvolvimento** (sem venda/cobrança até segurança, dados e pagamento estarem prontos) |

**Teste de usabilidade em todas as fases:**
- Ao fim de cada fase, rodam as personas simuladas (`persona-seu-ze`, `persona-dona-cida`, `persona-rafa`) no ambiente de teste.
- Depois das Fases 2 e 3, há teste real na Lima, com um roteiro de tarefas escrito por nós.

### Regras que valem para todas as fases

- **O modo simples não poda o sistema.** Facilita o caminho sem tirar captura de prova. O cliente continua recebendo a página completa.
- **Proteção do mecânico:** tudo que comprova o estado do carro (fotos de entrada com data e hora do servidor, etapas publicadas) fica fácil de achar e nunca some em silêncio. Os itens concretos estão na Fase 2.
- **Persuasão honesta:** valor percebido por acabamento, animação e números reais do próprio uso. Nada de urgência falsa, contador fictício ou depoimento inventado (CDC).
- **Custo zero de serviço externo** nesta reforma: a voz usa o reconhecimento do próprio navegador; nada de IA paga.

## 3. Identidade (Fase 1)

### 3.1 Cores — "Cinema Escuro Premium" (mockup v2, opção 3)
- **Fundo:** `#0a0a0a`, com um brilho radial limão sutil no topo das telas principais (`radial-gradient(120% 55% at 50% 0%, #1d2a0a, #0a0a0a 55%)`).
- **Limão `#A3E635` = "tudo certo / ação principal".** **Amarelo `#FACC15` = "atenção / pendência"**, sempre com borda esquerda de 4px nos avisos. Vermelho `#F87171` só para erro ou perigo.
- **Tokens novos** em `src/index.css` (bloco `.dark`): `--warning`, `--success`, `--danger`, `--text-strong #fafafa`, `--text-body rgba(255,255,255,.72)`, `--text-soft rgba(255,255,255,.60)`.
- **Regra:** nenhum texto abaixo de `white/60` nem menor que 12px. `white/20–45` só em linhas e ícones decorativos.
- **Tema único escuro:** `class="dark"` direto no `<html>` do `index.html`. O hook `useDarkTheme` continua existindo (inofensivo), mas deixa de ser necessário. Isso acaba com o problema de telas claras esquecidas, como a de Finalizar. O laudo PDF continua claro (é gerado no backend, fora deste escopo).

### 3.2 Letras (opção 2)
- **Títulos, números e botões:** **Saira Condensed** 700/800, em **CAIXA ALTA** nos títulos e botões.
- **Texto corrido:** **Archivo** 400/600/700.
- As duas fontes são instaladas via `@fontsource` (servidas pelo próprio site; nada de Google Fonts em produção, por privacidade e para funcionar no 4G). A Geist sai.
- **Escala (celular):** 12 legenda · 14 apoio · 16 corpo · 20 · 28 · 40/48 títulos grandes. Rótulos em caixa alta com 12px mínimo.

### 3.3 Logo (opção 2 — engrenagem atual redesenhada)
- O símbolo da engrenagem com a ferramenta é **redesenhado em SVG** (como no mockup), com o nome "OFICINA**SYNC**" em Saira 800 e "Sync" em limão.
- Arquivos em `src/assets/brand/`:
  - `logo-horizontal.svg`
  - `logo-symbol.svg`
  - `logo-light.svg` (símbolo e texto escuros, "Sync" em verde-escuro `#4d7c0f`, para fundo branco e PDF)
- **Favicon:** `public/favicon.svg`, símbolo limão sobre quadrado `#0a0a0a` arredondado.
- **Ícones do app (PWA):** `icon-192/512`, `icon-maskable-512` (símbolo dentro dos 80% centrais) e `apple-touch-icon 180`. Todos **opacos**, gerados a partir do SVG (script de uma vez só, sem virar dependência).
- **Lixo do modelo pronto removido:** `public/icons.svg`, `src/assets/hero.png`, `react.svg`, `vite.svg`. O `logoOficinaSync.png` sai depois que nenhum arquivo o usar mais.
- O logo aparece no login do celular (hoje não aparece), no menu (no lugar do quadrado com "O") e no topo do modo simples.

## 4. Animações (todas as 6 aprovadas)

Ficam em `src/components/motion/`, ao lado de `Reveal`, `Stagger`, `CountUp` e `Parallax`, que já existem. Usam a biblioteca `motion`, que já está instalada.

| Componente | Quando | O que faz |
|---|---|---|
| `Celebrate` | etapa publicada, OS finalizada | visto que "estoura" com uma onda e 6 confetes limão/amarelo/branco, ~1s |
| `PhotoFlash` | foto capturada | flash branco de 0,45s e a miniatura "voa" para o canto |
| `Pressable` (dentro do `BigButton`) | todo botão grande | afunda (`scale .94`) ao tocar + `navigator.vibrate(10)` quando existir |
| `CountUp` (já existe) | números do painel | sobe contando |
| `Skeleton` (já existe em `ui/skeleton.tsx`, ganha brilho) | carregando | desenho da tela com brilho passando, em vez de tela vazia |
| `Stagger` (já existe) | listas | entrada em cascata, 80ms entre itens |

**Regras:**
- Com `prefers-reduced-motion`, tudo vira aparecer e sumir instantâneo, sem vibração.
- Nenhuma animação bloqueia o clique seguinte.
- A duração máxima é 1s, exceto o confete.

## 5. Componentes (em `src/components/kit/`)

| Componente | Regra |
|---|---|
| `BigButton` | altura ≥ 56px (64px na variante `hero`), Saira 800 caixa alta, variantes `primary` (limão) / `secondary` (contorno) / `danger`. **Desabilitado** = `bg-white/10 text-white/50` + prop `hint` que mostra **por que** está travado ("Tire a foto da frente pra continuar"); nunca o limão apagado ilegível de hoje |
| `ActionTile` | quadrado grande com ícone de 32px e uma palavra (padrão "Carro novo / Foto") |
| `StatusChip` | `ok` (limão), `alert` (amarelo), `neutral` (cinza), `danger` |
| `AlertBanner` | aviso amarelo com borda esquerda, ícone ⚠ e ação opcional ("Tirar agora") |
| `TextField` / `SelectField` / `TextAreaField` | o mesmo visual para input, select e área de texto. Rótulo sempre visível, 48px de altura, erro inline. **Substituem o `inputClass` copiado em 27 arquivos** (troca mecânica, sem mudar comportamento) |
| `PageHeader` | título em Saira caixa alta, subtítulo e ação à direita |

Os campos especializados que já existem (`PhoneField`, `CpfField`, `PlateField`, `YearField`, `KmField`, `FieldShell`) passam a usar o visual do kit por dentro. A lógica de validação não muda.

## 6. As duas caras (mockup `duas-caras.html`)

- **Quem vê o quê:**
  - `mechanic` → **modo simples**.
  - `receptionist` → **modo controle**.
  - `owner` → **modo controle**, com o botão "Ver como mecânico / Ver modo controle" no topo e no "Eu". A escolha fica em `localStorage` por usuário, tolerante a falha, igual ao passo a passo.
- **Fonte única:** `modeFor(role, ownerPreference)` em `src/lib/mode.ts`, função pura testada. Usa o `useMe` que já existe.
- **`SimpleShell` (modo simples):**
  - Tela cheia, logo pequeno no topo e barra fixa embaixo (78px, respeita `safe-area-inset-bottom`).
  - **4 botões nesta fase:** Início · Buscar · **+ Carro** (central, destacado, abre o wizard) · Eu.
  - O botão **Falar** entra na Fase 2 junto com a voz. Nada aparece "de enfeite" sem funcionar.
  - O **Início** do modo simples nesta fase é a lista de OS abertas atual, em cartões grandes (foto, carro, etapa) com animação. "Só os meus carros" e o alerta de foto ficam para a Fase 2.
- **`ControlShell` (modo controle):** o menu lateral de hoje (`DashboardSidebar`) refeito no visual novo, com logo, item ativo pela rota atual (hoje está fixo), itens de 44px no celular e `aria-label` em português. O "Ordens" duplicado sai. As páginas existentes continuam as mesmas, só herdam letra, cores, campos e botões novos. O "Painel do dia" é Fase 3.
- **Rotas:** as rotas não mudam. As páginas internas são envolvidas pela casca certa, e um mecânico que abrir uma URL do escritório continua barrado pelas regras que já existem (`permissionsFor` no backend).
- **Passo a passo (`GuidedTour`):** sobe a versão (`TOUR_VERSION + 1`) para todos verem o tour com o visual novo. Os textos são revisados para caber nos dois modos.

## 7. O que NÃO entra na Fase 1
- Voz, "meus carros", "Como o carro chegou", alerta de foto de entrada (Fase 2).
- Painel do dia, desempenho por funcionário (Fase 3).
- Página do cliente, prévia no WhatsApp (Fase 4).
- Landing (Fase 5).
- Laudo PDF: só troca o logo pela versão `logo-light`. O layout não muda.
- Nenhuma mudança de backend ou banco.

## 8. Testes e verificação
- **Vitest (`ui-tests/unit/`):**
  - `mode.test.ts`: mecânico → simples; recepção → controle; dono → controle por padrão e simples quando ele escolhe; storage quebrado não quebra.
  - `BigButton`: mostra o `hint` quando está desabilitado.
- **Playwright (`ui-tests/e2e/`):**
  - mecânico loga e vê a barra de baixo, sem menu lateral;
  - dono loga e vê o menu lateral, troca para o modo mecânico, recarrega e continua no modo escolhido;
  - nenhuma página principal fica com fundo claro (checa a cor de fundo computada do `body`);
  - o favicon é o novo.
  - As suítes atuais seguem verdes (seletores ajustados onde o texto mudar de caixa).
- **Acessibilidade:** contraste dos tokens calculado (texto ≥ 4,5:1) e alvo de toque ≥ 44px nos componentes do kit.
- **Visual:** prints no celular 375×812 e no tablet 800×1280 das telas principais, antes e depois. Revisão do `designer-ux` e rodada das personas no ambiente de teste.
- Regra do projeto: bug achado no caminho ganha teste de regressão.

## 9. Riscos
- **Troca de letra mexe em todo layout:** a Saira condensada ocupa menos largura, o risco é de "sobrar espaço". A verificação é pelos prints de antes e depois.
- **Refatoração dos 27 `inputClass`:** é mecânica, mas ampla. Os testes de tela existentes cobrem o wizard, o login e os dados internos.
- **`class="dark"` global:** alguma página pode depender do tema claro. Hoje só a Finalizar e o PDF; o PDF é do backend e não é afetado.
