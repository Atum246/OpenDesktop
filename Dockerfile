FROM node:22-slim

LABEL maintainer="OpenDesktop Contributors"
LABEL description="OpenDesktop — AI-powered desktop agent"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    python3 \
    python3-pip \
    xdg-utils \
    procps \
    net-tools \
    dnsutils \
    iputils-ping \
    traceroute \
    whois \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /root/.opendesktop/{memory,brain,evolution,security,plugins,workflows,personas,screenshots,audio,downloads,backups,monitor,notifications,scheduler,profiles,marketplace-cache}

# Make binary executable
RUN chmod +x bin/opendesktop

# Set environment variables
ENV NODE_ENV=production
ENV OPENDESKTOP_DATA_DIR=/root/.opendesktop

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const c = require('./src/core/config.js'); new c(); process.exit(0)" || exit 1

# Expose API port
EXPOSE 4444

# Default command
CMD ["node", "src/index.js"]
