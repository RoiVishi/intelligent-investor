#!/usr/bin/env sh
set -eu

docker compose exec db psql \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-investor_db}"
