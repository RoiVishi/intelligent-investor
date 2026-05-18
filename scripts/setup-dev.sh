#!/usr/bin/env sh
set -eu

docker compose up -d --build

until curl -fsS http://localhost:3001/health >/dev/null; do
  sleep 2
done

printf '%s\n' 'Development environment is ready.'
printf '%s\n' 'Frontend: http://localhost:8080'
printf '%s\n' 'Backend health: http://localhost:3001/health'
