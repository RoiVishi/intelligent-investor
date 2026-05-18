# ── Layer 1: Base Image ─────────────────────────────────
# node:20-alpine matches the CI runtime.
FROM node:20-alpine
# ── Layer 2: Security — create a non-root user ──────────
# Running as root inside a container is a security risk.
# We create a dedicated user 'appuser' and will switch to it later.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# ── Layer 3: Working Directory ──────────────────────────
WORKDIR /app
# ── Layer 4: Copy package files FIRST (cache trick!) ────
# If package.json hasn't changed, Docker reuses the cached
# npm install layer — next builds take seconds, not minutes.
COPY package*.json ./
# ── Layer 5: Install production dependencies only ───────
RUN npm install --production
# ── Layer 6: Copy source code ───────────────────────────
COPY src/ ./src/
# ── Layer 7: Switch to non-root user ────────────────────
USER appuser
# ── Layer 8: Document the port ──────────────────────────
# Backend runs on port 5000 (NOT 3000)
EXPOSE 5000
# ── Layer 9: Health check ────────────────────────────────
# Docker checks this every 30s. Compose waits for 'healthy'
# before starting services that depend_on this one.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
 CMD wget -qO- http://localhost:5000/health || exit 1
# ── Layer 10: Start command ──────────────────────────────
CMD ["node", "src/app.js"]
