# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
# Use yarn if yarn.lock exists, otherwise npm
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm ci; fi

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Only production dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; else npm ci --omit=dev; fi

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Expose the app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the server
CMD ["node", "dist/index.js"]
