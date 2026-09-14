FROM node:20-alpine

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

# Copy workspace files for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application source
COPY apps/web ./apps/web

EXPOSE 3000

CMD ["pnpm", "--filter", "kronosfit-web", "dev"]
