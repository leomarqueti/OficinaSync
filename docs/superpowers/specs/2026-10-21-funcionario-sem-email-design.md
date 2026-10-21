# Funcionário sem e-mail: convite pelo WhatsApp + PIN

Aprovado pelo Leonardo em 2026-10-21. Nas palavras dele: "mais prático assim, quase todo mundo tem WhatsApp, se você me disser que é seguro, bora".

## Por quê

Hoje o convite de funcionário **exige e-mail**: `POST /invites` com e-mail, link mandado pelo Resend e senha forte.

O caso real: o dono contrata o Toninho, 56 anos, sem e-mail. Criar um e-mail pra ele é barreira, e o pessoal desiste. Mas o sistema vai ser vendido pra outras oficinas, então o jeito novo precisa ser seguro desde já.

## Objetivo

O dono cadastra o funcionário com **nome, celular e cargo**. O sistema gera um **link de convite** e o dono manda pelo WhatsApp (`wa.me`), mostra o QR na tela ou copia o link.

O funcionário abre o link, escolhe um **PIN de 6 números** e já entra. Dali em diante entra com **celular + PIN**.

O e-mail continua existindo e vira **opcional** pra funcionário. O dono continua entrando com e-mail e senha.

## Anti-objetivos
- PIN fraco que se adivinha (123456, 000000, 111111…).
- Dar pra tentar PIN sem limite.
- Link de convite que vale pra sempre, ou que vale mais de uma vez.
- Funcionário que saiu continuar entrando.
- SMS pago ou API paga de WhatsApp. É só o link `wa.me`, sem custo.

## Decisões

### Cadastro (dono)
- **Equipe → "Adicionar funcionário":** nome, celular (o `PhoneField`, que já gera E.164) e cargo (mecânico ou recepção). O e-mail é opcional.
- Só o **dono** cadastra, como já é hoje no convite.
- O sistema cria o **convite**: token `randomBytes(32).hex`, **uso único**, **expira em 24 h**, ligado à oficina e ao celular.
- **A tela mostra:**
  - "Mandar no WhatsApp", que abre `wa.me/<celular>` com a mensagem e o link;
  - um **QR code** com o mesmo link (pra quem está do lado);
  - "Copiar link".
- O convite antigo por e-mail continua funcionando. Se o dono preencher o e-mail, também dá pra mandar por e-mail.

### Aceitar (funcionário)
- `/convite?token=` mostra a oficina, o nome e o cargo. O funcionário escolhe e confirma o **PIN de 6 dígitos**.
- **PIN fraco é recusado:** todos os dígitos iguais, sequência crescente ou decrescente (123456, 654321), e os comuns (121212, 112233…).
  - A tela explica o porquê em uma linha.
- Ao aceitar, o usuário nasce ativo, na oficina e no cargo do convite, e já entra logado (como o convite de hoje).
- O PIN é guardado com o **mesmo Argon2id + pepper** da senha, nunca em texto.

### Entrar (todo dia)
- A tela de login ganha a aba **"Entrar com celular"** (celular + PIN, teclado numérico), além de "Entrar com e-mail".
  - A aba escolhida fica lembrada no aparelho.
- **Proteção contra chute:**
  - **5 PINs errados seguidos travam aquela conta por 15 minutos**, contados no servidor, por conta. A mensagem diz "Muitas tentativas. Tente de novo às 14:35 ou peça um novo acesso ao dono.";
  - o login por PIN tem o mesmo limite por IP do login atual (5 por minuto);
  - a resposta de erro é a mesma pra "celular não existe" e "PIN errado", pra não revelar quem tem conta.
- **Celular único** entre os usuários do sistema. Um funcionário em duas oficinas fica pra depois.
- O token de acesso segue o `JWT_EXPIRES_IN` atual (1 dia). "Lembrar o aparelho por 30 dias" fica pra depois.

### Esqueceu o PIN / saiu da oficina
- **Equipe → funcionário → "Novo acesso":**
  - gera um novo link de uso único (24 h) pelo mesmo caminho do convite (WhatsApp/QR/copiar);
  - abrir o link pede um PIN novo e **invalida o antigo**.
- **Equipe → funcionário → "Desativar acesso"** (não existe hoje):
  - o usuário fica inativo e não entra mais, nem por PIN nem por e-mail;
  - os registros dele (OS, autoria) continuam com o nome dele;
  - "Reativar" desfaz.
  - **Quem já estava logado também perde o acesso:** o guard confere o `is_active` a cada requisição, ou há outro mecanismo equivalente. Isso fica com o builder, mas é obrigatório.
- Só o dono faz isso, e nunca consigo mesmo (o dono não se desativa).

### Por que é seguro (pra explicar ao Leonardo e a quem comprar)
- **O link é a chave de entrada,** e só serve uma vez, por 24 h. Quem chega nele é quem recebeu no WhatsApp do próprio dono.
- **6 dígitos são 1 milhão de combinações.** Com a trava de 5 tentativas a cada 15 minutos, chutar levaria **anos**, e os PINs óbvios são proibidos.
- **O PIN é guardado embaralhado** (Argon2id + pepper), como as senhas: nem quem tem o banco vê o PIN.
- **Funcionário que sai é desativado na hora,** e o dono não depende de e-mail pra dar ou tirar acesso.
- **Tudo é isolado por oficina,** como o resto do sistema.

## Restrições
- `users.email` passa a aceitar vazio, e entra `users.phone` (E.164).
  - **Gotcha do SQL Server:** índice único em coluna que aceita NULL só permite **um** NULL. Os índices únicos de e-mail e de celular precisam ser **filtrados** (`WHERE email IS NOT NULL`).
- A migration é escrita e conferida. Ninguém existente muda.
- Tudo que hoje lê `user.email` precisa aguentar e-mail vazio: `/users/me`, a equipe, o e-mail de recuperação de senha (que só vale pra quem tem e-mail) e o convite.
- DTO com decorator em todo campo.
- Testes:
  - e2e no backend: convite por celular, aceitar, PIN fraco recusado, trava após 5 erros, mesma mensagem pra celular inexistente, desativar corta o acesso (inclusive o token já emitido), outra oficina → 403;
  - testes de tela do fluxo inteiro.

## Fica pro builder
- O formato exato das rotas (`POST /invites` aceitando celular ou uma rota nova; `POST /auth/pin-login`).
- Onde guardar as tentativas e a trava.
- A biblioteca do QR no frontend (o backend já usa `qrcode`).

## Depois
- "Lembrar este aparelho por 30 dias".
- Um funcionário em mais de uma oficina.
- Trocar o PIN logado (Configurações).
