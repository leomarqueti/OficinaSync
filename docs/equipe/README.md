# Como o time do OficinaSync trabalha junto

Este arquivo é o **protocolo** dos agentes (`.claude/agents/`). Cada agente começa a conversa "do zero": **os arquivos desta pasta são a memória do time.** Leia antes de agir.

## Quem é quem

| Agente | Papel |
|---|---|
| (coordenador) | A sessão principal do Claude. Abre o tema, chama os agentes na ordem, consolida e **entrega tudo ao Leonardo**. É quem fala com ele. |
| `marketing-estrategia` | Estratégia, mensagem, oferta, canais, textos de venda |
| `designer-ux` | Identidade visual, landing, fluxos, microtexto, acessibilidade, specs pro frontend |
| `persona-seu-ze`, `persona-rafa`, `persona-dona-cida` | Mecânicos/recepcionista **simulados** que usam o sistema de teste e dão feedback |
| `produto-receita` | Plano de R$ 99, trial, cobrança, LGPD, specs de negócio |
| `dev-backend`, `dev-frontend`, `dev-mobile-iot` | Implementam (com teste de regressão) |
| `guardiao-seguranca`, `qa-testes` | Revisam segurança e qualidade |
| `devops-deploy` | CI/CD, deploy, backup (nunca age na VPS sozinho) |

## Fluxo de um tema (ex.: "landing page para vender o sistema")

```
docs/equipe/<tema>/
  00-pedido.md              coordenador: o que o Leonardo pediu + restrições + decisões já tomadas
  01-brief-marketing.md     marketing-estrategia: público, mensagem, o que dizer / NÃO dizer, métrica
  02-design.md              designer-ux: estrutura, decisões, o que o frontend constrói
  03-revisao-marketing.md   marketing-estrategia: o design entrega a mensagem sem exagerar?
  04-...                    devs / qa / guardião, se virar implementação
  99-resumo-para-leonardo.md  coordenador: tudo consolidado, certinho (ver "Entrega")
docs/equipe/feedback/
  AAAA-MM-DD-<persona>.md   relatórios dos mecânicos simulados
```

1. O **coordenador** cria `00-pedido.md` e chama o `marketing-estrategia`.
2. `marketing-estrategia` escreve o brief → coordenador chama o `designer-ux`.
3. `designer-ux` responde com o design e aponta o que depende do marketing → `marketing-estrategia` revisa.
4. Se o tema muda uma tela do sistema, as **personas** testam a versão atual (ou o protótipo) e o `designer-ux` cruza o feedback com o design.
5. Só depois disso `dev-frontend`/`dev-backend` implementam, com teste; `guardiao-seguranca` e `qa-testes` revisam.

**Com "agent teams" ligado** (experimental, ativado em `.claude/settings.local.json`; só em sessão interativa), os agentes podem se falar direto por `SendMessage`. Mesmo assim, **o que foi decidido vai para os arquivos** — conversa some, arquivo fica.

## Regras do time

1. **Decisão do Leonardo × sugestão.** Marque sempre qual é qual. Preço, plano, promessa ao cliente e qualquer coisa pública são **dele**.
2. **Não invente fatos**: números, clientes, depoimentos, taxas, leis, concorrentes. Sem fonte verificável → "a verificar".
3. **Só prometa o que o sistema faz hoje** (veja `CLAUDE.md`). OBD está pausado; o app Android é só um teste.
4. **Resumo de 5 linhas no topo** de todo arquivo, pensando em quem só vai ler isso.
5. **Todo bug ganha teste de regressão** (regra do projeto).
6. **Ninguém age em produção** (VPS, dados reais, push, publicação) sem o Leonardo autorizar.
7. Personas e simulações geram **hipóteses**, não prova. Confirmar com pessoas de verdade (o time da Lima) antes de decidir.

## Mecânicos simulados: como rodar

1. O coordenador sobe o ambiente de teste: `bash ui-tests/scripts/start-env.sh` (Docker com SQL Server e MinIO no ar). Cria uma oficina falsa e deixa as credenciais em `ui-tests/.persona-env.json`.
2. Chama cada persona (uma por vez — o login é limitado a 5 por minuto). Elas só acessam `http://localhost:5183`, usam um navegador de celular e escrevem `docs/equipe/feedback/AAAA-MM-DD-<persona>.md`.
3. O coordenador para o ambiente: `bash ui-tests/scripts/stop-env.sh`.

## Entrega ao Leonardo (`99-resumo-para-leonardo.md`)

Em português simples, nesta ordem: **o que foi feito** (3–5 linhas) → **o que precisa da decisão dele** (lista curta, com a recomendação) → **o que cada agente achou/produziu** (1 linha cada, com link pro arquivo) → **riscos e o que não foi verificado** → **próximos passos**. Sem jargão.
