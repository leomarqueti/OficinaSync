#!/usr/bin/env bash
# Sobe o ambiente de TESTE (nunca produção) para os mecânicos simulados e para testes manuais:
#   - backend compilado (backend/dist) na porta 3100, ligado ao banco de TESTE (oficinasync_test)
#   - frontend em modo dev na porta 5183 apontando pro backend de teste
#   - uma oficina + dono NOVOS (credenciais em ui-tests/.persona-env.json)
# Pré-requisito: Docker com os containers oficinasync-db e oficinasync-storage no ar.
# Parar: bash ui-tests/scripts/stop-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BACKEND_PORT=3100
FRONTEND_PORT=5183

docker info >/dev/null 2>&1 || { echo "ERRO: Docker não está no ar. Abra o Docker Desktop."; exit 1; }
for c in oficinasync-db oficinasync-storage; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" != "true" ]; then
    echo "ERRO: container $c parado. Rode: docker start $c"
    exit 1
  fi
done

port_busy() { netstat -ano | grep -E ":$1 .*LISTENING" >/dev/null 2>&1; }
for p in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if port_busy "$p"; then
    echo "ERRO: a porta $p já está em uso. Rode antes: bash ui-tests/scripts/stop-env.sh"
    exit 1
  fi
done

[ -f backend/dist/main.js ] || { echo "Compilando o backend..."; (cd backend && npm run build >/dev/null); }

echo "Criando oficina e dono de teste..."
SEED_OUT="$(cd backend && npx ts-node -r tsconfig-paths/register test/ui-seed.ts)"
echo "$SEED_OUT" | grep '^UI_SEED ' | sed 's/^UI_SEED //' > ui-tests/.persona-env.json
[ -s ui-tests/.persona-env.json ] || { echo "ERRO: o seed não devolveu credenciais."; exit 1; }

echo "Subindo o backend (porta $BACKEND_PORT)..."
(cd backend && PORT="$BACKEND_PORT" DB_NAME=oficinasync_test MINIO_BUCKET=oficinasync-test \
  CORS_ORIGINS="http://localhost:$FRONTEND_PORT" nohup node dist/main.js >"$ROOT/ui-tests/.backend.log" 2>&1 &)

echo "Subindo o frontend (porta $FRONTEND_PORT)..."
(cd frontend/oficinasync-web && VITE_API_URL="http://localhost:$BACKEND_PORT" \
  nohup npm run dev -- --port "$FRONTEND_PORT" --strictPort >"$ROOT/ui-tests/.frontend.log" 2>&1 &)

wait_for() { # $1 = url, $2 = nome
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 3 "$1" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  echo "ERRO: $2 não respondeu em $1 (veja ui-tests/.backend.log / .frontend.log)"
  return 1
}
wait_for "http://localhost:$BACKEND_PORT/health" "backend"
wait_for "http://localhost:$FRONTEND_PORT" "frontend"

echo
echo "Ambiente de TESTE no ar:"
echo "  site:        http://localhost:$FRONTEND_PORT"
echo "  api:         http://localhost:$BACKEND_PORT"
echo "  credenciais: ui-tests/.persona-env.json (email, password, tenantName)"
echo "  parar:       bash ui-tests/scripts/stop-env.sh"
