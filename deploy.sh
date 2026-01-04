#!/bin/bash

set -e

echo "================================"
echo "AI Trading Bot Deployment Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Install Node.js if not present (for local development)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js already installed"
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 2: Setting up environment...${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${RED}WARNING: Please edit .env file with your actual configuration before starting the bot!${NC}"
    else
        echo -e "${RED}ERROR: .env.example not found${NC}"
        exit 1
    fi
else
    echo ".env file already exists"
fi

echo -e "${GREEN}✓ Environment configured${NC}"

echo -e "${YELLOW}Step 3: Setting up firewall...${NC}"

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    apt-get install -y ufw
fi

# Configure firewall (allow SSH and deny Redis external access)
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo -e "${GREEN}✓ Firewall configured${NC}"

echo -e "${YELLOW}Step 4: Creating directories...${NC}"

# Create necessary directories
mkdir -p logs
chmod 755 logs

echo -e "${GREEN}✓ Directories created${NC}"

echo -e "${YELLOW}Step 5: Building Docker images...${NC}"

# Build and start containers
docker-compose build

echo -e "${GREEN}✓ Docker images built${NC}"

echo -e "${YELLOW}Step 6: Starting services...${NC}"

# Start services
docker-compose up -d

echo -e "${GREEN}✓ Services started${NC}"

echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"

# Wait for services to be ready
sleep 5

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ All services are running${NC}"
else
    echo -e "${RED}ERROR: Some services failed to start${NC}"
    docker-compose logs
    exit 1
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop bot: docker-compose down"
echo "  - Restart bot: docker-compose restart"
echo "  - Check status: docker-compose ps"
echo ""
echo -e "${YELLOW}IMPORTANT: Make sure to configure your .env file with real API keys and wallet keys!${NC}"
echo ""
