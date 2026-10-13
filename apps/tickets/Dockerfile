FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json ./

COPY apps/tickets/package.json apps/tickets/package.json
COPY libs/shared/package.json libs/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/tickets apps/tickets
COPY libs/shared libs/shared

RUN pnpm --filter @event-ticketing/shared build
RUN pnpm --filter tickets build

WORKDIR /app/apps/tickets

CMD ["node", "dist/main.js"]