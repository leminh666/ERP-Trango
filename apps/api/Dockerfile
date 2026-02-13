# =============================================================================
# API Dockerfile - NestJS Backend
# =============================================================================
#
# USAGE:
#   docker build -t erp-api -f Dockerfile .
#   docker run -p 4000:4000 erp-api
#
# =============================================================================

# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY prisma ./prisma/
COPY dist ./dist/
COPY node_modules ./node_modules/

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application
CMD ["node", "dist/src/main"]

