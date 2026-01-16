FROM oven/bun:1 AS base

WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Install Playwright browsers
RUN bunx playwright install chromium
RUN bunx playwright install-deps chromium

# Copy application code
COPY . .

# Expose metrics port
EXPOSE 9090

# Run the application
CMD ["bun", "run", "index.ts"]
