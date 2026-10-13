FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json ./

COPY apps/events/package.json apps/events/package.json
COPY libs/shared/package.json libs/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/events apps/events
COPY libs/shared libs/shared

RUN pnpm --filter @event-ticketing/shared build
RUN pnpm --filter events build

WORKDIR /app/apps/events

CMD ["node", "dist/main.js"]