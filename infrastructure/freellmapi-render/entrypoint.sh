#!/bin/sh
# Restore the SQLite DB from R2 if a replica exists (first boot skips this and
# starts fresh), then run FreeLLMAPI while Litestream replicates live changes.
set -e

DB_PATH="/app/server/data/freeapi.db"

echo "[entrypoint] Restoring database from replica (if any)…"
litestream restore -if-db-not-exists -if-replica-exists "$DB_PATH" || \
  echo "[entrypoint] No replica to restore (first run) — continuing."

echo "[entrypoint] Starting FreeLLMAPI under Litestream replication…"
exec litestream replicate -exec "node /app/server/dist/index.js"
