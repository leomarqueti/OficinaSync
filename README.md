# OficinaSync

Sistema digital de transparência e registro técnico estruturado para oficinas mecânicas.

---

## Pré-requisitos

Instala uma vez só na máquina. Depois nunca mais precisa.

| Ferramenta | Link | Observação |
|---|---|---|
| Git | git-scm.com | No Windows, instala o **Git Bash** junto |
| Node.js 20+ | nodejs.org | Baixa a versão LTS |
| Docker Desktop | docker.com/products/docker-desktop | No Windows precisa do WSL2 — o instalador pede automaticamente |

> **Windows:** Depois de instalar o Docker Desktop, reinicia o PC antes de continuar.

Para verificar se está tudo certo, abre o terminal e roda:

```bash
git --version
node --version
docker --version
docker compose version
```

Se aparecer os quatro números de versão — está pronto.

---

## Configurando o projeto

### 1. Clona o repositório

```bash
git clone https://github.com/leomarqueti/OficinaSync.git
cd OficinaSync
```

> Se já clonou antes, só atualiza:
> ```bash
> cd OficinaSync
> git pull origin main
> ```

---

### 2. Cria o arquivo `.env`

O `.env` guarda as senhas e nunca vai para o GitHub. Você cria na sua máquina.

**No Git Bash ou terminal do Mac/Linux:**
```bash
cp backend/.env.example backend/.env
```

**No PowerShell ou CMD do Windows:**
```powershell
copy backend\.env.example backend\.env
```

Abre o `backend/.env` e preenche com as senhas que o time combinou:

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=1433
DB_NAME=oficinasync
DB_USER=sa
DB_PASSWORD=SENHA_DO_TIME_AQUI

# MinIO
MINIO_USER=oficinasync
MINIO_PASSWORD=SENHA_DO_TIME_AQUI
MINIO_ENDPOINT=localhost
MINIO_PORT=9000

# JWT
JWT_SECRET=SENHA_DO_TIME_AQUI_JWT
JWT_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=development
```



---

### 3. Sobe o banco e o storage

Na **raiz do projeto** (pasta `OficinaSync`, não dentro de `backend`):

```bash
docker compose up -d
```

Na primeira vez vai demorar alguns minutos porque baixa as imagens do SQL Server e MinIO. Da próxima vez é instantâneo.

Verifica se subiu corretamente:

```bash
docker compose ps
```

Deve aparecer assim:

```
NAME                  STATUS
oficinasync-db        Up
oficinasync-storage   Up
```

Se os dois estiverem `Up` — banco e storage funcionando.

---

### 4. Cria o banco de dados

O SQL Server sobe mas não cria o banco automaticamente. Faz isso uma única vez:

**No Git Bash:**
```bash
MSYS_NO_PATHCONV=1 docker exec -it oficinasync-db /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "SENHA_DO_TIME_AQUI" \
  -No -Q "CREATE DATABASE oficinasync"
```

**No PowerShell:**
```powershell
docker exec -it oficinasync-db //opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "SENHA_DO_TIME_AQUI" -No -Q "CREATE DATABASE oficinasync"
```

> Substitui `SENHA_DO_TIME_AQUI` pela senha que está no seu `.env`.
>
> Se aparecer uma linha em branco sem erro — banco criado com sucesso.

---

### 5. Instala as dependências do backend

Entra na pasta `backend` e instala:

```bash
cd backend
npm install
```

---

### 6. Roda o backend

```bash
npm run start:dev
```

Se aparecer isso no terminal — tudo funcionando:

```
[NestFactory] Starting Nest application...
[TypeOrmCoreModule] dependencies initialized
[NestApplication] Nest application successfully started
```

A API estará disponível em `http://localhost:3000/api`.

---

## Estrutura do projeto

```
OficinaSync/
├── backend/          ← API NestJS
│   ├── src/
│   │   ├── modules/  ← módulos do sistema
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env          ← suas variáveis (nunca vai para o GitHub)
│   └── .env.example  ← modelo das variáveis (vai para o GitHub)
├── web/              ← Frontend React (em desenvolvimento)
├── mobile/           ← App React Native (em desenvolvimento)
├── iot/              ← Firmware ESP32
├── docker-compose.yml
└── README.md
```

---

## Comandos do dia a dia

```bash
# Subir banco e storage
docker compose up -d

# Parar banco e storage (dados são mantidos)
docker compose down

# Ver se os containers estão rodando
docker compose ps

# Rodar o backend em modo desenvolvimento
cd backend
npm run start:dev

# Puxar atualizações do repositório
git pull origin main
```

---

## Problemas comuns

### "Login failed for user sa"
O banco `oficinasync` não existe ainda. Roda o passo 4 acima.

### "No such file or directory" no Git Bash
Usa o `MSYS_NO_PATHCONV=1` antes do comando, ou troca para o PowerShell.

### "destination path already exists"
Você já clonou o repositório. Só entra na pasta e atualiza:
```bash
cd OficinaSync
git pull origin main
```

### "cp: command not found" no CMD do Windows
Usa `copy` ao invés de `cp`. Ou abre o Git Bash.

### Docker não inicia
Verifica se o Docker Desktop está aberto. No Windows, procura o ícone da baleia na barra de tarefas.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco de dados | SQL Server 2022 |
| Storage de mídia | MinIO |
| Frontend Web | React |
| Mobile | React Native |
| IoT / OBD | ESP32 + ELM327 |
| Autenticação | JWT + ARGON2ID |

---

## Time

Projeto TCC 
Repositório: github.com/leomarqueti/OficinaSync
