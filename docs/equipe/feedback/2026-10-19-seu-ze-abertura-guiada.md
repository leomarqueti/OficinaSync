# Feedback simulado: Seu Zé, abertura guiada de OS (cronometrada), 2026-10-19

> Simulação feita por IA no navegador interno, em celular emulado (375x812), no ambiente de TESTE (`localhost:5183`), logado como **mecânico**. Branch `feat/abertura-guiada` (uma pergunta por tela). Comparação com a rodada de 2026-10-17 (`2026-10-17-seu-ze.md`, wizard antigo).

## Resumo
1. **Missão A (carro novo, VW Gol 2013): 2 min 02 s, 23 toques** (19 no caminho ideal) e 30 letras digitadas. A meta era menos de 2 min. Ficou no limite, e o relógio inclui a demora da IA entre um toque e outro (ver limites).
2. **Missão B (mesma placa): 56 s, 15 toques** e 30 letras digitadas. Meta de menos de 1 min cumprida. O sistema reconheceu o carro: "É o Volkswagen Gol 2013 prata?" e "Sim, é esse".
3. Melhorou muito em relação à abertura antiga. Antes eram cerca de 30 toques, 13 campos de teclado e o erro "Usuario ja cadastrado!". Agora marca, modelo, ano, combustível e cor são botões grandes. Só digito placa, KM e defeito. Toda tela diz "Falta: ..." embaixo do botão apagado.
4. O pior achado: na missão B **não houve aviso de que o Gol já tinha uma OS aberta (#1941)**. Abriu a #1942 e o Início passou a mostrar dois cartões idênticos, sem número de OS, e "2 carros abertos" para o mesmo carro.
5. Segundo problema: na B o KM vem **preenchido com o da última visita**. Com pressa, aperto "Continuar" e fica gravado o KM velho.

**Nota de usabilidade (pro Seu Zé): 8/10.** A antiga ganhou 6/10.

## Tempos e toques

| | Missão A (carro novo) | Missão B (carro já cadastrado) |
|---|---|---|
| Tempo (relógio do navegador, `Date.now()`) | **121,6 s** (marcado uns 2 s antes do toque em "+ Carro"; ~119 s do toque até a OS #1941 aberta) | **55,8 s** (até a OS #1942 aberta) |
| Meta | < 2 min (no limite) | < 1 min (cumprida) |
| Toques reais nesta rodada | **23** | **15** |
| Toques no caminho ideal | 19 (sem o tropeço da placa, sem tentar o microfone, sem combustível/cor) | 15 |
| Toques com câmera de verdade (+ disparar e "OK" em cada foto, estimativa) | ~27 a 31 | ~23 |
| Digitação | placa (7) + KM (6) + defeito (17) = 30 letras | as mesmas 30 letras (KM apagado e redigitado) |

**Toques da A, em ordem:**
1. "+ Carro"
2. Campo da placa
3. "Continuar", que falhou (ver atrito 3)
4. Campo da placa de novo
5. "Continuar"
6. Volkswagen
7. Gol
8. 2013
9. Campo do KM
10. "Continuar"
11. Flex
12. Prata
13. "Continuar"
14. "Falar em vez de escrever" (microfone bloqueado na simulação)
15. Campo do defeito
16. "Continuar"
17. "Não, o escritório completa"
18 a 21. "Tirar foto" ×4 (a tela passa sozinha para a próxima foto)
22. "Conferir"
23. "Abrir OS"

**Toques da B, em ordem:**
1. "+ Carro"
2. Campo da placa
3. "Sim, é esse"
4. Campo do KM
5. "Continuar"
6. "Continuar" (tela "Se souber" já vinha preenchida)
7. Campo do defeito
8. "Continuar"
9. "Não, o escritório completa"
10 a 13. Fotos ×4
14. "Conferir"
15. "Abrir OS"

## Atritos
| # | missão/tela | o que esperava | o que aconteceu | gravidade | sugestão simples |
|---|---|---|---|---|---|
| 1 | B / placa e Início | Ser avisado: "esse Gol já está aberto na oficina (OS #1941)" | Nenhum aviso. Abriu uma 2ª OS para o mesmo carro. O Início mostra **dois cartões iguais** ("VOLKSWAGEN GOL · 2013 · Prata · QZE7B41"), sem número nem data, e "2 carros abertos na oficina" | **atrapalha** (na oficina de verdade vira bagunça: em qual eu trabalho?) | No "É o Gol...?", se houver OS aberta, mostrar "Esse carro já está aberto (OS #1941)" com os botões "Ir pra OS aberta" e "Abrir outra mesmo assim". Pôr o nº da OS ou a data no cartão |
| 2 | B / KM | Digitar o KM de hoje | Campo já vem com **148.320** (da última vez). O aviso em amarelo diz "confira o de hoje", mas o botão "Continuar" já está aceso | **atrapalha** (dado errado sem perceber) | Campo vazio, com "Última vez: 148.320 km" como dica. Ou bloquear se o KM for igual ou menor que o anterior |
| 3 | A / placa | Digitar a placa e seguir | 1ª tentativa: a placa ficou **QZEQ7B41** (8 letras, uma a mais) e o "Continuar" **sumiu sem dizer nada**. Nas outras telas aparece "Falta: ...", aqui não. Tive que apagar tudo e redigitar (custou ~2 toques e uns 15 s). *Pode ser defeito da ferramenta de digitação da simulação, porque nas outras 2 vezes saiu certo* | atrapalha | Quando a placa não fecha o formato, escrever embaixo "Placa incompleta ou errada (ex.: ABC1D23)". Vale um teste com mecânico real digitando rápido |
| 4 | A e B / placa | Botão aparecer logo depois de digitar | Aparece "Procurando essa placa..." e o botão só surge ~1 a 2 s depois. Nesse tempo o Zé toca onde o botão vai aparecer e não acontece nada | detalhe | Mostrar o botão já apagado, com "Procurando...", no lugar onde ele vai ficar |
| 5 | OS aberta (A e B) | Abrir e ir trabalhar | Logo no topo, quadro amarelo "**Dados pendentes** — Falta: nome do cliente, telefone, CPF, endereço, chassi". Eu mesmo escolhi "o escritório completa", e parece que fiz algo errado. Em seguida vêm "Mandar no WhatsApp" (sem telefone de cliente!) e "Finalizar OS", grandes e verdes, numa OS que acabou de abrir | atrapalha | No modo mecânico, trocar por uma linha discreta: "Cliente: o escritório vai completar". Esconder WhatsApp enquanto não há telefone. "Finalizar" mais embaixo (já reportado em 17/10) |
| 6 | OS aberta | "Início" | O voltar ainda é a palavra pequena em inglês "**← Dashboard**", e a barra de baixo some dentro da OS (já reportado em 17/10, continua) | atrapalha | "← Início" grande ou manter a barra de baixo |
| 7 | B / "Se souber" | Pular o que já sei | A tela de combustível/cor aparece de novo, já preenchida (Flex, Prata). É 1 toque a mais sem motivo | detalhe | No carro já cadastrado, pular essa tela (dá para corrigir no "Conferir") |
| 8 | A / defeito, microfone | Falar o defeito | Na simulação o microfone é bloqueado. A mensagem "Não deu pra usar o microfone — escreva o defeito" é clara (bom!), mas o aviso vermelho cobre o "← Voltar" do topo por alguns segundos | detalhe | Aviso embaixo, perto do campo, ou sem cobrir o Voltar. **Ditado real não foi testado** |
| 9 | A / cor | Ver qual cor marquei | A cor marcada ganha só um anel verde fino. De óculos e com pressa, quase não vi que o Prata ficou marcado | detalhe | Um ✓ grande dentro da bolinha e o nome da cor em negrito |
| 10 | A / Conferir | Ver tudo que escolhi | "Volkswagen Gol 2013 · QZE7B41 · Prata", mas o **Flex não aparece** | detalhe | Mostrar o combustível junto |
| 11 | A e B / OS aberta | Um "pronto!" | A tela pula direto para a OS, sem aviso de "OS aberta!" (a Fase 1 tem a comemoração `celebrate`, mas aqui não apareceu) | detalhe | "OS #1941 aberta ✓" por 1 s |
| 12 | Início / passo a passo | Ver o botão "+ Carro" | O cartão "Passo 1 de 6" cobre a barra de baixo inteira, inclusive o "+ Carro". Só aparece depois de tocar em "Pular" | detalhe | Deixar o cartão acima da barra, ou apontar para o "+ Carro" |
| 13 | A / placa | Teclado abrir sozinho | O campo parece ativo (borda verde, cursor piscando), mas a digitação só entrou depois de tocar nele. *Pode ser coisa do navegador emulado* | detalhe | Conferir em Android de verdade se o teclado abre sozinho |

## O que melhorou em relação à abertura antiga (17/10)
- **Toques:** caíram de ~30 para 19 a 23 no carro novo e 15 no carro conhecido.
- **Teclado:** antes eram 13 campos, agora são 3. Marca, modelo, ano, combustível e cor viraram botões grandes. O "Gol" é o 1º da lista da VW.
- **Fim do erro que travava:** o "Usuario ja cadastrado!" não existe mais, porque o cliente é opcional ("Não, o escritório completa").
- **Botão apagado agora explica:** aparece "Falta: KM do painel", "Falta: descrever o defeito (5 letras ou mais)" e "Falta: foto da frente, ...". Era o atrito 2 e 3 da rodada anterior.
- **Desenho do painel:** mostra onde ler o KM ("O número que pisca é o KM"). O campo do KM abre o teclado numérico e põe o ponto sozinho (148.320).
- **Fotos guiadas:** o desenho mostra de que lado tirar, e a tela passa sozinha para a próxima foto. Tem "+ Tirar mais uma" para riscos.
- **Carro conhecido:** é reconhecido pela placa ("É o Volkswagen Gol 2013 prata?"), sem cadastro duplicado do carro.
- **Ditado de voz:** tem o botão "Falar em vez de escrever", com mensagem de erro clara quando o microfone falha.
- **Revisão:** o "Tudo certo?" final é curto e cabe na tela.

## O que me faria desistir
- Abrir o mesmo carro duas vezes sem perceber e depois não saber em qual OS colocar as fotos.
- Ver o quadro amarelo "Dados pendentes" toda vez que abro um carro sem o cliente, como se eu tivesse esquecido algo.

## O que me faria indicar pro colega
- "Abri a OS em 2 minutos e só digitei a placa, o KM e o defeito."
- Na segunda vez o sistema lembrou do carro.

## Limites desta simulação
- **Sou uma IA fazendo papel de mecânico.** Confirme com mecânico de verdade antes de decidir.
- **O tempo inclui a demora da IA.** Cada toque leva alguns segundos de "pensar" e de ida e volta da ferramenta. Na A ainda houve ~15 s com o tropeço da placa. Uma pessoa treinada deve fazer mais rápido, mas uma pessoa com mão suja, de óculos e com o cliente falando deve fazer mais devagar. **O número de toques é a medida mais confiável.**
- **Fotos:** não usei a câmera. Gerei um PNG pequeno (320x240, cor sólida) no navegador e injetei no campo de arquivo com `DataTransfer`. Por isso 1 toque conta cada foto. No celular real são +2 toques por foto (disparar e "OK") e o tempo da câmera abrir. Upload de foto pesada no 4G também não foi medido.
- **Microfone** bloqueado no navegador interno: o ditado por voz não foi testado de verdade.
- **Teclado:** digitação simulada, sem teclado virtual na tela. O atrito 3 (letra a mais na placa) e o 13 (foco do campo) podem ser defeito da ferramenta, não do sistema.
- **Celular emulado** em 375x812 dentro do navegador do PC, não um Android simples de verdade.
- **Dados de teste:** ficaram criadas as OS #1941 e #1942 (Gol QZE7B41, sem cliente) na oficina de teste.
