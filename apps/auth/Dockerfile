FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json ./

COPY apps/auth/package.json apps/auth/package.json
COPY libs/shared/package.json libs/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/auth apps/auth
COPY libs/shared libs/shared

RUN pnpm --filter @event-ticketing/shared build
RUN pnpm --filter auth build

WORKDIR /app/apps/auth

CMD ["node", "dist/main.js"]