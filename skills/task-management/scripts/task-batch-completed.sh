#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# task-batch-completed.sh  –  Batch completed tasks for release notes
#
# Usage:
#   ./task-batch-completed.sh <data-source-id> [since-date]
#
# The date format is ISO 8601 (e.g. 2026-07-01). When omitted, returns all
# tasks whose Done flag is set to Done.
#
# Requires:
#   NOTION_API_TOKEN in environment
#   ntn@0.19.0 installed as a project dependency (invoked via npx --no-install)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DS_ID="${1:?Usage: task-batch-completed.sh <data-source-id> [since-date]}"
SINCE="${2:-}"

if [ -n "$SINCE" ]; then
  echo "→ Completed tasks since $SINCE"
  npx --no-install ntn datasources query "$DS_ID" \
    --filter "{\"and\":[{\"property\":\"Done\",\"status\":{\"equals\":\"Done\"}},{\"property\":\"Completed On (auto)\",\"date\":{\"on_or_after\":\"$SINCE\"}}]}" \
    --limit 100 --json
else
  echo "→ All completed tasks"
  npx --no-install ntn datasources query "$DS_ID" \
    --filter '{"property":"Done","status":{"equals":"Done"}}' \
    --limit 100 --json
fi
