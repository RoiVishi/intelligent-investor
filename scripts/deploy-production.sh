#!/usr/bin/env sh
set -eu

if [ "${NODE_ENV:-production}" != "production" ]; then
  printf '%s\n' 'NODE_ENV must be production for production deployment.' >&2
  exit 1
fi

docker compose up -d --build

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:${BACKEND_PORT:-3001}/health >/dev/null; then
    printf '%s\n' 'Production deployment is healthy.'
    exit 0
  fi
  sleep 2
done

docker compose logs
printf '%s\n' 'Production deployment health check failed.' >&2
exit 1
