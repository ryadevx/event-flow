#!/bin/sh

set -e

echo "==> Migrating auth..."
cd /app/apps/auth
DATABASE_URL="$AUTH_DATABASE_URL" pnpm exec drizzle-kit migrate

echo "==> Migrating events..."
cd /app/apps/events
DATABASE_URL="$EVENTS_DATABASE_URL" pnpm exec drizzle-kit migrate

echo "==> Migrating tickets..."
cd /app/apps/tickets
DATABASE_URL="$TICKETS_DATABASE_URL" pnpm exec drizzle-kit migrate

echo "==> Migrating notifications..."
cd /app/apps/notifications
DATABASE_URL="$NOTIFICATIONS_DATABASE_URL" pnpm exec drizzle-kit migrate

echo "==> All migrations completed successfully."
