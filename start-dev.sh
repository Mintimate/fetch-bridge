#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Configure admin credentials before using /admin."
fi

if grep -Eq '^ADMIN_PASSWORD="?"?$' .env; then
  echo "ADMIN_PASSWORD is empty. Set a long local administrator password in .env before starting."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies…"
  npm install
fi

echo "Applying database migrations…"
npm run db:migrate:deploy

echo "Seeding local download route…"
npm run db:seed

echo "Starting Fetch Bridge at http://localhost:3000"
exec npm run dev
