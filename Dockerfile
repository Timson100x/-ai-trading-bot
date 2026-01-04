# Use Node.js LTS
FROM node:20-alpine

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm install -g typescript
RUN tsc

# Create logs directory
RUN mkdir -p logs

# Expose port for potential HTTP API
EXPOSE 3000

# Run with PM2
RUN npm install -g pm2

CMD ["pm2-runtime", "start", "dist/index.js", "--name", "ai-trading-bot"]
