#!/bin/zsh

set -e

ROOT="/Users/alex/Projects/GitHub/PeorCaso"

cd "$ROOT"

echo "Preparing local D1 database..."
npx wrangler d1 execute peorcaso-db --local --file=schema.sql

if [ -s "seed.sql" ]; then
  echo "Loading seed data..."
  npx wrangler d1 execute peorcaso-db --local --file=seed.sql
fi

echo "Starting Wrangler Pages on http://localhost:8788"
exec npx wrangler pages dev .
