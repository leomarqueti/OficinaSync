# Deploy do OficinaSync em produção

Passo a passo pra colocar o sistema no ar numa VPS, acessível de fora (celular do cliente, oficina, onde for).

## 0. Recuperar acesso ao domínio `oficinasync.com.br`

Domínios `.com.br` são registrados via [registro.br](https://registro.br), direto ou por um revendedor
(Hostinger, KingHost, Locaweb, GoDaddy etc.). Pra descobrir onde está o seu:

1. Entre em [registro.br](https://registro.br) → "Consultar Domínio" → digite `oficinasync.com.br`. A página mostra
   o status e, às vezes, o e-mail de contato do registrante (mascarado).
2. Procure no seu e-mail por mensagens de "registro.br", "NIC.br" ou o nome do revendedor que você usou na época
   (busque por "oficinasync" ou "domínio" na caixa de entrada).
3. Se não achar nada, o registro.br tem um fluxo de recuperação de senha pra quem é o titular do domínio
   (precisa do CPF/CNPJ usado no registro).

Isso é algo que só você consegue fazer (acesso à sua conta/e-mail). Quando tiver acesso, você vai precisar criar
2 registros DNS tipo **A** apontando pro IP da VPS (passo 2 explica isso).

## 1. Criar a VPS

Recomendado: [Hetzner Cloud](https://www.hetzner.com/cloud) (mais barato) ou [DigitalOcean](https://www.digitalocean.com/).

- Plano: o menor com **2 vCPU / 4GB RAM** (o SQL Server sozinho já pede pelo menos 2GB). Na Hetzner isso é o
  plano CX22, ~€4-5/mês (~R$25-30).
- Imagem: **Ubuntu 22.04 ou 24.04 LTS**.
- Anote o **IP público** da VPS assim que ela for criada.

## 2. Apontar o domínio pra VPS

No painel de DNS do seu domínio (registro.br ou o revendedor), crie 2 registros:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` (ou `oficinasync.com.br`) | IP da VPS |
| A | `api` (vira `api.oficinasync.com.br`) | IP da VPS |
| A | `storage` (vira `storage.oficinasync.com.br`) | IP da VPS |

O subdomínio `storage` serve as fotos/vídeos do MinIO — sem ele, as mídias não carregam no navegador
(as URLs assinadas são geradas contra esse endereço público, ver `MINIO_PUBLIC_URL`).

Propagação de DNS pode levar de alguns minutos a algumas horas.

## 3. Instalar Docker na VPS

Conecte via SSH (`ssh root@<IP-da-VPS>`) e rode:

```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Copiar o projeto pra VPS

Na sua máquina, dentro da pasta do projeto:

```bash
git init  # se ainda não for um repositório git com remoto
git add -A && git commit -m "deploy inicial"
```

Na VPS:

```bash
git clone <url-do-seu-repositorio> /opt/oficinasync
cd /opt/oficinasync
```

(Se você ainda não colocou o projeto no GitHub/GitLab, dá pra copiar via `scp -r` também — me avisa que eu ajudo
com esse passo na hora.)

## 5. Preencher as variáveis de ambiente

Na VPS, dentro de `/opt/oficinasync`:

```bash
cp .env.production.example .env.production
cp backend/.env.production.example backend/.env.production
```

Edite os dois arquivos (`nano .env.production` e `nano backend/.env.production`):

- **`DOMAIN`** → `oficinasync.com.br`
- **Senhas do banco e do MinIO** → gere valores novos e fortes (nunca reaproveite as senhas do `backend/.env` de
  desenvolvimento). Dica: `openssl rand -hex 24` gera uma senha aleatória.
- **`PASSWORD_PEPPER`** e **`JWT_SECRET`** → gere valores novos também (`openssl rand -hex 32`), nunca reaproveite
  os de desenvolvimento.
- Os valores de usuário/senha do MinIO precisam ser **idênticos** nos dois arquivos (`.env.production` na raiz e
  `backend/.env.production`).
- **`RESEND_KEY`** → pode reaproveitar a mesma chave de desenvolvimento se for a mesma conta Resend.

## 6. Subir os containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Isso builda as imagens (backend, proxy+frontend) e sobe tudo: SQL Server, MinIO, backend, e o proxy Caddy
(que cuida do HTTPS automático via Let's Encrypt).

Acompanhe os logs até o backend conectar no banco:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

## 7. Conferir se está no ar

- `https://oficinasync.com.br` → deve carregar a tela de login
- `https://api.oficinasync.com.br/service_orders/public/teste-qualquer` → deve responder `404` com JSON
  (confirma que o backend está respondendo através do proxy)

## 8. Criar o bucket no MinIO (primeira vez)

O `MinioService` cria o bucket sozinho quando o backend sobe (`OnModuleInit`), então normalmente não precisa
fazer nada aqui — só confirme que não apareceu erro relacionado a bucket nos logs do backend.

---

## 9. Atualizar produção (deploy de nova versão)

Sempre que houver código novo no GitHub, o deploy é entrar na VPS e rodar `git pull` + rebuild. **Antes de
qualquer deploy que mexa no banco (migration nova), faça o backup primeiro** — leva 30 segundos e é a sua
rede de segurança.

Entrar na VPS (o domínio resolve pro IP, então serve pra SSH também):

```bash
ssh root@oficinasync.com.br
cd /opt/oficinasync
```

### 9.1. Backup do banco (faça antes de deploys com migration)

Gera o `.bak` dentro do container e copia pro disco da VPS. Usa a senha de dentro do próprio container
(`$SA_PASSWORD`), você não digita nada:

```bash
# gera o backup dentro do container
docker compose -f docker-compose.prod.yml exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "BACKUP DATABASE [oficinasync] TO DISK = N'\''/var/opt/mssql/oficinasync_backup.bak'\'' WITH INIT, FORMAT"'

# copia o .bak pra fora do container (pro disco da VPS, com a data no nome)
docker cp oficinasync-db:/var/opt/mssql/oficinasync_backup.bak /opt/oficinasync/oficinasync_backup_$(date +%Y%m%d).bak
ls -lh /opt/oficinasync/oficinasync_backup_*.bak
```

### 9.2. Deploy

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O backend roda as migrations pendentes sozinho na subida (`migrationsRun: true`). Num banco que já existe, a
migration inicial não recria nada — só se registra (ver "Migrations do TypeORM" no `CLAUDE.md`).

### 9.3. Conferir que deu certo

```bash
# 1. migrations aplicadas (IMPORTANTE: o -d oficinasync aponta pro banco certo; sem ele, o sqlcmd cai no 'master' e dá "Invalid object name")
docker compose -f docker-compose.prod.yml exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -d oficinasync -Q "SELECT name FROM migrations"'

# 2. dados no lugar
docker compose -f docker-compose.prod.yml exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -d oficinasync -Q "SELECT COUNT(*) AS clientes FROM clients; SELECT COUNT(*) AS ordens FROM service_orders"'

# 3. app no ar
curl -s https://api.oficinasync.com.br/health
```

### 9.4. Restaurar o backup (só se algo der muito errado)

Precisa de acesso exclusivo ao banco, então derruba as conexões primeiro. **Só use em emergência** — sobrescreve
o banco atual pelo do `.bak`:

```bash
# copia o .bak de volta pra dentro do container (ajuste a data do arquivo)
docker cp /opt/oficinasync/oficinasync_backup_AAAAMMDD.bak oficinasync-db:/var/opt/mssql/restore.bak

docker compose -f docker-compose.prod.yml exec sqlserver bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "ALTER DATABASE [oficinasync] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [oficinasync] FROM DISK = N'\''/var/opt/mssql/restore.bak'\'' WITH REPLACE; ALTER DATABASE [oficinasync] SET MULTI_USER"'

# reinicia o backend pra reconectar
docker compose -f docker-compose.prod.yml restart backend
```

---

## 10. Deploy automático (GitHub Actions)

Em vez de entrar na VPS e rodar `git pull` + `docker compose up` (seção 9), o GitHub faz isso sozinho
**quando você empurra pra branch `production`**. Push na `main` não publica nada.

**Fluxo do dia a dia** (na sua máquina, com a `main` já testada e commitada):

```bash
git push origin main:production
```

O GitHub então: (1) sobe SQL Server e MinIO de teste e roda os testes unitários, os e2e (incluindo o
teste de isolamento entre oficinas) e os builds; (2) se tudo passar, conecta na VPS e roda
`deploy/deploy.sh`, que faz **backup do banco → atualiza o código → reconstrói os containers →
confere o `/health`**. Se o `/health` não responder, volta o código ao commit anterior e a execução
fica vermelha (você recebe e-mail do GitHub). Acompanhe em *Actions* no repositório.

> O rollback desfaz só o **código**. Migrations já aplicadas ao banco não são desfeitas — nesse caso
> restaure o backup indicado no log (seção 9.4). Os 7 últimos backups ficam em `/opt/oficinasync-backups`.

### 10.1. Configuração (uma vez só)

**a) Chave de deploy, só pra isso.** Na sua máquina (não na VPS):

```bash
ssh-keygen -t ed25519 -f oficinasync-deploy -C "github-deploy" -N ""
```

Isso cria `oficinasync-deploy` (privada) e `oficinasync-deploy.pub` (pública). **Nunca** commite nem
reaproveite essa chave pra outra coisa.

**b) Na VPS, autorizar a chave com comando forçado** — ela só consegue rodar o `deploy.sh`, nada mais
(sem shell, sem copiar arquivo, sem túnel). Edite `/root/.ssh/authorized_keys` e acrescente **uma linha**
(troque o final pelo conteúdo do `oficinasync-deploy.pub`):

```
command="/opt/oficinasync/deploy/deploy.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA... github-deploy
```

**c) Na VPS, passar a usar a branch `production`** (o `deploy.sh` faz isso sozinho no primeiro deploy,
mas o arquivo precisa existir antes): `cd /opt/oficinasync && git fetch && git checkout production`
(depois de você ter feito o primeiro `git push origin main:production`). Confira com
`git status` que **não há arquivos rastreados alterados** — o script recusa publicar se houver.

**d) No GitHub** (*Settings → Secrets and variables → Actions → New repository secret*), crie 4 segredos:

| Nome | Valor |
|---|---|
| `VPS_HOST` | `oficinasync.com.br` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | o conteúdo **inteiro** do arquivo `oficinasync-deploy` (a chave privada) |
| `VPS_KNOWN_HOSTS` | saída de `ssh-keyscan -t ed25519 oficinasync.com.br` (a identidade da VPS, pra ninguém se passar por ela) |

Depois apague a chave privada da sua máquina (ela já está no GitHub).

**e) Proteja a branch** (recomendado): *Settings → Branches → Add rule* em `production` exigindo que o
check **"Testes e builds"** passe, e sem force-push.

### 10.2. Rodar à mão / emergência

- Republicar sem novo commit: *Actions → Testar e publicar → Run workflow* (branch `production`).
- Na VPS, direto: `sudo /opt/oficinasync/deploy/deploy.sh` (mesmo comportamento, com o mesmo backup e rollback).
- Testar o próprio `deploy.sh` sem servidor: `bash deploy/test-deploy.sh` (usa `docker` e `curl` falsos).

### 10.3. Primeiro deploy da versão com segurança + dados internos (checklist)

O código dessa versão já está na branch `production` (empurrada de `main`). O GitHub roda os testes; para o
passo de **publicar** funcionar, falta só o que depende de acesso à VPS e ao painel do GitHub:

1. **VPS — chave de deploy** (10.1 a/b): gerar a chave, acrescentar a linha com `command="/opt/oficinasync/deploy/deploy.sh",...` no `authorized_keys`.
2. **VPS — variáveis novas** em `/opt/oficinasync/.env.production` e `/opt/oficinasync/backend/.env.production`
   (sem elas o site publica mas quebra em silêncio): `CORS_ORIGINS=https://oficinasync.com.br`, `FRONTEND_URL=https://oficinasync.com.br`,
   `BACKEND_URL=https://api.oficinasync.com.br`, `JWT_EXPIRES_IN=1d`, `PROMO_VIDEO_ENABLED=false`, `TENANT_STORAGE_QUOTA_MB=2048`.
   Se o segredo `JWT_SECRET`/`PASSWORD_PEPPER` de produção nunca foi trocado desde março, troque o `JWT_SECRET`
   (isso desloga todo mundo; **não** troque o `PASSWORD_PEPPER`: invalida todas as senhas).
3. **VPS — checkout** (10.1 c): `cd /opt/oficinasync && git fetch && git checkout production` e `git status` limpo.
   A partir desta versão o `deploy.sh` reconstrói os containers mesmo que a VPS já esteja no commit certo
   (marcador `.last_deployed_sha`), então esse checkout não "pula" o primeiro deploy.
4. **GitHub — 4 segredos** (10.1 d). Depois: *Actions → Testar e publicar → Re-run* (ou novo `git push origin main:production`).
5. **Conferir**: `https://api.oficinasync.com.br/health` → 200; abrir uma OS; abrir o link do cliente; baixar um laudo PDF.
6. **Migrations deste release** (rodam sozinhas na subida; o backup é feito antes): `PartialClientAndCarData`
   (relaxa NOT NULL de cliente/carro) e `InternalOrderData` (3 tabelas novas + 2 colunas em `service_orders`);
   a do OBD também, se a produção ainda não a tiver. Nenhuma apaga dado.
7. **Depois do deploy**: olhar a tabela `users` por cadastros estranhos desde julho (a versão antiga aceitava cadastro com
   campos que não deviam) e configurar o backup agendado + cópia fora da VPS (`docs/equipe/lancamento-publico/03-devops-operacao.md`).

---

## Riscos conhecidos / pendências de infra

- **Backup automático**: hoje o backup do banco é manual (seção 9.1) e os volumes `sqlserver_data` /
  `minio_data` (fotos, vídeos) não têm rotina automática. Vale configurar um cron de backup + cópia pra fora
  da VPS (ex: outro servidor ou storage) quando der — protege contra perda do disco da VPS inteira.
- **Monitoramento**: o endpoint `GET /health` existe pra isso — recomendado um monitor gratuito (ex: UptimeRobot)
  batendo nele a cada minuto pra avisar por email/WhatsApp se o sistema cair.
