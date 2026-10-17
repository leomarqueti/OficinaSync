# Reforma visual — Fase 1 (Fundação): antes e depois

Data: 2026-10-17 · Branch `feat/reforma-visual-fase1` · Spec: `docs/superpowers/specs/2026-10-17-reforma-visual-fase1-fundacao-design.md`

## O que mudou

- **Identidade:**
  - logo da engrenagem redesenhado em vetor;
  - favicon e ícones do app opacos;
  - logo no login do celular;
  - letras Saira Condensed (títulos em caixa alta) e Archivo;
  - limão = tudo certo, amarelo = alerta;
  - tudo escuro, inclusive Finalizar e o cadastro de OS, que eram claros.
- **Animações:** comemoração ao publicar etapa ou finalizar OS, flash ao tirar foto, botão que afunda e vibra, carregamento com brilho.
- **Campos:** todos com o mesmo visual (48px, texto 16px, sem zoom no iPhone). O botão desabilitado ficou legível e explica o que falta.
- **Duas caras:**
  - mecânico → modo simples (barra embaixo: Início, Buscar, + Carro, Eu);
  - escritório e dono → modo controle (menu lateral com item ativo);
  - o dono alterna entre os dois.

## Prints (celular 375px)

| Antes (`../lancamento-publico/img/`) | Depois (`img/`) |
|---|---|
| `01-login-mobile.jpg` (sem logo) | `f1-01-login-celular.jpg` |
| `04-dashboard-topo-mobile.jpg` | `f1-02-dono-modo-controle-celular.jpg` |
| (não existia) | `f1-03-modo-mecanico-inicio.jpg` |
| `21-configuracoes.jpg` | `f1-04-modo-mecanico-eu.jpg` |
| `10-os-mecanico-topo.jpg` | `f1-05-os-celular.jpg` (a OS será refeita na Fase 2) |

## Revisão do designer

- **Nota:** de 5,5 para 6,5.
- **O que já tem cara de produto próprio:** o início do mecânico e o login.
- **O que ainda tem cara de modelo pronto:** o painel do dono e a tela da OS, que só herdaram letra e cor. Elas vão ser refeitas nas Fases 2 e 3.

Corrigido já (com teste de regressão):
- "Sair da conta" estava vermelho e no topo da tela "Eu" (risco de toque sem querer). Foi para o fim, discreto.
- A troca de modo aparecia duas vezes.
- "Scanner / OBD" aparecia na trilha de etapas com o OBD pausado.

Para as próximas fases:

| Fase | O que entra |
|---|---|
| 2 (mecânico) | **OS:** botões grandes do kit, "Finalizar" deixa de ser principal cedo demais, aviso amarelo novo, "Enviar no WhatsApp" |
| 2 (mecânico) | **Início:** etapa no cartão; "dados pendentes" é assunto do escritório, não do mecânico |
| 3 (escritório) | **Painel do dono:** números em grade 2×2, ícones neutros, "Primeiros passos" |
| Pendente | Botões "Entrar no sistema" e "+ Nova Ordem de Serviço" ainda fora do kit |

## Revisão de código (revisor independente)

- **Sem achados críticos.**
- **Dois importantes, corrigidos com teste:**
  - dono com "modo mecânico" salvo via o menu piscar e a tela carregar duas vezes;
  - o botão de escolher foto no Finalizar estava ilegível.
- **Menores, anotados para depois:**
  - troca de modo com navegador bloqueando armazenamento;
  - caixa alta na ficha impressa;
  - comemoração não anunciada por leitor de tela;
  - toque animado com "menos movimento" ligado;
  - cache de usuário ao aceitar convite na mesma aba.

## Achado fora do visual (decisão do Leonardo)

A API limita **60 pedidos por minuto por endereço de internet**. Na oficina, todo mundo sai pelo mesmo roteador. Com 5 pessoas usando ao mesmo tempo, isso pode estourar e aparecer "Too Many Requests".

O limite agora é configurável (`THROTTLE_LIMIT`), mas a produção continua em 60. Recomendação: subir para ~300 em produção. O login continua limitado a 5 por minuto.

## Não feito

- **Rodada com as personas simuladas** (seu Zé, Dona Cida): os agentes do projeto não estavam carregados nesta sessão. Fazer numa sessão nova, ou já ir direto para o teste real na Lima.
