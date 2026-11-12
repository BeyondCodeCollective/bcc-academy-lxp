#!/usr/bin/env bash
# Rebuild the scratch database lxp_audit_rls from scratch. Local PostgreSQL only.
# Touches ONLY database lxp_audit_rls (drop+create) and creates missing Supabase roles via the shim.
set -u
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
MIG="$ROOT/supabase/migrations"
DB=lxp_audit_rls
LOG="${RLS_SETUP_LOG:-/tmp/lxp_rls_setup_$$.log}"
: > "$LOG"
PSQL_ADMIN=(psql -X -q -d postgres -v ON_ERROR_STOP=1)
PSQL=(psql -X -q -d "$DB" -v ON_ERROR_STOP=1)

# Migrations that are NOT replayable. Format: "filename|reason".
SKIP=(
  "_audit_probe.sql|read-only probe query for the Supabase SQL editor, not a migration"
  "_catch_up.sql|hand-written consolidation of all other files; replaying it would only duplicate them"
)

"${PSQL_ADMIN[@]}" -c "drop database if exists $DB with (force)" -c "create database $DB"
"${PSQL[@]}" -c "alter database $DB set search_path = public, extensions"
"${PSQL[@]}" -f 00-supabase-shim.sql || { echo "SHIM FAILED"; exit 2; }
"${PSQL[@]}" -f 01-baseline.sql || { echo "BASELINE FAILED"; exit 2; }

# Streamed in-memory patches (the repo file is never modified). Format "filename|sed expression|reason".
PATCH=(
  "announcements.sql|s/^  where expires_at > now();/;/|index predicate uses now(), which PostgreSQL rejects (not IMMUTABLE); this migration cannot have applied as written, so production's announcements table was created some other way. Partial index dropped here so the table and its policies still load"
)
apply_file() { # apply_file <filename> : psql one transaction, patched if listed
  local f="$1" s expr
  for s in "${PATCH[@]}"; do
    if [ "${s%%|*}" = "$f" ]; then expr=$(printf '%s' "$s" | cut -d'|' -f2); sed "$expr" "$MIG/$f" | "${PSQL[@]}" -1 -f - 2>&1; return; fi
  done
  "${PSQL[@]}" -1 -f "$MIG/$f" 2>&1
}
skip_reason() { local f="$1" s; for s in "${SKIP[@]}"; do [ "${s%%|*}" = "$f" ] && { echo "${s#*|}"; return 0; }; done; return 1; }

# Most migration filenames have no timestamp prefix, so filename order is NOT the authoring order.
# Strategy: git first-add order, then re-try failures until a pass makes no progress.
pending=(); applied=(); skipped=()
# Order: first-commit order from git history (the real authoring order), then any untracked file by name.
ORDERED=$( { git -C "$ROOT" log --diff-filter=A --reverse --format= --name-only -- supabase/migrations | grep '\.sql$' | sed 's#.*/##'; ls "$MIG" | grep '\.sql$'; } | awk '!s[$0]++' )
for f in $ORDERED; do
  [ -f "$MIG/$f" ] || continue
  if r=$(skip_reason "$f"); then skipped+=("$f|$r"); else pending+=("$f"); fi
done
total=${#pending[@]}
pass=1
ERRDIR=$(mktemp -d)
while [ ${#pending[@]} -gt 0 ]; do
  next=(); progress=0
  for f in "${pending[@]}"; do
    if out=$(apply_file "$f"); then
      applied+=("$f(pass$pass)"); progress=1
    else
      printf '%s\n' "$out" | grep -m1 -E "ERROR" | cut -c1-200 > "$ERRDIR/$f.err"
      next+=("$f")
    fi
  done
  pending=("${next[@]+"${next[@]}"}")
  [ $progress -eq 0 ] && break
  pass=$((pass+1))
done
"${PSQL[@]}" -f seed.sql || { echo "SEED FAILED"; exit 2; }
{
  echo "MIGRATIONS total_considered=$total applied=${#applied[@]} failed=${#pending[@]} skipped_explicit=${#skipped[@]}"
  for s in "${skipped[@]+"${skipped[@]}"}"; do echo "SKIPPED $s"; done
  for s in "${PATCH[@]}"; do echo "PATCHED ${s%%|*} | ${s##*|}"; done
  for f in "${pending[@]+"${pending[@]}"}"; do echo "FAILED  $f | $(cat "$ERRDIR/$f.err")"; done
  for a in "${applied[@]}"; do case "$a" in *"(pass1)") ;; *) echo "APPLIED_LATE $a";; esac; done
} | tee "$LOG"
echo "setup log: $LOG"
[ ${#pending[@]} -eq 0 ]
