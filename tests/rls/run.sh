#!/usr/bin/env bash
# Run all RLS assertions against lxp_audit_rls (build it first with ./setup.sh). Local PostgreSQL only.
# Exit status 1 if any assertion FAILs. INFO lines are reported but not counted.
set -u
cd "$(dirname "$0")"
DB=lxp_audit_rls
P=(psql -X -q -d "$DB" -v ON_ERROR_STOP=1)
psql -X -q -d postgres -Atc "select 1 from pg_database where datname='$DB'" | grep -q 1 || { echo "database $DB missing: run ./setup.sh first"; exit 2; }
"${P[@]}" -f lib.sql >/dev/null 2>&1 || { echo "lib.sql failed"; exit 2; }
"${P[@]}" -c "select rlstest.prune()" >/dev/null
OUT=$(mktemp)
for f in tests/*.sql; do
  "${P[@]}" -f "$f" 2>&1 | sed -n 's/.*NOTICE:  RLSRESULT|//p' | sed "s#^#$(basename "$f" .sql)|#" >> "$OUT"
  [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "ERROR while running $f"; "${P[@]}" -f "$f" 2>&1 | grep -m3 ERROR; exit 2; }
done
sort -t'|' -k1,1 -s "$OUT" | awk -F'|' '{printf "%-6s %-24s %s%s\n", $2, $1, $3, ($4!=""?"  :: "$4:"")}'
echo "-----"
for f in tests/*.sql; do b=$(basename "$f" .sql); printf "%-24s pass=%s fail=%s info=%s\n" "$b" "$(grep -c "^$b|PASS|" "$OUT")" "$(grep -c "^$b|FAIL|" "$OUT")" "$(grep -c "^$b|INFO|" "$OUT")"; done
PASS=$(grep -c '|PASS|' "$OUT"); FAIL=$(grep -c '|FAIL|' "$OUT"); INFO=$(grep -c '|INFO|' "$OUT")
echo "TOTAL pass=$PASS fail=$FAIL info=$INFO"
rm -f "$OUT"
[ "$FAIL" -eq 0 ]
