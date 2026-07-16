#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# task-update-status.sh  –  Update a Notion task's Status and optional Done flag
#
# Usage:
#   ./task-update-status.sh <page-id> <status> [done-status]
#
# Examples:
#   ./task-update-status.sh "abc123" "In Progress" "Not started"
#   ./task-update-status.sh "abc123" "In Review"
#   ./task-update-status.sh "abc123" "Done" "Done"
#
# Requires:
#   NOTION_API_TOKEN in environment
#   ntn@0.19.0 installed as a project dependency (invoked via npx --no-install)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PAGE_ID="${1:?Usage: task-update-status.sh <page-id> <status> [done-status]}"
STATUS="${2:?Usage: task-update-status.sh <page-id> <status> [done-status]}"
DONE="${3:-}"

umask 077
payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT HUP INT TERM

if [ -n "$DONE" ]; then
  cat > "$payload" <<JSON
{
  "properties": {
    "Status": { "status": { "name": "$STATUS" } },
    "Done": { "status": { "name": "$DONE" } }
  }
}
JSON
else
  cat > "$payload" <<JSON
{
  "properties": {
    "Status": { "status": { "name": "$STATUS" } }
  }
}
JSON
fi

echo "→ Updating page $PAGE_ID: Status = $STATUS${DONE:+, Done = $DONE}"
npx --no-install ntn api "/v1/pages/$PAGE_ID" -X PATCH --data "@$payload"

# Verify
echo "→ Verification:"
npx --no-install ntn api "/v1/pages/$PAGE_ID" -X GET | head -5
