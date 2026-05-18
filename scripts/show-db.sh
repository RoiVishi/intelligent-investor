#!/usr/bin/env sh
set -eu

docker compose exec -T db psql \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-investor_db}" \
  -c "\\dt" \
  -c "SELECT * FROM financial_profiles ORDER BY id;" \
  -c "SELECT * FROM spending_plans ORDER BY id;"
