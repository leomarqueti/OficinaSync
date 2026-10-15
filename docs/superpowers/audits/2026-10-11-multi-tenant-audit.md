# Auditoria de isolamento multi-tenant — 2026-10-11

Método: leitura de todos os controllers e services + suíte e2e com duas oficinas
(`backend/test/tenant-isolation.e2e-spec.ts`, `auth-surface.e2e-spec.ts`, `not-found.e2e-spec.ts`).
Rodar: `cd backend && npm run test:e2e` (precisa de `docker compose up -d sqlserver minio`).

## Achados corrigidos

| # | Gravidade | Rota | Problema | Correção |
|---|---|---|---|---|
| 1 | CRÍTICO | `GET /service_orders/:id` | Qualquer usuário logado (de qualquer oficina) lia a OS inteira de outra: CPF, telefone e e-mail do cliente, e-mail do mecânico, URLs assinadas das mídias. Sem checagem de tenant. | Service valida `order.tenant.id === user.tenant.id` (403). |
| 2 | ALTO | `POST /service_orders` | Aceitava `car_id` de outra oficina: criava OS na oficina A ligada ao carro/cliente da B (e, somado ao #1, expunha os dados dela). | Valida o tenant do carro (403). |
| 3 | MÉDIO | `JwtAuthGuard` | Ignorava o `scope` do JWT: o token de onboarding (cadastro em 2 etapas) valia em qualquer rota. | Guard exige `access` por padrão; `POST /tenants` exige `onboarding` via `@RequireTokenScope`. Token antigo sem scope segue válido como `access`. |
| 4 | MÉDIO | `POST /users` | Cadastro público, sem throttle e sem uso no frontend (o real é `POST /auth/register`, com limite). | Rota removida. |
| 5 | BAIXO | cars/clients `findById` | Id inexistente lançava `Error` genérico → 500. | `NotFoundException` → 404. |

## Rotas verificadas sem problema (cobertas por teste de regressão)

`/cars` (GET, GET :id, PATCH), `/clients` (GET, PATCH), `/service_orders` (orders, by-car, finish, report.pdf, promo-video),
`/sections` (POST, PATCH, publish), `/medias` (POST), `/tests` (POST, PATCH, DELETE, history),
`/obd/devices` (CRUD, latest, command) e `/obd/capture`, `/invites` (GET), `/users/me`.
Todas exigem JWT (teste "sem token → 401") e validam o tenant do recurso (A não toca na B).

## Riscos aceitos (decisão consciente)

- **Página pública `/service_orders/public/:token`** expõe nome e telefone do cliente, placa e fotos publicadas a quem tem o link.
  Mitigação: token de 256 bits (`randomBytes(32)`), sem CPF/e-mail (teste garante), só etapas publicadas. É o produto.
- **Enumeração de ids** (403 para id alheio × 404 para inexistente): ids são inteiros sequenciais; o dado em si não vaza. Baixo.
- **`GET /invites/:token` e `GET /health` públicos**: o primeiro depende de token secreto; o segundo só diz "ok".
- **Upload com Content-Type mentiroso**: `MinioService` confia no `mimetype` do cliente quando o `file-type` não detecta o tipo
  (mantém compatibilidade com áudio webm do navegador). Arquivos são servidos por URL assinada do subdomínio `storage.` com o
  Content-Type salvo; risco baixo. Reavaliar se abrir upload a usuários não autenticados (hoje não abre).
- **Throttle global 60 req/min por IP** (+5/min em login/registro/esqueci-senha/aceite de convite): suficiente pra começar.

## Limitações da suíte

O e2e usa stubs para `file-type` (só PNG) e `puppeteer` (ambos ESM-only e incompatíveis com o Jest CJS): a geração real
de PDF e a detecção real de tipos de mídia não são exercitadas aqui. O isolamento do `report.pdf` continua coberto porque
a checagem de tenant acontece antes de abrir o navegador.

## Fora do escopo desta auditoria

Infra (firewall da VPS, portas do Docker, rotação de segredos), dependências com CVE (`npm audit`) e revisão jurídica da LGPD.
