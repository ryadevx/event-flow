FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json ./

COPY apps/notifications/package.json apps/notifications/package.json
COPY libs/shared/package.json libs/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/notifications apps/notifications
COPY libs/shared libs/shared

RUN pnpm --filter @event-ticketing/shared build
RUN pnpm --filter notifications build

WORKDIR /app/apps/notifications

CMD ["node", "dist/src/main.js"]
