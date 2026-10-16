# OficinaSync — Lançamento enxuto (SaaS R$ 99/mês)

Data: 2026-10-11 · Dono: Leonardo · Status: aprovado em conversa, aguardando revisão do spec escrito

## 1. Objetivo e restrições

- **Meta de renda:** R$ 1.000–2.000/mês de renda extra (cobrir o financiamento e sobrar).
- **Modelo:** assinatura de **R$ 99/mês**, plano único, vendida pela internet pra oficinas independentes. Meta real = **10 a 20 oficinas pagando**.
- **Restrições do Leonardo:** gastar pouco, sistema "redondinho" e seguro, vender pra poucos clientes primeiro. Hoje ninguém foi abordado ainda — as primeiras oficinas vêm de contatos pessoais.
- **Custo fixo atual:** só a VPS (~R$ 25–30, a confirmar contra a fatura real). Nenhuma decisão aqui pode criar custo recorrente relevante.
- **Princípio:** vender antes de automatizar. Cobrança sofisticada só depois dos primeiros pagantes.

## 2. Fora de escopo (decisão consciente — não construir agora)

Checkout recorrente automático, múltiplos planos com limites, publicação na Play Store (o PWA instala de graça), scanner OBD (Fases 1–3 ficam commitadas, não deployadas), orçamento digital, Base técnica, app Android como produto. Todos viram upsell depois dos primeiros pagantes.

## 3. Estado atual relevante (verificado no código em 2026-10-11)

- `Tenants` tem `plan` (trial/free/pro/full), `status` (trial/active/suspended), `trial_ends_at` (7 dias, setado em `tenants.service.ts`). **Nada lê esses campos** — trial vencido não bloqueia ninguém.
- `media.controller.ts` usa `FileInterceptor('file')` **sem `limits`**: upload sem teto (multer em memória → risco de RAM e de disco).
- `VideoModule` gera o vídeo de divulgação em background (ffmpeg) **sem fila nem limite de concorrência**.
- Não existem: cobrança, tela de plano, super-admin, termos/LGPD, landing page, backup automático.
- Já houve vazamento entre tenants (`GET /clients` sem guard, corrigido). Isso justifica a auditoria completa.

## 4. Componentes (em ordem de execução)

### 4.1 Auditoria de segurança multi-tenant — BLOQUEANTE
- **O quê:** enumerar todas as rotas de todos os controllers e classificar: guard presente? escopo por `tenant.id` do token? busca por ID sem checagem de tenant? resposta vaza campo sensível?
- **Inclui:** rotas públicas (`/service_orders/public/:token` não pode expor CPF/e-mail/telefone além do necessário), `GET /health`, rotas de convite, URLs presigned do MinIO, throttling de auth.
- **Entrega:** tabela de achados em `docs/superpowers/audits/` + correções + **teste automatizado com 2 tenants** (A tenta ler/alterar/deletar cada recurso do B → deve falhar) cobrindo clients, cars, service_orders, sections, tests, medias, report PDF, invites, users, obd.
- **Critério de saída:** suíte de 2 tenants verde. Nenhuma oficina externa entra antes disso.

### 4.2 Limites de upload, cota de armazenamento e flag do vídeo de divulgação
- **Limite por arquivo:** teto duro no multer (`limits.fileSize`) mais checagem por tipo após `fileTypeFromBuffer` (foto, áudio, vídeo, com valores iniciais a definir — sugestão: foto 15MB, áudio 20MB, vídeo 100MB). Estourou → 413 com mensagem em português.
- **Cota por oficina:** somar `medias.size` das mídias do tenant (join section → service_order → tenant) antes de aceitar upload; acima da cota → 413 "armazenamento cheio, fale com o suporte". Valor da cota depende do disco real da VPS (ver §7).
- **Flag `PROMO_VIDEO_ENABLED`** (env, default `false`): com a flag desligada, `POST /service_orders/:id/promo-video` responde 403 e o frontend esconde o botão (flag exposta em `GET /users/me`). Concorrência do ffmpeg limitada a 1 quando ligada.
- **Mantém:** captura de vídeo na OS (diferencial do produto).

### 4.3 Guard de assinatura (trial/inadimplência)
- **Dados novos em `tenants` (migration):** `paid_until` (date, nullable), `accepted_terms_at` (datetime, nullable).
- **Regra de acesso:** liberado sse `status != suspended` e (`plan = trial` e `now < trial_ends_at`) ou (`paid_until` e `now <= paid_until + 3 dias de tolerância`). Trial passa de 7 para **14 dias**.
- **Bloqueio:** guard retorna **402** com mensagem clara em todas as rotas autenticadas, exceto allowlist (`/auth/*`, `GET /users/me`, página de assinatura). **Dados nunca são apagados.** Página pública do cliente final continua funcionando (não punir o cliente da oficina).
- **Performance:** cache em memória do estado do tenant (~60s) pra não somar uma query por request.
- **Frontend:** banner "faltam N dias de teste" / "assinatura vencida"; tela de bloqueio levando à página de assinatura.
- **ATENÇÃO — tenant da Lima Auto Elétrica:** precisa ser **grandfathered** (plan=`full`, `paid_until` muito distante) por script antes de ligar o guard em produção, senão o guard trava a própria oficina do Leonardo.

### 4.4 Painel super-admin (só do Leonardo)
- **Acesso:** variável de ambiente `PLATFORM_ADMIN_EMAILS` (lista). Sem coluna no banco, sem caminho de escalada de privilégio por API. `PlatformAdminGuard` confere o e-mail do usuário do JWT.
- **Rotas:** `GET /admin/tenants` (nome, CNPJ, telefone, plano, status, `trial_ends_at`, `paid_until`, nº de OS, armazenamento usado) e `PATCH /admin/tenants/:id` (`paid_until`, `plan`, `status`). Única parte do sistema que atravessa tenants de propósito — por isso entra na suíte de segurança do §4.1.
- **Frontend:** página `/admin`, só visível se `GET /users/me` indicar admin. Botão "Registrar pagamento (+30 dias)" e "Suspender/Reativar".

### 4.5 Cobrança manual assistida (zero integração)
- Página **`/assinatura`** (tenant): status, dias restantes, valor (R$ 99), instruções de PIX (chave/copia-e-cola vindos de configuração) e botão de WhatsApp pro Leonardo.
- Leonardo recebe por PIX/link do Asaas (gerado no painel deles, sem código) e registra o pagamento no `/admin`. Webhook automático é fase 2, só depois de clientes pagando.

### 4.6 Base legal e landing
- **`/termos` e `/privacidade`** (LGPD) + checkbox obrigatório no `TenantRegisterPage` gravando `accepted_terms_at`. Texto-base redigido por mim; **recomenda-se revisão de advogado** antes de escalar (é minuta, não parecer jurídico).
- **Landing** em `/` para visitantes: promessa, 3 benefícios, demo (link pra uma OS demo com dados fictícios num tenant de demonstração), preço R$ 99/mês, "14 dias grátis", CTA pro cadastro e pro WhatsApp. No app nativo (`Capacitor.isNativePlatform()`) `/` continua redirecionando pra `/login`/`/dashboard`.

### 4.7 Operação barata
- **Backup automático:** cron na VPS (dump do SQL Server + cópia do volume do MinIO) enviado para armazenamento externo gratuito/barato, retenção ~7 diários, **restore testado ao menos uma vez**. Documentar em `DEPLOY.md`.
- **Uptime:** monitor gratuito batendo em `GET /health`, alerta por e-mail/WhatsApp.
- **Entregabilidade de e-mail:** verificar domínio no Resend (SPF/DKIM) — o cadastro depende de e-mail de verificação; se cair em spam, ninguém consegue se cadastrar.
- **Suporte:** WhatsApp do Leonardo como canal único por enquanto.

## 5. Ordem e gates

1. §4.1 Auditoria + suíte de 2 tenants (gate de segurança)
2. §4.2 Limites/cota/flag
3. §4.3 + §4.4 + §4.5 juntos (o guard precisa do admin pra destravar quem pagou) — **grandfathering da Lima antes do deploy**
4. §4.6 termos/privacidade (necessários antes do primeiro cadastro externo)
5. §4.7 backup + uptime + e-mail (antes do primeiro cliente real)
6. **Gate de lançamento:** itens 1–5 prontos → primeiras 3–5 oficinas entram no corpo a corpo
7. §4.6 landing completa, depois dos primeiros pilotos

## 6. Critérios de sucesso

- Suíte de 2 tenants passa; nenhum recurso vaza entre oficinas.
- Tenant com trial vencido recebe 402 e volta a funcionar após "Registrar pagamento".
- Lima Auto Elétrica não sofre nenhuma interrupção no deploy do guard.
- Upload acima do limite/cota é recusado com mensagem clara; backend não estoura RAM.
- Backup restaurado com sucesso em ambiente de teste.
- Uma oficina de fora consegue: cadastrar → usar 14 dias → pagar PIX → ter acesso estendido, sem intervenção técnica além do clique do Leonardo.

## 7. Itens a verificar (NÃO são fatos ainda)

- Tarifas do Asaas/PIX por cobrança e se vale usar PIX direto sem Asaas no início.
- Tamanho real do disco da VPS e, daí, cota por oficina e teto de oficinas por servidor.
- Limites do SQL Server Express (teto de tamanho do banco e de memória) versus 20 oficinas.
- Plano gratuito/barato de armazenamento externo pro backup e limites do plano gratuito do Resend.
- Faixa de preço: R$ 99 é hipótese; validar nas primeiras conversas.
- Revisão jurídica dos termos.
