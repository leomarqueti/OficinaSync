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

## Riscos conhecidos / pendências de infra

- **Backup automático**: hoje o backup do banco é manual (seção 9.1) e os volumes `sqlserver_data` /
  `minio_data` (fotos, vídeos) não têm rotina automática. Vale configurar um cron de backup + cópia pra fora
  da VPS (ex: outro servidor ou storage) quando der — protege contra perda do disco da VPS inteira.
- **Monitoramento**: o endpoint `GET /health` existe pra isso — recomendado um monitor gratuito (ex: UptimeRobot)
  batendo nele a cada minuto pra avisar por email/WhatsApp se o sistema cair.
