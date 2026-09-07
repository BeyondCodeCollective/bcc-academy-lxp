#!/usr/bin/env bash
# Sign in as the FDE test learner and open the session stage — no copy-paste.
#
# Magic-link URLs are ~200 characters and a one-time token: pasted out of a
# terminal they pick up line breaks and silently fail, which reads as "page
# not found". So mint the link and hand it straight to the browser instead.
#
#   ./scripts/fde-open.sh            → the session stage
#   ./scripts/fde-open.sh 1          → the normal week page
#   PORT=3000 ./scripts/fde-open.sh  → a dev server on another port
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3011}"
DEST="${1:-live}"
NEXT="/dashboard/track/forward-deploy/1"
[ "$DEST" = "live" ] && NEXT="$NEXT/live"

URL=$(PORT="$PORT" node scripts/make-fde-test-student.mjs \
  | python3 -c "import sys,json,urllib.parse as u; d=json.load(sys.stdin); \
print(d['url'].split('&next=')[0] + '&next=' + u.quote('$NEXT', safe=''))")

printf '%s\n' "$URL" | pbcopy 2>/dev/null || true
echo "→ opening $NEXT (link also copied to clipboard)"
open "$URL"
