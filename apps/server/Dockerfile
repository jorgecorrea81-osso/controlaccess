FROM node:22-alpine AS base
WORKDIR /app

# Copiamos el monorepo mínimo necesario para el workspace del server
COPY package.json package-lock.json .npmrc ./
COPY scripts ./scripts
COPY apps/server/package.json ./apps/server/package.json

RUN npm install --workspace=@controlaccesos/server --include-workspace-root --omit=dev \
  && node scripts/fix-npm-workspaces.mjs

COPY apps/server ./apps/server

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

EXPOSE 4000

WORKDIR /app/apps/server
CMD ["node", "src/index.js"]
