#!/usr/bin/env sh
set -eu

docker compose up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:${BACKEND_PORT:-3001}/health >/dev/null; then
    printf '%s\n' 'Staging deployment is healthy.'
    exit 0
  fi
  sleep 2
done

docker compose logs
printf '%s\n' 'Staging deployment health check failed.' >&2
exit 1
