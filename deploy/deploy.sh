#!/usr/bin/env bash
# Deploy do OficinaSync na VPS.
#
# Chamado pelo GitHub Actions via SSH (a chave de deploy só consegue rodar ESTE script —
# ver DEPLOY.md, seção 10). Também pode ser rodado à mão: sudo /opt/oficinasync/deploy/deploy.sh
#
# O que faz, nesta ordem:
#   1. recusa se já tem outro deploy rodando ou se há arquivo rastreado alterado na VPS;
#   2. backup do banco (se falhar, ABORTA sem mexer em nada);
#   3. git fetch + fast-forward da branch de produção (se não tem nada novo, termina);
#   4. docker compose up -d --build (as migrations rodam sozinhas na subida do backend);
#   5. espera o /health responder; se não responder, volta ao commit anterior e reconstrói.
#
# ATENÇÃO: o rollback desfaz o CÓDIGO, não as migrations já aplicadas ao banco. Se uma migration
# destrutiva rodou, restaure o backup indicado no log (DEPLOY.md, seção 9.4).
#
# Variáveis (todas opcionais): REPO_DIR, BACKUP_DIR, DEPLOY_BRANCH, HEALTH_URL, HEALTH_RETRIES.

set -euo pipefail

log() { echo "[deploy $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Tudo dentro de uma função chamada no fim: o bash lê o script aos poucos, e o git pull
# pode trocar este arquivo no meio da execução. Assim o corpo inteiro já foi lido antes.
main() {
  local repo_dir="${REPO_DIR:-/opt/oficinasync}"
  local backup_dir="${BACKUP_DIR:-/opt/oficinasync-backups}"
  local branch="${DEPLOY_BRANCH:-production}"
  local health_url="${HEALTH_URL:-https://api.oficinasync.com.br/health}"
  local health_retries="${HEALTH_RETRIES:-24}"
  local keep_backups=7
  local compose=(docker compose -f docker-compose.prod.yml --env-file .env.production)

  cd "$repo_dir"

  if command -v flock >/dev/null 2>&1; then
    exec 9>/tmp/oficinasync-deploy.lock
    flock -n 9 || { log "ERRO: já existe um deploy em andamento."; exit 1; }
  fi

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    log "ERRO: há arquivos rastreados alterados na VPS. Resolva antes de publicar:"
    git status --short --untracked-files=no
    exit 1
  fi

  local prev_sha
  prev_sha="$(git rev-parse HEAD)"
  log "Início. Commit atual: $prev_sha"

  # ---- backup (obrigatório) -----------------------------------------------
  mkdir -p "$backup_dir"
  local stamp backup_file
  stamp="$(date +%Y%m%d_%H%M%S)"
  backup_file="$backup_dir/oficinasync_${stamp}.bak"

  log "Backup do banco em $backup_file"
  # SC2016: o $SA_PASSWORD é do ambiente do CONTAINER, por isso as aspas simples (expande lá dentro).
  # shellcheck disable=SC2016
  "${compose[@]}" exec -T sqlserver bash -c \
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "BACKUP DATABASE [oficinasync] TO DISK = N'\''/var/opt/mssql/oficinasync_backup.bak'\'' WITH INIT, FORMAT"' \
    >/dev/null \
    || { log "ERRO: backup falhou — deploy abortado, nada foi alterado."; exit 1; }
  docker cp oficinasync-db:/var/opt/mssql/oficinasync_backup.bak "$backup_file" \
    || { log "ERRO: não consegui copiar o backup — deploy abortado, nada foi alterado."; exit 1; }

  # ---- código novo --------------------------------------------------------
  git fetch --quiet origin "$branch"
  local new_sha
  new_sha="$(git rev-parse "origin/$branch")"

  if [ "$new_sha" = "$prev_sha" ]; then
    log "Deploy dispensado: nada novo em origin/$branch ($prev_sha)."
    rotate_backups "$backup_dir" "$keep_backups"
    exit 0
  fi

  if [ "$(git rev-parse --abbrev-ref HEAD)" != "$branch" ]; then
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git checkout --quiet "$branch"
    else
      git checkout --quiet -b "$branch" --track "origin/$branch"
    fi
  fi

  log "Atualizando $prev_sha -> $new_sha"
  git merge --ff-only --quiet "origin/$branch" \
    || { log "ERRO: não deu fast-forward (a VPS divergiu do remoto). Nada foi alterado."; exit 1; }

  log "Reconstruindo containers..."
  "${compose[@]}" up -d --build

  # ---- saúde --------------------------------------------------------------
  if wait_healthy "$health_url" "$health_retries"; then
    log "OK: $health_url respondeu. Deploy concluído em $new_sha."
    rotate_backups "$backup_dir" "$keep_backups"
    exit 0
  fi

  log "ROLLBACK: o /health não respondeu. Voltando o código para $prev_sha..."
  git reset --hard --quiet "$prev_sha"
  "${compose[@]}" up -d --build
  log "ROLLBACK feito (só o código). Migrations já aplicadas NÃO foram desfeitas."
  log "Backup de antes do deploy: $backup_file (restaurar: DEPLOY.md, seção 9.4)"
  exit 1
}

wait_healthy() { # $1 = url, $2 = tentativas (5s entre elas)
  local url="$1" tries="$2" i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 5
  done
  return 1
}

rotate_backups() { # $1 = diretório, $2 = quantos manter
  local dir="$1" keep="$2" old
  # shellcheck disable=SC2012  # os nomes são só os nossos (oficinasync_AAAAMMDD_HHMMSS.bak)
  old="$(ls -1 "$dir"/oficinasync_*.bak 2>/dev/null | sort | head -n "-$keep" || true)"
  if [ -n "$old" ]; then
    # shellcheck disable=SC2086
    rm -f -- $old
  fi
}

main "$@"
