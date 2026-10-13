FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json ./

COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY libs/shared/package.json libs/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api-gateway apps/api-gateway
COPY libs/shared libs/shared

RUN pnpm --filter @event-ticketing/shared build
RUN pnpm --filter api-gateway build

WORKDIR /app/apps/api-gateway

CMD ["node", "dist/src/main.js"]