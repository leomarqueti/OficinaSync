#!/usr/bin/env bash
# Para o ambiente de TESTE (backend 3100 e frontend 5183). Não mexe em nada nas portas 3000/5173 (dia a dia).
for port in 3100 5183; do
  powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force; Write-Output ('parado: porta $port (pid ' + \$_.OwningProcess + ')') }"
done
rm -f "$(dirname "${BASH_SOURCE[0]}")/../.persona-env.json"
echo "ambiente de teste parado."
