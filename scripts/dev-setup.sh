#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         STOCK TRADING GAME - DEV SETUP                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# =============================================================================
# Backend Setup
# =============================================================================
echo -e "\n${YELLOW}Setting up Backend...${NC}"

cd "$PROJECT_DIR/backend"

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo -e "  ${YELLOW}Installing Poetry...${NC}"
    curl -sSL https://install.python-poetry.org | python3 -
fi

# Install dependencies
echo -e "  Installing Python dependencies..."
poetry install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << EOF
ENVIRONMENT=development
DEBUG=true
PROJECT_NAME=Stock Trading Game

# Database
DATABASE__POSTGRES_HOST=localhost
DATABASE__POSTGRES_PORT=5432
DATABASE__POSTGRES_DB=stock_game
DATABASE__POSTGRES_USER=stock_game
DATABASE__POSTGRES_PASSWORD=stock_game

# Redis
DATABASE__REDIS_HOST=localhost
DATABASE__REDIS_PORT=6379
DATABASE__REDIS_DB=0

# Security
SECURITY__JWT_SECRET_KEY=dev_secret_key_change_in_production_32chars
SECURITY__JWT_ALGORITHM=HS256
SECURITY__ACCESS_TOKEN_EXPIRE_MINUTES=60

# Trading Rules
TRADING__STARTING_CAPITAL=100000
TRADING__GAME_DURATION_DAYS=180
TRADING__ALLOW_SHORT_SELLING=true
TRADING__ALLOW_BORROWING=false

# Market Data
MARKET_DATA__PROVIDER=yahoo
MARKET_DATA__REQUEST_TIMEOUT_SECONDS=5
MARKET_DATA__CACHE_TTL_SECONDS=15
EOF
    echo -e "  ${GREEN}✓${NC} Created .env file"
fi

echo -e "  ${GREEN}✓${NC} Backend setup complete"

# =============================================================================
# Frontend Setup
# =============================================================================
echo -e "\n${YELLOW}Setting up Frontend...${NC}"

cd "$PROJECT_DIR/frontend-react"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "  ${RED}ERROR: Node.js is not installed${NC}"
    exit 1
fi

# Install dependencies
echo -e "  Installing Node.js dependencies..."
npm install

echo -e "  ${GREEN}✓${NC} Frontend setup complete"

# =============================================================================
# Docker Compose for local development
# =============================================================================
echo -e "\n${YELLOW}Creating docker-compose.dev.yml...${NC}"

cd "$PROJECT_DIR"

cat > docker-compose.dev.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: stock-game-postgres
    environment:
      POSTGRES_DB: stock_game
      POSTGRES_USER: stock_game
      POSTGRES_PASSWORD: stock_game
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stock_game -d stock_game"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: stock-game-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF

echo -e "  ${GREEN}✓${NC} docker-compose.dev.yml created"

# =============================================================================
# Summary
# =============================================================================
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEV SETUP COMPLETE!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}To start development:${NC}"
echo -e "\n${YELLOW}1. Start database services:${NC}"
echo -e "   docker-compose -f docker-compose.dev.yml up -d"

echo -e "\n${YELLOW}2. Start backend:${NC}"
echo -e "   cd backend && poetry run uvicorn app.main:app --reload --port 8000"

echo -e "\n${YELLOW}3. Start frontend:${NC}"
echo -e "   cd frontend-react && npm run dev"

echo -e "\n${BLUE}Access:${NC}"
echo -e "  Frontend:  ${GREEN}http://localhost:5173${NC}"
echo -e "  API:       ${GREEN}http://localhost:8000${NC}"
echo -e "  API Docs:  ${GREEN}http://localhost:8000/docs${NC}"

echo -e "\n"
