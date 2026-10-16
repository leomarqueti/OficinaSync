#!/usr/bin/env bash
# Teste do deploy.sh sem tocar em servidor nenhum: usa um repositório git de mentira
# (origin bare + "VPS" clonada) e docker/curl/sleep falsos no PATH.
# Rodar: bash deploy/test-deploy.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SH="$HERE/deploy.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

FAILS=0
pass() { echo "  ok   - $1"; }
fail() { echo "  FAIL - $1"; FAILS=$((FAILS + 1)); }
assert_eq() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (esperado '$3', veio '$2')"; fi; }
assert_contains() { if grep -q -- "$3" <<<"$2"; then pass "$1"; else fail "$1 (não achei '$3')"; fi; }

# ---- binários falsos ----------------------------------------------------
mkdir -p "$T/bin"
cat >"$T/bin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
case "$*" in
  *" exec "*) [ "${FAKE_BACKUP:-ok}" = "ok" ] || exit 1 ;;
  "cp "*) for last; do :; done; : > "$last" ;;
esac
exit 0
EOF
cat >"$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_LOG"
[ "${FAKE_HEALTH:-ok}" = "ok" ]
EOF
printf '#!/usr/bin/env bash\nexit 0\n' >"$T/bin/sleep"
chmod +x "$T/bin/docker" "$T/bin/curl" "$T/bin/sleep"

export PATH="$T/bin:$PATH"
export FAKE_LOG="$T/calls.log"
: >"$FAKE_LOG"

# ---- repositório de mentira ---------------------------------------------
G=(git -c user.name=teste -c user.email=teste@teste.local)
git init -q --bare "$T/origin.git"
git clone -q "$T/origin.git" "$T/work" 2>/dev/null
(
  cd "$T/work" || exit 1
  "${G[@]}" checkout -q -b production
  echo A >app.txt && git add app.txt && "${G[@]}" commit -q -m A
  git push -q origin production
)
git clone -q -b production "$T/origin.git" "$T/vps" 2>/dev/null

new_commit() { # $1 = conteúdo
  (cd "$T/work" && echo "$1" >app.txt && git add app.txt && "${G[@]}" commit -q -m "$1" && git push -q origin production)
}
vps_head() { git -C "$T/vps" rev-parse HEAD; }
work_head() { git -C "$T/work" rev-parse HEAD; }
ups() { grep -c "up -d --build" "$FAKE_LOG"; }

run_deploy() {
  REPO_DIR="$T/vps" BACKUP_DIR="$T/backups" HEALTH_URL="http://saude.local/health" \
    DEPLOY_BRANCH=production HEALTH_RETRIES=3 bash "$DEPLOY_SH" 2>&1
}

# ---- 1. sucesso ---------------------------------------------------------
echo "1) deploy com saúde ok"
new_commit B
OUT="$(FAKE_HEALTH=ok run_deploy)"; CODE=$?
assert_eq "sai com 0" "$CODE" "0"
assert_eq "VPS foi pro commit novo" "$(vps_head)" "$(work_head)"
assert_eq "subiu os containers 1x" "$(ups)" "1"
assert_eq "gerou 1 backup" "$(find "$T/backups" -name '*.bak' 2>/dev/null | wc -l | tr -d ' ')" "1"

# ---- 2. saúde falha → rollback -------------------------------------------
echo "2) saúde falha: volta pro commit anterior"
GOOD="$(vps_head)"
new_commit C
OUT="$(FAKE_HEALTH=fail run_deploy)"; CODE=$?
assert_eq "sai com erro" "$([ "$CODE" -ne 0 ] && echo yes || echo no)" "yes"
assert_eq "VPS voltou pro commit bom" "$(vps_head)" "$GOOD"
assert_eq "rebuildou no rollback (3 'up' no total)" "$(ups)" "3"
assert_contains "avisa do rollback" "$OUT" "ROLLBACK"
assert_contains "diz onde está o backup" "$OUT" "$T/backups"

# ---- 3. nada novo --------------------------------------------------------
echo "3) nada novo no remoto"
git -C "$T/work" reset -q --hard "$GOOD" && git -C "$T/work" push -q -f origin production
BEFORE="$(ups)"
OUT="$(FAKE_HEALTH=ok run_deploy)"; CODE=$?
assert_eq "sai com 0" "$CODE" "0"
assert_eq "não rebuilda" "$(ups)" "$BEFORE"
assert_contains "informa que não há nada novo" "$OUT" "nada novo"

# ---- 4. árvore suja ------------------------------------------------------
echo "4) arquivo rastreado alterado na VPS"
new_commit D
echo sujeira >>"$T/vps/app.txt"
BEFORE="$(ups)"; HEAD_BEFORE="$(vps_head)"
OUT="$(FAKE_HEALTH=ok run_deploy)"; CODE=$?
assert_eq "recusa (erro)" "$([ "$CODE" -ne 0 ] && echo yes || echo no)" "yes"
assert_eq "não mexeu no commit" "$(vps_head)" "$HEAD_BEFORE"
assert_eq "não rebuildou" "$(ups)" "$BEFORE"
git -C "$T/vps" checkout -q -- app.txt

# ---- 5. backup falha → aborta antes de mexer em qualquer coisa ------------
echo "5) backup falha"
BEFORE="$(ups)"; HEAD_BEFORE="$(vps_head)"
OUT="$(FAKE_BACKUP=fail FAKE_HEALTH=ok run_deploy)"; CODE=$?
assert_eq "aborta (erro)" "$([ "$CODE" -ne 0 ] && echo yes || echo no)" "yes"
assert_eq "não mexeu no commit" "$(vps_head)" "$HEAD_BEFORE"
assert_eq "não rebuildou" "$(ups)" "$BEFORE"

# ---- 6. rotação de backups -----------------------------------------------
echo "6) mantém só os 7 backups mais recentes"
mkdir -p "$T/backups"
for i in 01 02 03 04 05 06 07 08 09; do : >"$T/backups/oficinasync_2020${i}01_000000.bak"; done
OUT="$(FAKE_HEALTH=ok run_deploy)"; CODE=$?
assert_eq "sai com 0" "$CODE" "0"
assert_eq "sobraram 7" "$(find "$T/backups" -name '*.bak' | wc -l | tr -d ' ')" "7"
assert_eq "o mais antigo foi removido" "$([ -e "$T/backups/oficinasync_20200101_000000.bak" ] && echo existe || echo removido)" "removido"

echo
if [ "$FAILS" -eq 0 ]; then echo "TUDO OK"; else echo "$FAILS falha(s)"; exit 1; fi
