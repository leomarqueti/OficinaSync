# Reforma visual — Fase 1 (Fundação) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a "cara de modelo pronto" do app pelo Cinema Escuro Premium. Entram identidade nova (logo, favicon, ícones, letras, tokens), animações, kit de componentes grandes e as duas "caras" escolhidas pelo cargo: modo simples para o mecânico, modo controle para escritório e dono.

**Architecture:** Só frontend (`frontend/oficinasync-web`), sem backend nem banco.
- **Tema e letras:** tema escuro global no `<html>`; letras servidas pelo próprio site (arquivos `.woff2` versionados, sem mexer no `package.json`).
- **Peças novas:** kit de componentes em `src/components/kit/`, animações em `src/components/motion/`, marca em `src/components/brand/`.
- **Cascas:** um `AppShell` decide a casca (`SimpleShell` ou `ControlShell`) por uma função pura `modeFor(role, preferência)`. As páginas deixam de montar o menu lateral elas mesmas.

**Tech Stack:** React 19, Vite 8, Tailwind v4, `motion` 12 (já instalado), lucide-react, Vitest 5 (`ui-tests/`, agora também renderizando componentes via `react-dom/server`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-reforma-visual-fase1-fundacao-design.md`

## Global Constraints

- **Cores:**
  - Fundo `#0a0a0a`.
  - Limão `#A3E635` = tudo certo / ação principal.
  - Amarelo `#FACC15` = atenção (aviso com borda esquerda de 4px).
  - Vermelho `#F87171` só para erro ou perigo.
- **Letras:** títulos, números e botões em **Saira Condensed** 700/800, caixa alta nos títulos (`h1`/`h2`) e botões grandes. Texto corrido em **Archivo** 400/600/700. A Geist sai.
- **Contraste e tamanho:**
  - Nenhum texto abaixo de `white/60` nem menor que 12px. Exceção: placeholder de campo em `white/50`.
  - Alvo de toque ≥ 44px; botão grande ≥ 56px (64px na variante `hero`).
- **Animações:**
  - Todas respeitam `prefers-reduced-motion`: sem confete, sem flash, sem vibração e entrada instantânea.
  - Duração ≤ 1s, exceto o confete.
  - Nenhuma bloqueia o clique seguinte.
- **Nada de serviço pago ou externo.** Fontes servidas localmente (nada de Google Fonts em produção).
- **Arquivos que NUNCA entram em commit** (são do Leonardo, sem commit, trabalho do app Android):
  - `frontend/oficinasync-web/package.json`
  - `frontend/oficinasync-web/package-lock.json`
  - `frontend/oficinasync-web/src/main.tsx`
  - `frontend/oficinasync-web/src/lib/nativeShell.ts`
  - `mobile/`
  - `.claude/launch.json`
  - `Laudo_Fox_2018_FXU1059.pdf`
  - Sempre use `git add <caminhos explícitos>`; nunca `git add -A`/`.`.
- **Rodar `git` sempre da raiz do projeto.** O frontend tem um `.git` aninhado antigo.
- **Todo bug achado no caminho ganha teste de regressão** que falha antes e passa depois (regra do Leonardo).
- **Commits** em português, terminando com:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Trabalhar na branch `feat/reforma-visual-fase1`**, criada a partir da `main`. Não fazer push sem o Leonardo pedir.

## Review Focus

1. **Owner com preferência "simples" salva e `localStorage` bloqueado ou corrompido.** O app abre no modo controle sem quebrar. É o teste `mode.test.ts` ("storage que lança erro").
2. **`/users/me` falha (token vencido) dentro da casca.** O `AppShell` não pode ficar girando para sempre. Depois de carregar sem usuário, ele cai no `ControlShell` (comportamento antigo) e a página trata o 401. Teste no `AppShell` via função `shellFor(loading, me, mode)`.
3. **Mecânico abre por link uma página que não está na barra** (`/equipe`, `/comissoes`, `/veiculos/:id`). A página carrega dentro do modo simples, sem menu lateral e sem quebrar. É o teste e2e "mecânico abre /comissoes direto".
4. **Nome de oficina ou de pessoa muito longo em caixa alta** (ex.: "AUTO ELÉTRICA E MECÂNICA LIMA & FILHOS LTDA"). O título trunca com reticências e não estoura a largura no celular de 375px. É o teste e2e no `PageHeader` com viewport 375.
5. **Pedido de menos movimento ligado.** `Celebrate` não renderiza confete e `haptic()` não chama `vibrate`. Testes unitários em `haptics.test.ts` e `motion.test.tsx`.

---

## Estrutura de arquivos

**Criar (frontend `frontend/oficinasync-web/`):**
- `src/lib/mode.ts`: `AppMode`, `modeFor`, `readModePreference`, `saveModePreference`.
- `src/lib/haptics.ts`: `prefersReducedMotion`, `haptic`.
- `src/lib/session.ts`: `logout(navigate)`, que hoje está duplicado no menu.
- `src/components/brand/BrandLogo.tsx`: `BrandSymbol`, `BrandLogo`.
- `src/assets/brand/logo-symbol.svg`, `src/assets/brand/logo-symbol-light.svg`
- `src/assets/fonts/*.woff2` + `OFL-*.txt`
- `src/styles/fonts.css`
- `src/components/motion/Celebrate.tsx`, `src/components/motion/celebration.ts`, `src/components/motion/CelebrationHost.tsx`, `src/components/motion/PhotoFlash.tsx`
- `src/components/kit/fieldStyles.ts`, `TextField.tsx`, `SelectField.tsx`, `TextAreaField.tsx`, `BigButton.tsx`, `ActionTile.tsx`, `StatusChip.tsx`, `AlertBanner.tsx`, `PageHeader.tsx`, `index.ts`
- `src/components/shell/ModeContext.tsx`, `AppShell.tsx`, `ControlShell.tsx`, `SimpleShell.tsx`, `ModeSwitch.tsx`
- `src/components/simple/SimpleHome.tsx`
- `public/apple-touch-icon.png` (gerado)

**Criar (testes `ui-tests/`):**
- `unit/mode.test.ts`, `unit/haptics.test.ts`, `unit/brand.test.tsx`, `unit/motion.test.tsx`, `unit/kit.test.tsx`, `unit/shell.test.ts`
- `e2e/fundacao.spec.ts`
- `scripts/gen-brand-icons.mjs`

**Modificar:**
- Configuração e tema: `ui-tests/vitest.config.ts`, `ui-tests/e2e/global-setup.ts`, `frontend/oficinasync-web/index.html`, `src/index.css`, `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`
- Componentes: `src/components/ui/skeleton.tsx`, `src/components/ui/button.tsx`, `src/components/ui/sidebar.tsx` (só textos de acessibilidade), `src/components/DashboardSidebar.tsx`
- Rotas e passo a passo: `src/App.tsx`, `src/lib/tours.ts`
- Páginas com menu (8): `dashBoardPage.tsx`, `ClientsPage.tsx`, `CarsPage.tsx`, `CarHistoryPage.tsx`, `CommissionsPage.tsx`, `SettingsPage.tsx`, `TeamPage.tsx`, `ScannerPage.tsx`
- Outras páginas: `OsFinishPage.tsx`, `OsWorkPage.tsx`, `PublicServiceOrderPage.tsx`, `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `AcceptInvitePage.tsx`
- Os 27 arquivos com `inputClass` (Task 6) e `src/components/os/EntryPhotoSlot.tsx`. Se ele estiver em outra pasta, ache com `grep -rl "function EntryPhotoSlot" src`.

**Apagar:** `public/icons.svg`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/logoOficinaSync.png` (depois de tirar os usos), `src/App.zip`.

---

### Task 0: Branch

- [ ] **Step 1: Criar a branch a partir da main**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git switch -c feat/reforma-visual-fase1
git status --short
```
Expected: troca de branch. Os arquivos não commitados do Leonardo (`package*.json`, `main.tsx`, `nativeShell.ts`, `mobile/` etc.) continuam aparecendo como modificados ou não rastreados, **não mexa neles**.

---

### Task 1: Vitest renderizando componentes + modo do app

**Files:**
- Modify: `ui-tests/vitest.config.ts`
- Create: `frontend/oficinasync-web/src/lib/mode.ts`
- Test: `ui-tests/unit/mode.test.ts`

**Interfaces:**
- Produces:
  - `type AppMode = "simple" | "control"`
  - `modeFor(role: Role, ownerPreference: AppMode | null): AppMode`
  - `modeKey(userId: number): string`
  - `readModePreference(storage: Pick<Storage,"getItem"> | null | undefined, userId: number): AppMode | null`
  - `saveModePreference(storage: Pick<Storage,"setItem"> | null | undefined, userId: number, mode: AppMode): void`
  - A config do Vitest passa a aceitar `unit/**/*.test.tsx` e resolve `@/…`, `react` e `react-dom/*` a partir do frontend.

- [ ] **Step 1: Configurar o Vitest para importar componentes do frontend**

Substitua `ui-tests/vitest.config.ts` inteiro:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Lógica pura (src/lib) e componentes renderizados em HTML estático (react-dom/server).
// React vem do node_modules do FRONTEND (mesma instância que os componentes usam).
const FRONT = path.resolve(import.meta.dirname, '../frontend/oficinasync-web');
const NM = path.join(FRONT, 'node_modules');

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(FRONT, 'src') + '/' },
      { find: /^react$/, replacement: path.join(NM, 'react') },
      { find: /^react\/(.*)$/, replacement: path.join(NM, 'react') + '/$1' },
      { find: /^react-dom\/(.*)$/, replacement: path.join(NM, 'react-dom') + '/$1' },
    ],
  },
  test: {
    include: ['unit/**/*.test.ts', 'unit/**/*.test.tsx'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: Escrever o teste que falha**

`ui-tests/unit/mode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  modeFor,
  modeKey,
  readModePreference,
  saveModePreference,
} from '../../frontend/oficinasync-web/src/lib/mode';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}
const broken = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
};

describe('qual cara do sistema cada um vê', () => {
  it('mecânico sempre no modo simples, mesmo com preferência salva', () => {
    expect(modeFor('mechanic', null)).toBe('simple');
    expect(modeFor('mechanic', 'control')).toBe('simple');
  });

  it('recepção sempre no modo controle', () => {
    expect(modeFor('receptionist', null)).toBe('control');
    expect(modeFor('receptionist', 'simple')).toBe('control');
  });

  it('dono: controle por padrão, simples quando escolhe', () => {
    expect(modeFor('owner', null)).toBe('control');
    expect(modeFor('owner', 'simple')).toBe('simple');
  });
});

describe('preferência do dono guardada por usuário', () => {
  it('salva e lê de volta, separado por usuário', () => {
    const s = fakeStorage();
    saveModePreference(s, 7, 'simple');
    expect(readModePreference(s, 7)).toBe('simple');
    expect(readModePreference(s, 8)).toBeNull();
    expect(modeKey(7)).toBe('oficinasync_mode_7');
  });

  it('valor estranho no storage é ignorado', () => {
    const s = fakeStorage();
    s.setItem(modeKey(7), 'qualquer');
    expect(readModePreference(s, 7)).toBeNull();
  });

  it('storage que lança erro (aba anônima) não quebra: lê null, salvar não explode', () => {
    expect(readModePreference(broken, 7)).toBeNull();
    expect(() => saveModePreference(broken, 7, 'simple')).not.toThrow();
    expect(readModePreference(undefined, 7)).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/mode.test.ts`
Expected: FAIL — `Failed to load url ../../frontend/oficinasync-web/src/lib/mode` (arquivo não existe).

- [ ] **Step 4: Implementar**

`frontend/oficinasync-web/src/lib/mode.ts`:

```ts
import type { Role } from "./me";

/** "simple" = mecânico (botões grandes, poucos passos); "control" = escritório/dono (dados e controle). */
export type AppMode = "simple" | "control";

export const modeKey = (userId: number) => `oficinasync_mode_${userId}`;

/** Fonte única de qual "cara" do sistema cada pessoa vê. Só o dono escolhe. */
export function modeFor(role: Role, ownerPreference: AppMode | null): AppMode {
  if (role === "mechanic") return "simple";
  if (role === "receptionist") return "control";
  return ownerPreference ?? "control";
}

export function readModePreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
  userId: number,
): AppMode | null {
  try {
    const value = storage?.getItem(modeKey(userId));
    return value === "simple" || value === "control" ? value : null;
  } catch {
    return null;
  }
}

export function saveModePreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  userId: number,
  mode: AppMode,
): void {
  try {
    storage?.setItem(modeKey(userId), mode);
  } catch {
    // sem storage (aba anônima/bloqueado): a escolha vale só até recarregar
  }
}
```

- [ ] **Step 5: Rodar e ver passar + suíte unitária inteira**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run`
Expected: PASS — todos os arquivos (os 7 antigos + `mode.test.ts`).

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add ui-tests/vitest.config.ts ui-tests/unit/mode.test.ts frontend/oficinasync-web/src/lib/mode.ts
git commit -m "feat(visual): modo simples/controle por cargo + Vitest renderiza componentes do frontend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Marca — logo em vetor, favicon, ícones do app, limpeza

**Files:**
- Create: `frontend/oficinasync-web/src/components/brand/BrandLogo.tsx`, `src/assets/brand/logo-symbol.svg`, `src/assets/brand/logo-symbol-light.svg`, `ui-tests/scripts/gen-brand-icons.mjs`
- Modify: `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `index.html`, `src/pages/LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `AcceptInvitePage.tsx`
- Create: `public/apple-touch-icon.png`
- Delete: `public/icons.svg`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/logoOficinaSync.png`, `src/App.zip`
- Test: `ui-tests/unit/brand.test.tsx`

**Interfaces:**
- Produces:
  - `BrandSymbol({ tone?: "dark"|"light", className?: string, title?: string })`
  - `BrandLogo({ tone?: "dark"|"light", size?: "sm"|"md"|"lg", className?: string })`
  - Todo SVG da marca tem `data-brand="oficinasync-gear"`.
- Ruling registrado: a spec citava `logo-horizontal.svg` e `logo-light.svg` como arquivos. Como o nome usa a nossa letra, a versão horizontal e a clara viram **componente React** (`BrandLogo tone`). Arquivos estáticos ficam só para o símbolo. O laudo PDF hoje **não tem logo nenhum** (conferido em `report.template.ts`), então nada muda no backend.

- [ ] **Step 1: Teste que falha**

`ui-tests/unit/brand.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandLogo, BrandSymbol } from '@/components/brand/BrandLogo';

describe('marca', () => {
  it('símbolo é a engrenagem em vetor, limão no fundo escuro', () => {
    const html = renderToStaticMarkup(<BrandSymbol />);
    expect(html).toContain('data-brand="oficinasync-gear"');
    expect(html).toContain('#A3E635');
    expect(html).toContain('aria-hidden="true"');
  });

  it('logo horizontal tem nome acessível e "Sync" em limão', () => {
    const html = renderToStaticMarkup(<BrandLogo />);
    expect(html).toContain('aria-label="OficinaSync"');
    expect(html).toContain('Oficina');
    expect(html).toContain('text-brand');
  });

  it('versão pra fundo claro usa tinta escura e verde-escuro', () => {
    const html = renderToStaticMarkup(<BrandLogo tone="light" />);
    expect(html).toContain('#0A0A0A');
    expect(html).toContain('text-[#4d7c0f]');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/brand.test.tsx`
Expected: FAIL — `Failed to load url @/components/brand/BrandLogo`.

- [ ] **Step 3: Implementar o componente**

`frontend/oficinasync-web/src/components/brand/BrandLogo.tsx`:

```tsx
import { cn } from "@/lib/utils";

const LIME = "#A3E635";
const INK = "#0A0A0A";

type Tone = "dark" | "light";

/** Símbolo da marca: a engrenagem com a ferramenta do logo original, redesenhada em vetor. */
export function BrandSymbol({
  tone = "dark",
  className,
  title,
}: {
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const color = tone === "dark" ? LIME : INK;
  return (
    <svg
      viewBox="0 0 64 64"
      data-brand="oficinasync-gear"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <circle cx="32" cy="38" r="20" fill="none" stroke={color} strokeWidth="8" strokeDasharray="9 5.7" />
      <circle cx="32" cy="38" r="9" fill={color} />
      <path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill={color} />
    </svg>
  );
}

const SIZES = {
  sm: { icon: "h-7 w-7", text: "text-xl" },
  md: { icon: "h-10 w-10", text: "text-3xl" },
  lg: { icon: "h-16 w-16", text: "text-5xl" },
} as const;

/** Logo horizontal: símbolo + "OFICINASYNC" (Sync em destaque). `tone="light"` = pra fundo branco. */
export function BrandLogo({
  tone = "dark",
  size = "md",
  className,
}: {
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span role="img" aria-label="OficinaSync" className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandSymbol tone={tone} className={s.icon} />
      <span
        aria-hidden="true"
        className={cn(
          "font-display font-extrabold uppercase leading-none tracking-wide",
          s.text,
          tone === "dark" ? "text-white" : "text-[#0a0a0a]",
        )}
      >
        Oficina<span className={tone === "dark" ? "text-brand" : "text-[#4d7c0f]"}>Sync</span>
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Ver passar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/brand.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: SVGs estáticos e favicon**

`frontend/oficinasync-web/src/assets/brand/logo-symbol.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-brand="oficinasync-gear"><circle cx="32" cy="38" r="20" fill="none" stroke="#A3E635" stroke-width="8" stroke-dasharray="9 5.7"/><circle cx="32" cy="38" r="9" fill="#A3E635"/><path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill="#A3E635"/></svg>
```

`frontend/oficinasync-web/src/assets/brand/logo-symbol-light.svg`: o mesmo conteúdo, trocando as três ocorrências de `#A3E635` por `#0A0A0A`.

Substitua `frontend/oficinasync-web/public/favicon.svg` inteiro:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-brand="oficinasync-gear"><rect width="64" height="64" rx="14" fill="#0A0A0A"/><g transform="translate(5.8 4.1) scale(.82)"><circle cx="32" cy="38" r="20" fill="none" stroke="#A3E635" stroke-width="8" stroke-dasharray="9 5.7"/><circle cx="32" cy="38" r="9" fill="#A3E635"/><path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill="#A3E635"/></g></svg>
```

- [ ] **Step 6: Gerador dos ícones do app (opacos)**

`ui-tests/scripts/gen-brand-icons.mjs`:

```js
// Gera os ícones PNG do app (PWA/iOS) a partir do símbolo vetorial, com fundo OPACO.
// Rodar de ui-tests/:  node scripts/gen-brand-icons.mjs
import path from 'node:path';
import { chromium } from '@playwright/test';

const PUB = path.resolve(import.meta.dirname, '../../frontend/oficinasync-web/public');
const SYMBOL =
  '<circle cx="32" cy="38" r="20" fill="none" stroke="#A3E635" stroke-width="8" stroke-dasharray="9 5.7"/>' +
  '<circle cx="32" cy="38" r="9" fill="#A3E635"/>' +
  '<path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill="#A3E635"/>';

// scale = fração do quadrado ocupada pelo símbolo; o maskable precisa caber nos 80% centrais.
const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.78 },
  { file: 'icon-512.png', size: 512, scale: 0.78 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.72 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, scale } of ICONS) {
  // o desenho ocupa y 6..62 (centro 34) e x 8..56 (centro 32) no viewBox 64
  const tx = 32 - scale * 32;
  const ty = 32 - scale * 34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}"><rect width="64" height="64" fill="#0A0A0A"/><g transform="translate(${tx} ${ty}) scale(${scale})">${SYMBOL}</g></svg>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0A0A0A">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: path.join(PUB, file) });
  console.log('gerado', file);
}
await browser.close();
```

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && node scripts/gen-brand-icons.mjs`
Expected: 4 linhas `gerado ...`. Abra `frontend/oficinasync-web/public/icon-512.png` com a ferramenta Read e confira que é a engrenagem limão sobre o preto, sem transparência.

- [ ] **Step 7: `index.html` aponta para o ícone do iPhone novo**

Em `frontend/oficinasync-web/index.html` troque:

```html
    <link rel="apple-touch-icon" href="/icon-192.png" />
```
por:
```html
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

- [ ] **Step 8: Logo nas 4 telas de entrada (aparecendo também no celular)**

Em `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` e `AcceptInvitePage.tsx`:

(a) Troque a importação:
```tsx
import logoOficinaSync from "@/assets/logoOficinaSync.png";
```
por:
```tsx
import { BrandLogo } from "@/components/brand/BrandLogo";
```

(b) Troque o painel do logo (só aparece no computador):
```tsx
        <img src={logoOficinaSync} alt="OficinaSync" className="h-auto w-72 object-contain" />
```
por:
```tsx
        <BrandLogo size="lg" />
```

(c) No celular, coloque o logo acima do primeiro `<h1>` do formulário. Exemplo do `LoginPage.tsx`:
```tsx
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Olá, mecânico! 👋</h1>
```
fica:
```tsx
        <div className="w-full max-w-md">
          <BrandLogo size="sm" className="mb-8 md:hidden" />
          <h1 className="text-3xl font-bold tracking-tight">Olá, mecânico! 👋</h1>
```
Faça o mesmo nas outras 3 páginas: `<BrandLogo size="sm" className="mb-8 md:hidden" />` logo antes do primeiro `<h1>` da coluna do formulário.

- [ ] **Step 9: Apagar as sobras do modelo pronto**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web"
grep -rn "logoOficinaSync\|hero.png\|react.svg\|vite.svg\|icons.svg" src index.html || echo "nenhum uso"
```
Expected: `nenhum uso`. Se aparecer algum, troque por `BrandLogo`/`BrandSymbol` antes de apagar.

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git rm -q frontend/oficinasync-web/public/icons.svg frontend/oficinasync-web/src/assets/hero.png frontend/oficinasync-web/src/assets/react.svg frontend/oficinasync-web/src/assets/vite.svg frontend/oficinasync-web/src/assets/logoOficinaSync.png frontend/oficinasync-web/src/App.zip
```

- [ ] **Step 10: Build e testes**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && npx tsc -b && npx vite build > /dev/null && echo BUILD-OK`
Expected: `BUILD-OK`.
Run: `cd ../../ui-tests && npx vitest run`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/components/brand frontend/oficinasync-web/src/assets/brand frontend/oficinasync-web/public/favicon.svg frontend/oficinasync-web/public/icon-192.png frontend/oficinasync-web/public/icon-512.png frontend/oficinasync-web/public/icon-maskable-512.png frontend/oficinasync-web/public/apple-touch-icon.png frontend/oficinasync-web/index.html frontend/oficinasync-web/src/pages/LoginPage.tsx frontend/oficinasync-web/src/pages/ForgotPasswordPage.tsx frontend/oficinasync-web/src/pages/ResetPasswordPage.tsx frontend/oficinasync-web/src/pages/AcceptInvitePage.tsx ui-tests/scripts/gen-brand-icons.mjs ui-tests/unit/brand.test.tsx
git commit -m "feat(visual): logo da engrenagem em vetor, favicon e icones do app opacos; logo no login do celular; remove sobras do Vite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Letras, tokens, tema escuro global

**Files:**
- Create: `src/assets/fonts/` (5 `.woff2` + licenças), `src/styles/fonts.css`
- Modify: `src/index.css`, `index.html`, `src/pages/OsFinishPage.tsx`, `src/pages/PublicServiceOrderPage.tsx`, `src/components/ui/skeleton.tsx`
- Test: `ui-tests/e2e/fundacao.spec.ts`

**Interfaces:**
- Produces:
  - Classes Tailwind: `font-display`, `text-warning`/`bg-warning`/`border-warning`, `text-success`, `text-danger`/`bg-danger`, `app-glow`, `skeleton-shimmer`.
  - `h1`/`h2`/`h3` em Saira por padrão, e `h1`/`h2` em caixa alta.
  - `<html class="dark">` sempre.
- Ruling: a spec pedia `@fontsource`. Para não tocar no `package.json` do frontend (que tem mudanças não commitadas do Leonardo), os `.woff2` dessas mesmas fontes (licença OFL) são **copiados para o repositório**. O resultado é o mesmo: servidas pelo próprio site.
- Ruling: a página da ficha (`OsSheetPage`) **continua clara de propósito**, porque é documento para imprimir. Fica fora da checagem de fundo escuro.

- [ ] **Step 1: Teste e2e que falha**

`ui-tests/e2e/fundacao.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3100';

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

async function api(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body, API }) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    { method, path, body, API },
  );
}

async function openOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Teste visual' });
  return order.json.service_order_id;
}

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('fundação visual', () => {
  test('telas principais têm fundo escuro (nenhuma tela clara esquecida)', async ({ page }) => {
    const orderId = await openOrder(page);
    for (const route of ['/dashboard', '/clientes', '/veiculos', '/comissoes', '/configuracoes', '/equipe', '/os-client-create', `/os/${orderId}`, `/os/${orderId}/finalizar`]) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await bodyBg(page), `fundo de ${route}`).toBe('rgb(10, 10, 10)');
      const finishBg = await page.evaluate(() =>
        [...document.querySelectorAll('div')].some((d) => getComputedStyle(d).backgroundColor === 'rgb(245, 245, 245)'),
      );
      expect(finishBg, `${route} não pode ter bloco cinza-claro (bg-neutral-100)`).toBe(false);
    }
  });

  test('títulos usam a letra da marca (Saira Condensed) e o texto corrido a Archivo', async ({ page }) => {
    await page.goto('/configuracoes');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Saira Condensed');
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Archivo');
  });

  test('favicon é a engrenagem nova', async ({ page }) => {
    const res = await page.request.get('/favicon.svg');
    expect(await res.text()).toContain('data-brand="oficinasync-gear"');
  });
});
```

- [ ] **Step 2: Ver falhar**

Pré-requisitos dos testes de tela (no cabeçalho de `ui-tests/playwright.config.ts`): Docker com SQL Server e MinIO de pé, `cd backend && npm run build`, e o ambiente manual de personas **parado** (`bash ui-tests/scripts/stop-env.sh`).

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx playwright test e2e/fundacao.spec.ts`
Expected: FAIL. No teste do fundo, a falha é em `/os/<id>/finalizar` (bloco `rgb(245, 245, 245)`) ou num fundo do `body` diferente de `rgb(10, 10, 10)`. No teste das letras, `fontFamily` contém "Geist", e não "Saira Condensed". O teste do favicon **passa** (feito na Task 2).

- [ ] **Step 3: Copiar as fontes (OFL) para o repositório**

```bash
SCR="$(mktemp -d)"; cd "$SCR"
npm pack @fontsource/saira-condensed@5 @fontsource/archivo@5 >/dev/null
mkdir saira archivo
tar -xzf fontsource-saira-condensed-*.tgz -C saira
tar -xzf fontsource-archivo-*.tgz -C archivo
ls saira/package/files | grep -E "latin-(700|800)-normal.woff2$" | grep -v ext
ls archivo/package/files | grep -E "latin-(400|600|700)-normal.woff2$" | grep -v ext
```
Expected: `saira-condensed-latin-700-normal.woff2`, `saira-condensed-latin-800-normal.woff2`, `archivo-latin-400-normal.woff2`, `archivo-latin-600-normal.woff2` e `archivo-latin-700-normal.woff2`. O subconjunto "latin" cobre os acentos do português: ã, ç, é, ô.

```bash
DEST="/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web/src/assets/fonts"
mkdir -p "$DEST"
cp saira/package/files/saira-condensed-latin-700-normal.woff2 saira/package/files/saira-condensed-latin-800-normal.woff2 "$DEST/"
cp archivo/package/files/archivo-latin-400-normal.woff2 archivo/package/files/archivo-latin-600-normal.woff2 archivo/package/files/archivo-latin-700-normal.woff2 "$DEST/"
cp saira/package/LICENSE "$DEST/OFL-saira-condensed.txt"
cp archivo/package/LICENSE "$DEST/OFL-archivo.txt"
ls "$DEST"
```
Expected: 5 `.woff2` + 2 `.txt`.

- [ ] **Step 4: `@font-face`**

`frontend/oficinasync-web/src/styles/fonts.css`:

```css
/* Fontes servidas pelo próprio site (licença OFL, arquivos em src/assets/fonts). */
@font-face {
  font-family: "Saira Condensed";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../assets/fonts/saira-condensed-latin-700-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Saira Condensed";
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("../assets/fonts/saira-condensed-latin-800-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Archivo";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../assets/fonts/archivo-latin-400-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Archivo";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../assets/fonts/archivo-latin-600-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Archivo";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../assets/fonts/archivo-latin-700-normal.woff2") format("woff2");
}
```

- [ ] **Step 5: Tokens e regras no `src/index.css`**

(a) Troque a linha `@import "@fontsource-variable/geist";` por:
```css
@import "./styles/fonts.css";
```

(b) No bloco `@theme inline {`, troque:
```css
    --font-heading: var(--font-sans);
    --font-sans: 'Geist Variable', sans-serif;
```
por:
```css
    --font-heading: 'Saira Condensed', 'Archivo', sans-serif;
    --font-display: 'Saira Condensed', 'Archivo', sans-serif;
    --font-sans: 'Archivo', system-ui, sans-serif;
    --color-warning: var(--warning);
    --color-success: var(--success);
    --color-danger: var(--danger);
    --color-text-strong: var(--text-strong);
    --color-text-body: var(--text-body);
    --color-text-soft: var(--text-soft);
```

(c) No fim do bloco `:root {` **e** no fim do bloco `.dark {`, antes do `}`, adicione:
```css
    --warning: #facc15;
    --success: #a3e635;
    --danger: #f87171;
    --text-strong: #fafafa;
    --text-body: rgba(255, 255, 255, 0.72);
    --text-soft: rgba(255, 255, 255, 0.6);
```

(d) No `@layer base {`, depois da regra `html { @apply font-sans; }`, adicione:
```css
  :where(h1, h2, h3) {
    font-family: var(--font-display);
  }
  :where(h1, h2) {
    text-transform: uppercase;
    letter-spacing: 0.01em;
  }
```

(e) No fim do arquivo, adicione:
```css
/* Brilho limão sutil no topo das telas principais (Cinema Escuro Premium). */
@utility app-glow {
  background: radial-gradient(120% 55% at 50% 0%, #1d2a0a 0%, #0a0a0a 55%);
}

/* "Carregando": o desenho da tela aparece com um brilho passando. */
@utility skeleton-shimmer {
  background: linear-gradient(90deg, #1f1f1f 25%, #2e2e2e 50%, #1f1f1f 75%);
  background-size: 200% 100%;
  animation: oficinasync-shimmer 1.4s linear infinite;
}
@keyframes oficinasync-shimmer {
  to {
    background-position: -200% 0;
  }
}
```

- [ ] **Step 6: Tema escuro global**

Em `frontend/oficinasync-web/index.html` troque `<html lang="pt-BR">` por `<html lang="pt-BR" class="dark">` e, logo depois de `<meta name="theme-color" content="#0a0a0a" />`, adicione:
```html
    <meta name="color-scheme" content="dark" />
```

- [ ] **Step 7: Finalizar sem bloco claro, página do cliente sem caixa alta, carregando com brilho**

(a) `src/pages/OsFinishPage.tsx`: troque as 3 ocorrências de `bg-neutral-100` por `bg-background`. Depois rode `grep -n "text-black" src/pages/OsFinishPage.tsx`.
- Se o `text-black` estiver num texto sobre fundo **limão** (botão), mantenha.
- Se estiver sobre o fundo da página, troque por `text-foreground`.

(b) `src/pages/PublicServiceOrderPage.tsx`: a página do cliente é da Fase 4 e tem títulos-frase. Ache o `className` do elemento raiz retornado pelo componente principal (`grep -n "return (" -A2 src/pages/PublicServiceOrderPage.tsx`, primeiro `<div`/`<main` do JSX final) e acrescente `[&_h1]:normal-case [&_h2]:normal-case`.

(c) `src/components/ui/skeleton.tsx`: troque `"animate-pulse rounded-md bg-muted"` por `"skeleton-shimmer rounded-md"`.

- [ ] **Step 8: Ver passar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx playwright test e2e/fundacao.spec.ts`
Expected: PASS (3 testes).

- [ ] **Step 9: Suíte de tela inteira** (a caixa alta global pode mexer em seletores)

Run: `npx playwright test`
Expected: PASS em todas. Se algum `getByRole('heading', { name: ... })` falhar só por maiúsculas e minúsculas, troque o nome por regex sem diferenciar caixa (`{ name: /minhas comissões/i }`). Isso é ajuste de seletor, não bug. Qualquer outra falha é bug: aplique a regra de teste de regressão.

- [ ] **Step 10: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/assets/fonts frontend/oficinasync-web/src/styles/fonts.css frontend/oficinasync-web/src/index.css frontend/oficinasync-web/index.html frontend/oficinasync-web/src/pages/OsFinishPage.tsx frontend/oficinasync-web/src/pages/PublicServiceOrderPage.tsx frontend/oficinasync-web/src/components/ui/skeleton.tsx ui-tests/e2e/fundacao.spec.ts
git add -u ui-tests/e2e
git commit -m "feat(visual): Saira Condensed + Archivo servidas localmente, tokens de alerta/sucesso/perigo, tema escuro global (Finalizar deixa de ser clara)

Teste: e2e/fundacao.spec.ts (fundo escuro em todas as telas principais, letra da marca, favicon).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Animações — vibração, comemoração, flash de foto

**Files:**
- Create: `src/lib/haptics.ts`, `src/components/motion/Celebrate.tsx`, `src/components/motion/celebration.ts`, `src/components/motion/CelebrationHost.tsx`, `src/components/motion/PhotoFlash.tsx`
- Modify: `src/App.tsx` (monta o `CelebrationHost`)
- Test: `ui-tests/unit/haptics.test.ts`, `ui-tests/unit/motion.test.tsx`

**Interfaces:**
- Produces:
  - `prefersReducedMotion(): boolean`
  - `haptic(nav?: { vibrate?: (pattern: number) => boolean }, reduced?: boolean): void`
  - `Celebrate({ message: string, reduced?: boolean })`
  - `celebrate(message: string): void` (dispara o evento `oficinasync:celebrate`)
  - `CelebrationHost()` (escuta o evento, mostra por 1,4s e vibra)
  - `PhotoFlash({ flashKey: number })` (renderiza nada quando `flashKey === 0`)

- [ ] **Step 1: Testes que falham**

`ui-tests/unit/haptics.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { haptic } from '../../frontend/oficinasync-web/src/lib/haptics';

describe('vibração de confirmação', () => {
  it('vibra 10ms quando o aparelho suporta', () => {
    const vibrate = vi.fn(() => true);
    haptic({ vibrate }, false);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('não vibra quando a pessoa pediu menos movimento', () => {
    const vibrate = vi.fn(() => true);
    haptic({ vibrate }, true);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('aparelho sem vibração (iPhone/computador) ou que lança erro não quebra', () => {
    expect(() => haptic({}, false)).not.toThrow();
    expect(() => haptic(undefined, false)).not.toThrow();
    expect(() =>
      haptic(
        {
          vibrate: () => {
            throw new Error('sem gesto');
          },
        },
        false,
      ),
    ).not.toThrow();
  });
});
```

`ui-tests/unit/motion.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Celebrate } from '@/components/motion/Celebrate';
import { PhotoFlash } from '@/components/motion/PhotoFlash';

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('comemoração', () => {
  it('mostra a mensagem como status (leitor de tela anuncia) e solta 6 confetes', () => {
    const html = renderToStaticMarkup(<Celebrate message="O cliente já pode ver" reduced={false} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('O cliente já pode ver');
    expect(count(html, 'data-confetti')).toBe(6);
  });

  it('com menos movimento: só o visto e a mensagem, sem confete nem onda', () => {
    const html = renderToStaticMarkup(<Celebrate message="OS finalizada" reduced />);
    expect(html).toContain('OS finalizada');
    expect(html).not.toContain('data-confetti');
    expect(html).not.toContain('data-ring');
  });
});

describe('flash da foto', () => {
  it('não aparece antes da primeira foto', () => {
    expect(renderToStaticMarkup(<PhotoFlash flashKey={0} />)).toBe('');
  });

  it('aparece quando uma foto é tirada', () => {
    expect(renderToStaticMarkup(<PhotoFlash flashKey={1} />)).toContain('data-photo-flash');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/haptics.test.ts unit/motion.test.tsx`
Expected: FAIL — módulos `haptics`, `Celebrate` e `PhotoFlash` não existem.

- [ ] **Step 3: Implementar `haptics.ts`**

```ts
type Vibrator = { vibrate?: (pattern: number) => boolean };

/** true quando a pessoa configurou o aparelho pra reduzir movimento. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Vibração curta de confirmação (sente o toque mesmo de mão suja). Silenciosa onde não existe. */
export function haptic(
  nav: Vibrator | undefined = typeof navigator === "undefined" ? undefined : (navigator as Vibrator),
  reduced: boolean = prefersReducedMotion(),
): void {
  if (reduced || !nav?.vibrate) return;
  try {
    nav.vibrate(10);
  } catch {
    // alguns navegadores recusam vibrar sem gesto do usuário — não é erro pra quem usa
  }
}
```

- [ ] **Step 4: Implementar `Celebrate.tsx`**

```tsx
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const CONFETTI = [
  { x: -90, y: -70, color: "#a3e635" },
  { x: 80, y: -80, color: "#facc15" },
  { x: -70, y: 50, color: "#fafafa" },
  { x: 95, y: 40, color: "#a3e635" },
  { x: 10, y: -100, color: "#facc15" },
  { x: -110, y: -10, color: "#a3e635" },
];

/** Comemoração curta: visto que "estoura" + onda + confete. Só depois de a ação dar certo de verdade. */
export function Celebrate({ message, reduced: forced }: { message: string; reduced?: boolean }) {
  const prefers = useReducedMotion();
  const reduced = forced ?? prefers ?? false;

  return (
    <div role="status" className="pointer-events-none relative flex flex-col items-center gap-3 py-4">
      <motion.div
        initial={reduced ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-brand-foreground"
      >
        <Check className="h-10 w-10" strokeWidth={3} aria-hidden="true" />
        {!reduced && (
          <motion.span
            data-ring
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="absolute inset-0 rounded-full border-[3px] border-brand"
          />
        )}
      </motion.div>
      <p className="font-display text-xl font-extrabold uppercase tracking-wide">{message}</p>
      {!reduced &&
        CONFETTI.map((piece, i) => (
          <motion.i
            key={i}
            data-confetti
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: piece.x, y: piece.y, opacity: 0, rotate: 320 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="absolute left-1/2 top-10 h-2 w-2 rounded-sm"
            style={{ background: piece.color }}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 5: Implementar `celebration.ts`, `CelebrationHost.tsx` e `PhotoFlash.tsx`**

`src/components/motion/celebration.ts`:

```ts
export const CELEBRATE_EVENT = "oficinasync:celebrate";

/** Pede uma comemoração na tela (o CelebrationHost, montado no App, mostra). */
export function celebrate(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(CELEBRATE_EVENT, { detail: message }));
}
```

`src/components/motion/CelebrationHost.tsx`:

```tsx
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { Celebrate } from "./Celebrate";
import { CELEBRATE_EVENT } from "./celebration";

/** Camada por cima de tudo que mostra a comemoração por 1,4s. Não bloqueia cliques. */
export function CelebrationHost() {
  const [current, setCurrent] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onCelebrate = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      haptic();
      setCurrent({ id: Date.now(), message });
      clearTimeout(timer);
      timer = setTimeout(() => setCurrent(null), 1400);
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
        >
          <Celebrate message={current.message} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

`src/components/motion/PhotoFlash.tsx`:

```tsx
import { motion, useReducedMotion } from "motion/react";

/** Flash branco rápido por cima da foto recém-tirada. Troque `flashKey` (1, 2, 3...) a cada foto. */
export function PhotoFlash({ flashKey }: { flashKey: number }) {
  const reduced = useReducedMotion();
  if (!flashKey || reduced) return null;
  return (
    <motion.div
      key={flashKey}
      data-photo-flash
      aria-hidden="true"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white"
    />
  );
}
```

- [ ] **Step 6: Montar o `CelebrationHost` no App**

Em `src/App.tsx`, adicione o import:
```tsx
import { CelebrationHost } from '@/components/motion/CelebrationHost'
```
e, logo abaixo de `<Toaster position="top-center" richColors closeButton theme="dark" />`, adicione:
```tsx
      <CelebrationHost />
```

- [ ] **Step 7: Ver passar + suíte unitária + build**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run && cd ../frontend/oficinasync-web && npx tsc -b && echo TSC-OK`
Expected: Vitest PASS (todos) e `TSC-OK`.

- [ ] **Step 8: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/lib/haptics.ts frontend/oficinasync-web/src/components/motion frontend/oficinasync-web/src/App.tsx ui-tests/unit/haptics.test.ts ui-tests/unit/motion.test.tsx
git commit -m "feat(visual): animacoes de comemoracao, flash de foto e vibracao de confirmacao (respeitam menos movimento)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Kit de componentes grandes

**Files:**
- Create: `src/components/kit/fieldStyles.ts`, `TextField.tsx`, `SelectField.tsx`, `TextAreaField.tsx`, `BigButton.tsx`, `ActionTile.tsx`, `StatusChip.tsx`, `AlertBanner.tsx`, `PageHeader.tsx`, `index.ts`
- Modify: `src/components/ui/button.tsx` (desabilitado legível)
- Test: `ui-tests/unit/kit.test.tsx`

**Interfaces:**
- Consumes: `haptic()` (Task 4).
- Produces (exportados por `@/components/kit`):
  - `fieldClass`, `fieldClassCompact`, `textAreaClass` (strings)
  - `TextField(props: InputHTMLAttributes & { id: string; label: string; hint?: string; error?: string })`
  - `SelectField(props: SelectHTMLAttributes & { id: string; label: string; hint?: string; error?: string; children })`
  - `TextAreaField(props: TextareaHTMLAttributes & { id: string; label: string; hint?: string; error?: string })`
  - `BigButton(props: { variant?: "primary"|"secondary"|"danger"; size?: "md"|"hero"; hint?: string; icon?: ReactNode; disabled?; onClick?; type?; className?; children })`
  - `ActionTile({ icon: ReactNode; label: string; onClick?: () => void; tone?: "default"|"brand" })`
  - `type ChipTone = "ok"|"alert"|"neutral"|"danger"`
  - `StatusChip({ tone: ChipTone; children })`
  - `AlertBanner({ children; actionLabel?: string; onAction?: () => void })`
  - `PageHeader({ title: string; subtitle?: string; action?: ReactNode; leading?: ReactNode })`
- Ruling: placeholder de campo fica em `white/50`. É dica, não conteúdo, então é a única exceção à regra do `white/60`.

- [ ] **Step 1: Testes que falham**

`ui-tests/unit/kit.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AlertBanner,
  BigButton,
  PageHeader,
  SelectField,
  StatusChip,
  TextField,
  fieldClass,
} from '@/components/kit';

describe('BigButton', () => {
  it('habilitado: grande (≥56px), caixa alta, sem dica', () => {
    const html = renderToStaticMarkup(<BigButton hint="não aparece">Abrir carro novo</BigButton>);
    expect(html).toContain('min-h-14');
    expect(html).toContain('uppercase');
    expect(html).not.toContain('não aparece');
  });

  it('desabilitado: explica POR QUE está travado e liga a dica ao botão', () => {
    const html = renderToStaticMarkup(
      <BigButton disabled hint="Tire a foto da frente pra continuar">
        Continuar
      </BigButton>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('Tire a foto da frente pra continuar');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain('bg-white/10');
    expect(html).not.toContain('bg-brand ');
  });

  it('hero tem 64px', () => {
    expect(renderToStaticMarkup(<BigButton size="hero">Ir</BigButton>)).toContain('min-h-16');
  });
});

describe('campos', () => {
  it('rótulo ligado ao campo e erro ligado por aria-describedby', () => {
    const html = renderToStaticMarkup(<TextField id="placa" label="Placa" error="Placa inválida" />);
    expect(html).toContain('for="placa"');
    expect(html).toContain('id="placa"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="placa-error"');
    expect(html).toContain('Placa inválida');
  });

  it('campo tem 48px e texto 16px (não dá zoom no iPhone)', () => {
    expect(fieldClass).toContain('h-12');
    expect(fieldClass).toContain('text-base');
  });

  it('select usa o mesmo visual do input', () => {
    const html = renderToStaticMarkup(
      <SelectField id="comb" label="Combustível">
        <option value="flex">Flex</option>
      </SelectField>,
    );
    expect(html).toContain('h-12');
    expect(html).toContain('appearance-none');
  });
});

describe('sinais de status', () => {
  it('chip de alerta é amarelo, de ok é limão', () => {
    expect(renderToStaticMarkup(<StatusChip tone="alert">Sem foto</StatusChip>)).toContain('text-warning');
    expect(renderToStaticMarkup(<StatusChip tone="ok">Pronto</StatusChip>)).toContain('text-brand');
  });

  it('aviso amarelo com borda esquerda e ação opcional', () => {
    const html = renderToStaticMarkup(
      <AlertBanner actionLabel="Tirar agora" onAction={() => undefined}>
        Falta foto de entrada
      </AlertBanner>,
    );
    expect(html).toContain('border-l-4');
    expect(html).toContain('border-warning');
    expect(html).toContain('Tirar agora');
  });

  it('título da página trunca nome longo em vez de estourar a tela', () => {
    const html = renderToStaticMarkup(<PageHeader title="Auto Elétrica e Mecânica Lima & Filhos Ltda" />);
    expect(html).toContain('<h1');
    expect(html).toContain('truncate');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/kit.test.tsx`
Expected: FAIL — `Failed to load url @/components/kit`.

- [ ] **Step 3: Implementar `fieldStyles.ts`**

```ts
/** Visual único de campo (input/select/textarea): 48px de altura, texto 16px (iPhone não dá zoom). */
export const fieldClass =
  "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-base text-foreground placeholder:text-white/50 outline-none transition-colors focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60";

/** Versão compacta pra tabelas e linhas densas (quantidade, porcentagem, datas de filtro). */
export const fieldClassCompact =
  "h-10 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40";

export const textAreaClass = fieldClass.replace("h-12", "min-h-28 py-3");
```

- [ ] **Step 4: Implementar os campos**

`src/components/kit/TextField.tsx`:

```tsx
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./fieldStyles";

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string };

export function FieldMessage({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error) return <p id={`${id}-error`} className="text-sm font-medium text-danger">{error}</p>;
  if (hint) return <p id={`${id}-hint`} className="text-sm text-white/60">{hint}</p>;
  return null;
}

export const describedBy = (id: string, hint?: string, error?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ id, label, hint, error, className, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(fieldClass, error && "border-danger/70", className)}
        {...rest}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
```

`src/components/kit/SelectField.tsx`:

```tsx
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./fieldStyles";
import { FieldMessage, describedBy } from "./TextField";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string; error?: string };

export function SelectField({ id, label, hint, error, className, children, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(fieldClass, "appearance-none pr-10", error && "border-danger/70", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
        />
      </div>
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
```

`src/components/kit/TextAreaField.tsx`:

```tsx
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { textAreaClass } from "./fieldStyles";
import { FieldMessage, describedBy } from "./TextField";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; error?: string };

export function TextAreaField({ id, label, hint, error, className, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(textAreaClass, error && "border-danger/70", className)}
        {...rest}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
```

- [ ] **Step 5: Implementar `BigButton`, `ActionTile`, `StatusChip`, `AlertBanner`, `PageHeader`, `index.ts`**

`src/components/kit/BigButton.tsx`:

```tsx
import { motion } from "motion/react";
import { useId, type MouseEvent, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground shadow-[0_10px_30px_-10px_rgba(163,230,53,.6)] hover:bg-brand/90",
  secondary: "border-2 border-white/20 bg-transparent text-white hover:border-white/40",
  danger: "bg-danger text-[#0a0a0a] hover:bg-danger/90",
};

type Props = {
  variant?: Variant;
  size?: "md" | "hero";
  /** Mostrado embaixo quando desabilitado: diga O QUE falta pra liberar. */
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
  "data-tour"?: string;
};

/** Botão grande do sistema: ≥56px, afunda ao tocar e vibra de leve. */
export function BigButton({
  variant = "primary",
  size = "md",
  hint,
  icon,
  disabled,
  type = "button",
  onClick,
  className,
  children,
  ...rest
}: Props) {
  const hintId = useId();
  const showHint = Boolean(disabled && hint);
  return (
    <div className="flex w-full flex-col items-stretch gap-1.5">
      <motion.button
        type={type}
        disabled={disabled}
        aria-describedby={showHint ? hintId : undefined}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        onClick={(event) => {
          if (disabled) return;
          haptic();
          onClick?.(event);
        }}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 font-display font-extrabold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 [&_svg]:h-6 [&_svg]:w-6",
          size === "hero" ? "min-h-16 text-2xl" : "min-h-14 text-xl",
          disabled ? "cursor-not-allowed bg-white/10 text-white/50 shadow-none" : VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {icon}
        {children}
      </motion.button>
      {showHint && (
        <p id={hintId} className="text-center text-sm text-white/70">
          {hint}
        </p>
      )}
    </div>
  );
}
```

`src/components/kit/ActionTile.tsx`:

```tsx
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Quadrado grande com ícone e UMA palavra (ex.: "Carro novo", "Foto"). */
export function ActionTile({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "brand";
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => {
        haptic();
        onClick?.();
      }}
      className={cn(
        "flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-4 font-display text-base font-extrabold uppercase tracking-wide",
        tone === "brand" ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 bg-white/[0.06] text-white",
      )}
    >
      <span aria-hidden="true" className="[&_svg]:h-8 [&_svg]:w-8">
        {icon}
      </span>
      {label}
    </motion.button>
  );
}
```

`src/components/kit/StatusChip.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "ok" | "alert" | "neutral" | "danger";

const TONES: Record<ChipTone, string> = {
  ok: "bg-brand/15 text-brand",
  alert: "bg-warning/15 text-warning",
  neutral: "bg-white/10 text-white/80",
  danger: "bg-danger/15 text-danger",
};

/** Limão = tudo certo · amarelo = atenção · vermelho = erro. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      data-tone={tone}
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide", TONES[tone])}
    >
      {children}
    </span>
  );
}
```

`src/components/kit/AlertBanner.tsx`:

```tsx
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Aviso amarelo: algo precisa de ação (ex.: falta foto de entrada). */
export function AlertBanner({
  children,
  actionLabel,
  onAction,
}: {
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border-l-4 border-warning bg-warning/10 px-4 py-3 text-warning">
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-semibold">{children}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 shrink-0 rounded-lg bg-warning px-3 text-sm font-bold text-[#0a0a0a]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

`src/components/kit/PageHeader.tsx`:

```tsx
import type { ReactNode } from "react";

/** Cabeçalho de página: título grande em caixa alta (trunca nome longo) + subtítulo + ação. */
export function PageHeader({
  title,
  subtitle,
  action,
  leading,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-extrabold uppercase leading-tight tracking-wide md:text-4xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
```

`src/components/kit/index.ts`:

```ts
export { ActionTile } from "./ActionTile";
export { AlertBanner } from "./AlertBanner";
export { BigButton } from "./BigButton";
export { fieldClass, fieldClassCompact, textAreaClass } from "./fieldStyles";
export { PageHeader } from "./PageHeader";
export { SelectField } from "./SelectField";
export { StatusChip, type ChipTone } from "./StatusChip";
export { TextAreaField } from "./TextAreaField";
export { TextField } from "./TextField";
```

- [ ] **Step 6: Botão padrão desabilitado legível (o mesmo bug do relatório de design)**

Em `src/components/ui/button.tsx`, na string base do `buttonVariants`, troque `disabled:pointer-events-none disabled:opacity-50` por:
```
disabled:pointer-events-none disabled:border-transparent disabled:bg-white/10 disabled:text-white/50 disabled:shadow-none
```

- [ ] **Step 7: Ver passar + build**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run && cd ../frontend/oficinasync-web && npx tsc -b && echo TSC-OK`
Expected: Vitest PASS e `TSC-OK`. Se o `tsc` reclamar de tipo no `motion.button` por causa do `...rest`, o `rest` só pode conter `data-tour`. Mantenha o tipo `Props` como está; ele não herda `ButtonHTMLAttributes` justamente para evitar o conflito com as props de animação.

- [ ] **Step 8: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/components/kit frontend/oficinasync-web/src/components/ui/button.tsx ui-tests/unit/kit.test.tsx
git commit -m "feat(visual): kit de componentes grandes (BigButton com dica do que falta, campos 48px, chips, aviso amarelo, cabecalho) e botao desabilitado legivel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Campos iguais em todo o sistema (27 arquivos)

**Files:**
- Modify: os 27 arquivos listados por `grep -rl "inputClass" src` (no frontend)

**Interfaces:**
- Consumes: `fieldClass` e `fieldClassCompact` de `@/components/kit` (Task 5).
- Ruling: a spec pedia trocar os campos pelos componentes `<TextField>`. A troca segura e mecânica é fazer cada `inputClass` local **passar a vir do kit**. O visual fica idêntico em todo lugar e o comportamento não muda. Os componentes `TextField`/`SelectField` ficam para as telas novas (Fases 2 e 3), onde a estrutura vai ser refeita de qualquer jeito.

- [ ] **Step 1: Listar as definições**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && grep -rn -A1 "^const inputClass" src | grep '"'`
Expected: 27 linhas com as strings atuais.

- [ ] **Step 2: Trocar cada definição pela tabela**

Em cada arquivo, apague a definição local (as 2 linhas `const inputClass =` + string) e escreva a versão da tabela. Adicione o import `import { fieldClass, fieldClassCompact } from "@/components/kit";` (só o que usar) e, quando usar `cn`, garanta `import { cn } from "@/lib/utils";`.

| String atual contém | Nova definição |
|---|---|
| `h-11 w-full ... px-3 py-2 ...` (sem extras) | `const inputClass = fieldClass;` |
| `... uppercase` (PlateField) | `const inputClass = cn(fieldClass, "uppercase");` |
| `... pl-9 pr-3 ...` (CarsPage, ClientsPage) | `const inputClass = cn(fieldClass, "pl-10");` |
| `h-10 w-24 ... px-2 ...` (PartsSection) | `const inputClass = cn(fieldClassCompact, "w-24");` |
| `h-10 rounded-md ... px-2 ...` (TeamSection, CommissionsPage) | `const inputClass = fieldClassCompact;` |
| qualquer outra variação | `cn(fieldClass, "<só as classes de largura/espaçamento/fonte extras>")` |

Exemplo, `src/components/fields/PlateField.tsx`. Antes:
```tsx
const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase";
```
Depois:
```tsx
import { fieldClass } from "@/components/kit";
import { cn } from "@/lib/utils";

const inputClass = cn(fieldClass, "uppercase");
```

Nos campos de busca com ícone (`CarsPage`, `ClientsPage`), confira no JSX que o ícone de lupa continua centralizado: `top-1/2 -translate-y-1/2` funciona com a altura nova de 48px.

- [ ] **Step 3: Conferir que nada sobrou**

Run: `grep -rn "rounded-md border border-input bg-background" src || echo "LIMPO"`
Expected: `LIMPO`.

- [ ] **Step 4: Build + testes de tela** (cobrem login, wizard, dados internos e abertura rápida)

Run: `npx tsc -b && echo TSC-OK && cd ../../ui-tests && npx vitest run && npx playwright test`
Expected: `TSC-OK`, Vitest PASS, Playwright PASS.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add $(cd frontend/oficinasync-web && grep -rl "@/components/kit" src | sed 's#^#frontend/oficinasync-web/#')
git status --short frontend/oficinasync-web/src
git commit -m "refactor(visual): os 27 campos de formulario passam a usar o visual unico do kit (48px, texto 16px)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Antes do commit, confira no `git status` que **nenhum** `package.json`, `main.tsx` ou `nativeShell.ts` está na área de stage.

---

### Task 7: As duas caras — AppShell, modo simples e modo controle

**Files:**
- Create: `src/lib/session.ts`, `src/components/shell/ModeContext.tsx`, `AppShell.tsx`, `ControlShell.tsx`, `SimpleShell.tsx`, `ModeSwitch.tsx`
- Modify: `src/App.tsx`, `src/components/DashboardSidebar.tsx`, `src/components/ui/sidebar.tsx` (textos), as 8 páginas com menu
- Test: `ui-tests/unit/shell.test.ts`, `ui-tests/e2e/fundacao.spec.ts` (novos testes)

**Interfaces:**
- Consumes: `modeFor`, `readModePreference`, `saveModePreference`, `AppMode` (Task 1); `useMe`, `Me` (`src/lib/me.ts`); `BrandLogo`, `BrandSymbol` (Task 2); `haptic` (Task 4).
- Produces:
  - `shellFor(loading: boolean, hasMe: boolean, mode: AppMode | null): "loading" | "simple" | "control"` (pura, em `AppShell.tsx`)
  - `useShellMode(): { mode: AppMode; canSwitch: boolean; setMode(m: AppMode): void }`
  - `AppShell({ children })`
  - `ModeSwitch({ className? })`
  - `logout(navigate: (to: string) => void): void`
  - As páginas com menu **não** renderizam mais `DashboardSidebar`/`SidebarInset`/`SidebarTrigger`.

- [ ] **Step 1: Teste unitário que falha**

`ui-tests/unit/shell.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shellFor } from '../../frontend/oficinasync-web/src/components/shell/shellFor';

describe('qual casca mostrar', () => {
  it('carregando o usuário pela primeira vez → tela de carregando', () => {
    expect(shellFor(true, false, null)).toBe('loading');
  });

  it('usuário carregado → a casca do modo dele', () => {
    expect(shellFor(false, true, 'simple')).toBe('simple');
    expect(shellFor(false, true, 'control')).toBe('control');
  });

  it('falhou ao buscar o usuário (token vencido) → não fica girando: casca de controle, a página trata o login', () => {
    expect(shellFor(false, false, null)).toBe('control');
  });
});
```

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/shell.test.ts`
Expected: FAIL — módulo `shellFor` não existe.

- [ ] **Step 2: `shellFor` + contexto + `session.ts`**

`src/components/shell/shellFor.ts`:

```ts
import type { AppMode } from "@/lib/mode";

/** Decide a casca. Sem usuário depois de carregar = cai no controle (a página trata o 401). */
export function shellFor(loading: boolean, hasMe: boolean, mode: AppMode | null): "loading" | "simple" | "control" {
  if (loading && !hasMe) return "loading";
  if (hasMe && mode) return mode;
  return "control";
}
```

`src/components/shell/ModeContext.tsx`:

```tsx
import { createContext, useContext } from "react";
import type { AppMode } from "@/lib/mode";

export type ShellMode = { mode: AppMode; canSwitch: boolean; setMode: (mode: AppMode) => void };

export const ModeContext = createContext<ShellMode>({ mode: "control", canSwitch: false, setMode: () => undefined });

/** Modo atual da casca (simples/controle). Só o dono pode trocar. */
export const useShellMode = () => useContext(ModeContext);
```

`src/lib/session.ts`:

```ts
import { clearMeCache } from "./me";

/** Sai da conta (usado no menu lateral e na tela "Eu" do modo simples). */
export function logout(navigate: (to: string) => void): void {
  try {
    localStorage.removeItem("token");
  } catch {
    // storage bloqueado: nada a remover
  }
  clearMeCache();
  navigate("/login");
}
```

Run: `npx vitest run unit/shell.test.ts`
Expected: PASS.

- [ ] **Step 3: `ModeSwitch` e `AppShell`**

`src/components/shell/ModeSwitch.tsx`:

```tsx
import { LayoutDashboard, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useShellMode } from "./ModeContext";

/** Só o dono vê: alterna entre a cara de mecânico e a de controle. */
export function ModeSwitch({ className }: { className?: string }) {
  const { mode, canSwitch, setMode } = useShellMode();
  const navigate = useNavigate();
  if (!canSwitch) return null;
  const toSimple = mode === "control";
  return (
    <button
      type="button"
      onClick={() => {
        setMode(toSimple ? "simple" : "control");
        navigate("/dashboard");
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/90 hover:border-white/30",
        className,
      )}
    >
      {toSimple ? <Wrench className="h-4 w-4" aria-hidden="true" /> : <LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
      {toSimple ? "Ver como mecânico" : "Ver modo controle"}
    </button>
  );
}
```

`src/components/shell/AppShell.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { useMe } from "@/lib/me";
import { modeFor, readModePreference, saveModePreference, type AppMode } from "@/lib/mode";
import { ControlShell } from "./ControlShell";
import { ModeContext } from "./ModeContext";
import { SimpleShell } from "./SimpleShell";
import { shellFor } from "./shellFor";

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Escolhe a "cara" do sistema pelo cargo (mecânico → simples; escritório → controle; dono escolhe). */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();
  const [preference, setPreference] = useState<AppMode | null>(() =>
    me ? readModePreference(safeStorage(), me.user_id) : null,
  );

  useEffect(() => {
    if (me) setPreference(readModePreference(safeStorage(), me.user_id));
  }, [me]);

  const mode = me ? modeFor(me.role, preference) : null;
  const shell = shellFor(loading, Boolean(me), mode);

  const value = {
    mode: mode ?? "control",
    canSwitch: me?.role === "owner",
    setMode: (next: AppMode) => {
      if (!me || me.role !== "owner") return;
      saveModePreference(safeStorage(), me.user_id, next);
      setPreference(next);
    },
  };

  if (shell === "loading") {
    return (
      <div className="app-glow flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <ModeContext.Provider value={value}>
      {shell === "simple" ? <SimpleShell>{children}</SimpleShell> : <ControlShell>{children}</ControlShell>}
    </ModeContext.Provider>
  );
}
```

- [ ] **Step 4: `ControlShell` e menu lateral refeito**

`src/components/shell/ControlShell.tsx`:

```tsx
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/** Modo controle (escritório/dono): menu lateral + conteúdo. */
export function ControlShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="h-11 w-11" />
          <BrandLogo size="sm" className="md:hidden" />
        </header>
        <div className="app-glow min-h-[calc(100vh-3.5rem)]">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

`src/components/ui/sidebar.tsx`: troque as 3 ocorrências de `Toggle Sidebar` (uma no `<span className="sr-only">` e duas em `aria-label`/`title`) por `Abrir ou fechar menu`.

Substitua o corpo de `src/components/DashboardSidebar.tsx` inteiro:

```tsx
import { Car, Home, LogOut, Percent, Radio, Settings, Users, Wrench } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLogo, BrandSymbol } from "@/components/brand/BrandLogo";
import { ModeSwitch } from "@/components/shell/ModeSwitch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { isOfficeRole, useMe } from "@/lib/me";
import { logout } from "@/lib/session";

type Item = { to: string; label: string; icon: typeof Home; show?: boolean };

export function DashboardSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { me } = useMe();

  const items: Item[] = [
    { to: "/dashboard", label: "Início", icon: Home },
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/veiculos", label: "Veículos", icon: Car },
    { to: "/equipe", label: "Equipe", icon: Wrench, show: me?.role === "owner" },
    { to: "/comissoes", label: isOfficeRole(me?.role) ? "Comissões" : "Minhas comissões", icon: Percent },
    { to: "/scanner", label: "Scanner", icon: Radio, show: import.meta.env.VITE_FEATURE_OBD === "true" },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-white/5">
        <div className="flex items-center gap-2 px-2 py-2">
          <BrandLogo size="sm" className="group-data-[collapsible=icon]:hidden" />
          <BrandSymbol className="hidden h-8 w-8 group-data-[collapsible=icon]:block" title="OficinaSync" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((item) => item.show !== false)
                .map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      className="h-11 text-[15px]"
                      isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                      onClick={() => navigate(item.to)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <ModeSwitch className="w-full justify-center" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11" onClick={() => logout(navigate)}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 5: `SimpleShell` (barra de baixo)**

`src/components/shell/SimpleShell.tsx`:

```tsx
import { Home, Plus, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { ModeSwitch } from "./ModeSwitch";

const NAV = [
  { to: "/dashboard", label: "Início", icon: Home, match: (p: string) => p === "/dashboard" },
  { to: "/veiculos", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/veiculos") || p.startsWith("/clientes") },
  { to: "/configuracoes", label: "Eu", icon: UserRound, match: (p: string) => p.startsWith("/configuracoes") || p.startsWith("/comissoes") },
] as const;

function NavButton({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => navigate(item.to)}
      className={cn(
        "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold",
        active ? "text-brand" : "text-white/70",
      )}
    >
      <item.icon className="h-7 w-7" aria-hidden="true" />
      {item.label}
    </button>
  );
}

/** Modo simples (mecânico): logo no topo, conteúdo, barra fixa embaixo com botões grandes. */
export function SimpleShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [home, search, me] = NAV;

  return (
    <div className="app-glow min-h-screen text-foreground">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <BrandLogo size="sm" />
        <ModeSwitch />
      </header>

      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0a0a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex h-20 max-w-xl items-center justify-around px-2">
          <li>
            <NavButton item={home} active={home.match(pathname)} />
          </li>
          <li>
            <NavButton item={search} active={search.match(pathname)} />
          </li>
          <li>
            <button
              type="button"
              data-tour="new-os"
              aria-label="Abrir carro novo"
              onClick={() => {
                haptic();
                navigate("/os-client-create");
              }}
              className="-mt-8 flex h-[72px] w-[72px] flex-col items-center justify-center rounded-3xl bg-brand font-display text-xs font-extrabold uppercase text-brand-foreground shadow-[0_12px_28px_-8px_rgba(163,230,53,.6)] transition-transform active:scale-95"
            >
              <Plus className="h-8 w-8" aria-hidden="true" />
              Carro
            </button>
          </li>
          <li>
            <NavButton item={me} active={me.match(pathname)} />
          </li>
        </ul>
      </nav>
    </div>
  );
}
```

- [ ] **Step 6: Rotas usam o `AppShell`**

Em `src/App.tsx`:
- Troque o import `import { SidebarProvider } from '@/components/ui/sidebar'` por `import { AppShell } from '@/components/shell/AppShell'`.
- Nas 8 rotas (`/dashboard`, `/comissoes`, `/configuracoes`, `/equipe`, `/clientes`, `/veiculos`, `/veiculos/:id`, `/scanner`), troque `<SidebarProvider>` por `<AppShell>` e `</SidebarProvider>` por `</AppShell>`.

- [ ] **Step 7: As 8 páginas param de montar o menu**

Em cada uma (`dashBoardPage.tsx`, `ClientsPage.tsx`, `CarsPage.tsx`, `CarHistoryPage.tsx`, `CommissionsPage.tsx`, `SettingsPage.tsx`, `TeamPage.tsx`, `ScannerPage.tsx`):

1. Apague os imports `DashboardSidebar` e `SidebarInset`/`SidebarTrigger`.
2. No JSX, o padrão atual é:
   ```tsx
   <>
     <DashboardSidebar />

     <SidebarInset className="dark bg-background">
       <div className="min-h-screen p-4 ...">
         ...
               <SidebarTrigger ... />
         ...
       </div>
     </SidebarInset>
   </>
   ```
   Fica:
   ```tsx
   <div className="min-h-screen p-4 ...">
     ...
   </div>
   ```
   Remova `<DashboardSidebar />`, a abertura e o fechamento de `<SidebarInset ...>` e o elemento `<SidebarTrigger ... />` (o gatilho agora está na casca). Se o fragmento `<>…</>` ficar com um único filho, pode removê-lo.
3. Troque `min-h-screen` dessa `div` raiz por `min-h-full` (a casca já ocupa a tela).

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && grep -rln "DashboardSidebar\|SidebarInset" src/pages || echo "PAGINAS-LIMPAS"; npx tsc -b && echo TSC-OK`
Expected: `PAGINAS-LIMPAS` e `TSC-OK`.

- [ ] **Step 8: Testes de tela das duas caras (que falham antes do Step 6 e passam agora)**

Acrescente ao fim de `ui-tests/e2e/fundacao.spec.ts`:

```ts
test.describe('duas caras — mecânico', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('mecânico entra no modo simples: barra embaixo, sem menu lateral', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Abrir carro novo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver como mecânico' })).toHaveCount(0);
  });

  test('mecânico abre /comissoes direto pelo link: carrega dentro do modo simples', async ({ page }) => {
    await page.goto('/comissoes');
    await expect(page.getByRole('heading', { name: /minhas comissões/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  });

  test('"+ Carro" abre o cadastro de OS', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Abrir carro novo' }).click();
    await expect(page).toHaveURL(/\/os-client-create$/);
  });
});

test.describe('duas caras — dono', () => {
  test('dono entra no modo controle e troca pro modo mecânico; a escolha sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver como mecânico' }).first().click();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver modo controle' }).click();
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' })).toBeVisible();
  });

  test('nome longo da oficina não estoura a tela no celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
```

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx playwright test e2e/fundacao.spec.ts`
Expected: PASS.
- **Prova do vermelho:** faça `git stash push frontend/oficinasync-web/src/App.tsx`, rode de novo e veja falhar ("Navegação principal" não encontrada). Depois `git stash pop`.
- **Cuidado:** o `stash` com caminho não leva os arquivos do Leonardo.

- [ ] **Step 9: Suíte de tela inteira**

Run: `npx playwright test`
Expected: PASS. Testes antigos que clicavam em itens do menu lateral **como mecânico** precisam navegar por URL ou pela barra de baixo. Ajuste os seletores e anote no commit.

- [ ] **Step 10: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/lib/session.ts frontend/oficinasync-web/src/components/shell frontend/oficinasync-web/src/components/DashboardSidebar.tsx frontend/oficinasync-web/src/components/ui/sidebar.tsx frontend/oficinasync-web/src/App.tsx frontend/oficinasync-web/src/pages/dashBoardPage.tsx frontend/oficinasync-web/src/pages/ClientsPage.tsx frontend/oficinasync-web/src/pages/CarsPage.tsx frontend/oficinasync-web/src/pages/CarHistoryPage.tsx frontend/oficinasync-web/src/pages/CommissionsPage.tsx frontend/oficinasync-web/src/pages/SettingsPage.tsx frontend/oficinasync-web/src/pages/TeamPage.tsx frontend/oficinasync-web/src/pages/ScannerPage.tsx ui-tests/unit/shell.test.ts ui-tests/e2e
git commit -m "feat(visual): duas caras do sistema — modo simples (mecanico, barra embaixo) e modo controle (escritorio/dono, menu lateral com item ativo pela rota); dono alterna

Teste: unit/shell.test.ts e e2e/fundacao.spec.ts (mecanico, dono, link direto, nome longo).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Início do mecânico e tela "Eu"

**Files:**
- Create: `src/components/simple/SimpleHome.tsx`
- Modify: `src/pages/dashBoardPage.tsx`, `src/pages/SettingsPage.tsx`
- Test: `ui-tests/e2e/fundacao.spec.ts` (novos testes)

**Interfaces:**
- Consumes: `useShellMode` (Task 7), `PageHeader`, `ActionTile`, `StatusChip` (Task 5), `Stagger`/`StaggerItem` (já existem em `src/components/motion/Stagger.tsx`), `carTitle`, `carDetails` (`src/lib/display.ts`), `logout` (Task 7), `ModeSwitch` (Task 7).
- Produces:
  - `SimpleHome({ orders: SimpleOrder[]; loading: boolean; userName?: string })`
  - `type SimpleOrder = { service_order_id: number; photo_url: string | null; is_complete?: boolean; car: { brand: string | null; model: string | null; year: number | null; color: string | null; plate: string } }`

- [ ] **Step 1: Testes de tela que falham**

Acrescente em `ui-tests/e2e/fundacao.spec.ts`, dentro do `test.describe('duas caras — mecânico', ...)`:

```ts
  test('início do mecânico: cartões grandes dos carros, cada um abre a OS', async ({ page }) => {
    const orderId = await openOrder(page);
    await page.goto('/dashboard');
    const card = page.getByRole('button', { name: new RegExp(`OS ${orderId}`) });
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(72);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/os/${orderId}$`));
  });

  test('tela "Eu": minhas comissões e sair, com botões grandes', async ({ page }) => {
    await page.goto('/configuracoes');
    await expect(page.getByRole('button', { name: 'Minhas comissões' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
  });
```

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx playwright test e2e/fundacao.spec.ts -g "início do mecânico|tela \"Eu\""`
Expected: FAIL — não acha o botão `OS <id>` nem "Minhas comissões".

- [ ] **Step 2: `SimpleHome`**

`src/components/simple/SimpleHome.tsx`:

```tsx
import { Car, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionTile, PageHeader, StatusChip } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import { carDetails, carTitle } from "@/lib/display";

export type SimpleOrder = {
  service_order_id: number;
  photo_url: string | null;
  is_complete?: boolean;
  car: { brand: string | null; model: string | null; year: number | null; color: string | null; plate: string };
};

function greetingByHour(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

/** Início do modo simples: saudação, 2 atalhos grandes e os carros abertos em cartões grandes. */
export function SimpleHome({ orders, loading, userName }: { orders: SimpleOrder[]; loading: boolean; userName?: string }) {
  const navigate = useNavigate();
  const first = userName?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-5">
      <PageHeader
        title={`${greetingByHour()}${first ? `, ${first}` : ""}`}
        subtitle={loading ? "Carregando os carros..." : `${orders.length} ${orders.length === 1 ? "carro aberto" : "carros abertos"} na oficina`}
      />

      <div className="grid grid-cols-2 gap-3">
        <ActionTile tone="brand" icon={<Plus />} label="Carro novo" onClick={() => navigate("/os-client-create")} />
        <ActionTile icon={<Search />} label="Buscar" onClick={() => navigate("/veiculos")} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-base text-white/80">
          Nenhum carro aberto. Toque em <b className="text-brand">Carro novo</b> pra começar.
        </p>
      ) : (
        <Stagger className="flex flex-col gap-3">
          {orders.map((order) => (
            <StaggerItem key={order.service_order_id}>
              <button
                type="button"
                aria-label={`OS ${order.service_order_id}: ${carTitle(order.car)}`}
                onClick={() => navigate(`/os/${order.service_order_id}`)}
                className="flex min-h-24 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left transition-transform active:scale-[0.98]"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
                  {order.photo_url ? (
                    <img src={order.photo_url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <Car className="h-8 w-8 text-white/60" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">{carTitle(order.car)}</p>
                  <p className="truncate text-sm text-white/70">{carDetails(order.car)}</p>
                  <div className="mt-1.5">
                    {order.is_complete === false ? (
                      <StatusChip tone="alert">Dados pendentes</StatusChip>
                    ) : (
                      <StatusChip tone="ok">Em andamento</StatusChip>
                    )}
                  </div>
                </div>
                <span aria-hidden="true" className="text-3xl text-white/60">›</span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
```

Confira a assinatura do `Stagger`/`StaggerItem` em `src/components/motion/Stagger.tsx` (`Stagger({ children, className })`; `StaggerItem` idem). Se o `StaggerItem` não aceitar `key` no map, envolva com `<div key=...>`.

- [ ] **Step 3: Dashboard usa o `SimpleHome` no modo simples**

Em `src/pages/dashBoardPage.tsx`:
- Importe:
  ```tsx
  import { useShellMode } from "@/components/shell/ModeContext";
  import { SimpleHome } from "@/components/simple/SimpleHome";
  ```
- Dentro de `DashboardPage`, depois dos hooks já existentes (depois do `useMemo` de `filteredOrders`, para não quebrar a ordem dos hooks), adicione:
  ```tsx
  const { mode } = useShellMode();
  ```
- Logo antes do `return (` principal, adicione:
  ```tsx
  if (mode === "simple") {
    return (
      <>
        <SimpleHome orders={orders} loading={loading} userName={me?.name} />
        <GuidedTour
          open={tourOpen}
          steps={meForTour ? tourSteps(meForTour.role) : []}
          onClose={() => {
            if (meForTour) markTourDone(localStorage, meForTour.user_id);
            setTourOpen(false);
          }}
        />
      </>
    );
  }
  ```
  Antes, copie as props **exatas** do `<GuidedTour .../>` que já está no JSX desta página (`grep -n "GuidedTour" -A8 src/pages/dashBoardPage.tsx`). O bloco acima é o formato esperado; se os nomes das props forem outros, use os da página.
- Corrija também o "Title Case" forçado do relatório de design: no `<p className="text-sm capitalize text-muted-foreground">` do cabeçalho, troque `capitalize` por `first-letter:uppercase`.

- [ ] **Step 4: Tela "Eu" (Configurações no modo simples)**

Em `src/pages/SettingsPage.tsx`:
- Importe:
  ```tsx
  import { LogOut, Percent } from "lucide-react";
  import { BigButton } from "@/components/kit";
  import { ModeSwitch } from "@/components/shell/ModeSwitch";
  import { useShellMode } from "@/components/shell/ModeContext";
  import { logout } from "@/lib/session";
  ```
  Junte com imports já existentes de `lucide-react` se houver.
- No componente: `const { mode } = useShellMode();` (`navigate` já existe na página).
- Logo abaixo do título da página, adicione:
  ```tsx
  {mode === "simple" && (
    <section aria-label="Atalhos" className="mt-6 flex flex-col gap-3">
      <BigButton variant="secondary" icon={<Percent />} onClick={() => navigate("/comissoes")}>
        Minhas comissões
      </BigButton>
      <ModeSwitch className="w-full justify-center" />
      <BigButton variant="danger" icon={<LogOut />} onClick={() => logout(navigate)}>
        Sair da conta
      </BigButton>
    </section>
  )}
  ```

- [ ] **Step 5: Ver passar + suíte inteira**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && npx tsc -b && cd ../../ui-tests && npx vitest run && npx playwright test`
Expected: TSC sem erro, Vitest PASS, Playwright PASS (incluindo os 2 novos).

- [ ] **Step 6: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/components/simple frontend/oficinasync-web/src/pages/dashBoardPage.tsx frontend/oficinasync-web/src/pages/SettingsPage.tsx ui-tests/e2e/fundacao.spec.ts
git commit -m "feat(visual): inicio do mecanico com cartoes grandes e atalhos; tela Eu com comissoes, troca de modo e sair; data do painel sem Title Case forcado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Animações no lugar certo (publicar, finalizar, foto)

**Files:**
- Modify: `src/pages/OsWorkPage.tsx`, `src/pages/OsFinishPage.tsx`, `src/components/os/EntryPhotoSlot.tsx` (confira o caminho com `grep -rl "export function EntryPhotoSlot" src`)
- Test: `ui-tests/e2e/fundacao.spec.ts`

**Interfaces:**
- Consumes: `celebrate(message)` (Task 4), `PhotoFlash` (Task 4).

- [ ] **Step 1: Teste de tela que falha**

Acrescente em `ui-tests/e2e/fundacao.spec.ts` (fora dos `describe` de mecânico, como dono):

```ts
test('publicar etapa comemora: "O cliente já pode ver"', async ({ page }) => {
  const orderId = await openOrder(page);
  const section = await api(page, 'POST', '/sections', { service_order_id: orderId, type: 'diagnosis', notes: 'Medi a bateria' });
  expect(section.status).toBeLessThan(300);
  await page.goto(`/os/${orderId}`);
  await page.getByRole('button', { name: /publicar/i }).first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'O cliente já pode ver' })).toBeVisible();
});
```

Antes, confira o corpo aceito por `POST /sections` em `backend/src/modules/sections/dto/*.ts` (campos `service_order_id`, `type`, `notes`) e ajuste se o nome do campo de tipo for outro.

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx playwright test e2e/fundacao.spec.ts -g "publicar etapa comemora"`
Expected: FAIL — o status "O cliente já pode ver" não aparece.

- [ ] **Step 2: Ligar as comemorações**

`src/pages/OsWorkPage.tsx`:
- Importe `import { celebrate } from "@/components/motion/celebration";`.
- No bloco `if (confirm.kind === "publish") {`, logo **depois** do `await apiFetch(\`/sections/${confirm.section.section_id}/publish\`, ...)` que deu certo, adicione:
  ```tsx
  celebrate("O cliente já pode ver");
  ```

`src/pages/OsFinishPage.tsx`:
- Importe `celebrate` igual.
- Ache a chamada `PATCH` de `/finish` (`grep -n "finish" src/pages/OsFinishPage.tsx`). Logo **depois** dela dar certo (antes do `navigate`, se houver), adicione:
  ```tsx
  celebrate("OS finalizada");
  ```

- [ ] **Step 3: Flash na foto de entrada**

No `EntryPhotoSlot`:
- Importe:
  ```tsx
  import { PhotoFlash } from "@/components/motion/PhotoFlash";
  ```
- Garanta `useState` no import do React.
- Crie um estado:
  ```tsx
  const [flashKey, setFlashKey] = useState(0);
  ```
- No handler em que a foto escolhida/tirada é aceita (onde ele chama o `onChange`/`onSelect` com o `File` comprimido), adicione:
  ```tsx
  setFlashKey((k) => k + 1);
  ```
- Dentro do elemento que mostra a prévia da foto (ele precisa ter `relative` e `overflow-hidden`; acrescente se não tiver), adicione:
  ```tsx
  <PhotoFlash flashKey={flashKey} />
  ```

- [ ] **Step 4: Ver passar + suíte inteira**

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && npx tsc -b && cd ../../ui-tests && npx playwright test`
Expected: PASS (todos, incluindo "publicar etapa comemora").

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/pages/OsWorkPage.tsx frontend/oficinasync-web/src/pages/OsFinishPage.tsx $(git -C . ls-files -m | grep EntryPhotoSlot) ui-tests/e2e/fundacao.spec.ts
git commit -m "feat(visual): comemoracao ao publicar etapa e finalizar OS; flash ao tirar foto de entrada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Passo a passo no visual novo

**Files:**
- Modify: `src/lib/tours.ts`, `ui-tests/unit/tours.test.ts`, `ui-tests/e2e/global-setup.ts`

**Interfaces:**
- Consumes: `tourKey(userId)` (já existe).
- Produces: `TOUR_VERSION = 2`.

- [ ] **Step 1: Teste que falha**

Em `ui-tests/unit/tours.test.ts`, acrescente dentro do `describe`:

```ts
  it('versão 2 (visual novo) e o mecânico aprende o botão verde "+ Carro" de baixo', () => {
    expect(TOUR_VERSION).toBe(2);
    expect(tourSteps('mechanic').map((s) => s.text).join(' ')).toMatch(/\+ Carro/);
  });
```

Run: `cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/ui-tests" && npx vitest run unit/tours.test.ts`
Expected: FAIL — `expected 1 to be 2`.

- [ ] **Step 2: Implementar**

Em `frontend/oficinasync-web/src/lib/tours.ts`:
- `export const TOUR_VERSION = 2;`
- No passo comum "Abrir uma OS", troque o `text` por:
  ```ts
    text: "Toque em \"Nova OS\" — no celular do mecânico é o botão verde \"+ Carro\", embaixo. Se o cliente já foi embora, use a \"Abertura rápida\": só a placa é obrigatória, o resto você completa depois.",
  ```

- [ ] **Step 3: O setup dos testes de tela usa a chave certa**

Em `ui-tests/e2e/global-setup.ts`:
- Adicione o import:
  ```ts
  import { tourKey } from '../../frontend/oficinasync-web/src/lib/tours';
  ```
- Troque:
  ```ts
    return { name: `oficinasync_tour_v1_${me.user_id}`, value: '1' };
  ```
  por:
  ```ts
    return { name: tourKey(me.user_id), value: '1' };
  ```
  (Assim, mudar a versão nunca mais faz o passo a passo aparecer de surpresa no meio dos testes.)

- [ ] **Step 4: Ver passar + suítes**

Run: `npx vitest run && npx playwright test`
Expected: PASS em tudo.

- [ ] **Step 5: Commit**

```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add frontend/oficinasync-web/src/lib/tours.ts ui-tests/unit/tours.test.ts ui-tests/e2e/global-setup.ts
git commit -m "feat(visual): passo a passo v2 (todos reveem no visual novo) e ensina o + Carro; setup dos testes usa tourKey

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificação final, prints e rodada de usabilidade

**Files:**
- Create: `docs/equipe/reforma-visual/fase1-antes-depois.md` + `docs/equipe/reforma-visual/img/*.png`

- [ ] **Step 1: Todas as suítes**

Run:
```bash
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync/frontend/oficinasync-web" && npx tsc -b && npx vite build > /dev/null && echo BUILD-OK
cd ../../ui-tests && npx vitest run && npx playwright test
cd ../backend && npm test 2>&1 | tail -5
```
Expected: `BUILD-OK`, Vitest PASS, Playwright PASS, backend inalterado e PASS.

- [ ] **Step 2: Prints de antes e depois**

1. Suba o ambiente de teste: `bash ui-tests/scripts/start-env.sh` com `run_in_background` (credenciais em `ui-tests/.persona-env.json`).
2. Com o navegador interno, tire prints de Login, Início (dono, modo controle), Início (modo mecânico), Configurações/Eu, Clientes, OS e Finalizar.
3. Faça isso em **375×812** e em **800×1280** (tablet).
4. Salve em `docs/equipe/reforma-visual/img/`.
5. Para o "antes", use os prints de `docs/equipe/lancamento-publico/img/`.

- [ ] **Step 3: Revisão do designer e rodada das personas**

1. Despache `designer-ux` para revisar os prints contra a spec: contraste, alvo de toque, consistência.
2. Despache `persona-seu-ze` e `persona-dona-cida` (Playwright MCP em `localhost:5183`) com as tarefas:
   - seu Zé: "abra um carro novo só com a placa";
   - seu Zé: "ache o Gol";
   - Dona Cida: "veja as comissões".
3. Registre os achados em `docs/equipe/reforma-visual/fase1-antes-depois.md`, separando:
   - **bug**: corrigir já, com teste de regressão;
   - **ajuste para a Fase 2**.

- [ ] **Step 4: Parar o ambiente e commitar o relatório**

```bash
bash ui-tests/scripts/stop-env.sh
cd "/c/Users/domme/OneDrive/Área de Trabalho/TCC/OficinaSync"
git add docs/equipe/reforma-visual
git commit -m "docs: reforma visual fase 1 — antes/depois, revisao do designer e rodada das personas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Atualizar o `CLAUDE.md`** (seção nova "Reforma visual Cinema Escuro Premium — Fase 1 (feito)")

O que registrar:
- tokens e letras, `@/components/kit`, `@/components/shell`, `modeFor`;
- regra do tema global;
- `celebrate()`;
- como gerar ícones (`node ui-tests/scripts/gen-brand-icons.mjs`);
- Vitest agora renderiza componentes.

Commit `docs: CLAUDE.md registra a fase 1 da reforma visual`.
