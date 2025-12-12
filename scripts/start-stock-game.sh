#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         STOCK TRADING GAME - KUBERNETES SETUP              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# =============================================================================
# STEP 0: Load Configuration from .env
# =============================================================================
echo -e "\n${YELLOW}[0/11] Loading configuration...${NC}"

ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo -e "Please copy .env.example to .env and configure:"
    echo -e "  ${YELLOW}cp .env.example .env${NC}"
    echo -e "  ${YELLOW}nano .env${NC}  # Set GAME_START_DATE"
    exit 1
fi

# Load .env file
set -a
source "$ENV_FILE"
set +a

# Validate required settings
if [ -z "$GAME_START_DATE" ]; then
    echo -e "${RED}ERROR: GAME_START_DATE is not set in .env${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} GAME_START_DATE: $GAME_START_DATE"

# Set defaults for optional settings
export GAME_DURATION_DAYS="${GAME_DURATION_DAYS:-180}"
export STARTING_CAPITAL="${STARTING_CAPITAL:-100000}"
export POSTGRES_USER="${POSTGRES_USER:-stock_game}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-stock_game_secret_change_me}"
export POSTGRES_DB="${POSTGRES_DB:-stock_game}"
export DEBUG="${DEBUG:-false}"

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET_KEY" ]; then
    export JWT_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')
    echo -e "  ${GREEN}✓${NC} JWT_SECRET_KEY: auto-generated"
else
    echo -e "  ${GREEN}✓${NC} JWT_SECRET_KEY: provided"
fi

echo -e "  ${GREEN}✓${NC} GAME_DURATION_DAYS: $GAME_DURATION_DAYS"
echo -e "  ${GREEN}✓${NC} STARTING_CAPITAL: \$$STARTING_CAPITAL"

# Create temporary k8s configs with substituted values
TEMP_K8S_DIR="$PROJECT_DIR/.k8s-generated"
mkdir -p "$TEMP_K8S_DIR/base"
envsubst < "$PROJECT_DIR/k8s/base/configmap.yaml" > "$TEMP_K8S_DIR/base/configmap.yaml"
envsubst < "$PROJECT_DIR/k8s/base/secrets.yaml" > "$TEMP_K8S_DIR/base/secrets.yaml"
cp "$PROJECT_DIR/k8s/base/namespace.yaml" "$TEMP_K8S_DIR/base/"
echo -e "  ${GREEN}✓${NC} Kubernetes configs generated"

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================
echo -e "\n${YELLOW}[1/11] Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}ERROR: $1 is not installed${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} $1 found"
}

check_command minikube
check_command kubectl
check_command docker

# =============================================================================
# STEP 2: Start Minikube
# =============================================================================
echo -e "\n${YELLOW}[2/11] Starting Minikube cluster...${NC}"

if minikube status | grep -q "Running"; then
    echo -e "  ${GREEN}✓${NC} Minikube already running"
else
    minikube start \
        --cpus=4 \
        --memory=8192 \
        --driver=docker \
        --addons=ingress,storage-provisioner,metrics-server
    echo -e "  ${GREEN}✓${NC} Minikube started"
fi

# =============================================================================
# STEP 3: Configure Docker to use Minikube's daemon
# =============================================================================
echo -e "\n${YELLOW}[3/11] Configuring Docker environment...${NC}"
eval $(minikube docker-env)
echo -e "  ${GREEN}✓${NC} Docker configured to use Minikube"

# =============================================================================
# STEP 4: Build Docker Images
# =============================================================================
echo -e "\n${YELLOW}[4/11] Building Docker images...${NC}"

echo -e "  Building backend image..."
if [ -d "$PROJECT_DIR/backend" ]; then
    docker build -t stock-game-backend:latest "$PROJECT_DIR/backend" --quiet
    echo -e "  ${GREEN}✓${NC} Backend image built"
else
    echo -e "  ${YELLOW}!${NC} Backend directory not found, skipping..."
fi

echo -e "  Building frontend image..."
if [ -d "$PROJECT_DIR/frontend-react" ]; then
    docker build -t stock-game-frontend:latest "$PROJECT_DIR/frontend-react" --quiet
    echo -e "  ${GREEN}✓${NC} Frontend image built"
else
    echo -e "  ${YELLOW}!${NC} Frontend directory not found, skipping..."
fi

# =============================================================================
# STEP 5: Create Namespace
# =============================================================================
echo -e "\n${YELLOW}[5/11] Creating Kubernetes namespace...${NC}"
kubectl apply -f "$TEMP_K8S_DIR/base/namespace.yaml"
echo -e "  ${GREEN}✓${NC} Namespace 'stock-game' created"

# =============================================================================
# STEP 6: Deploy ConfigMaps and Secrets
# =============================================================================
echo -e "\n${YELLOW}[6/11] Deploying configuration...${NC}"
kubectl apply -f "$TEMP_K8S_DIR/base/configmap.yaml"
kubectl apply -f "$TEMP_K8S_DIR/base/secrets.yaml"
echo -e "  ${GREEN}✓${NC} ConfigMap and Secrets deployed (GAME_START_DATE=$GAME_START_DATE)"

# =============================================================================
# STEP 7: Deploy Database and Cache
# =============================================================================
echo -e "\n${YELLOW}[7/11] Deploying PostgreSQL and Redis...${NC}"

# PostgreSQL
kubectl apply -f "$PROJECT_DIR/k8s/database/"
echo -e "  Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n stock-game --timeout=180s
echo -e "  ${GREEN}✓${NC} PostgreSQL ready"

# Redis
kubectl apply -f "$PROJECT_DIR/k8s/redis/"
echo -e "  Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n stock-game --timeout=120s
echo -e "  ${GREEN}✓${NC} Redis ready"

# =============================================================================
# STEP 8: Deploy Application
# =============================================================================
echo -e "\n${YELLOW}[8/11] Deploying application...${NC}"

# Backend
kubectl apply -f "$PROJECT_DIR/k8s/backend/"
echo -e "  Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n stock-game --timeout=180s
echo -e "  ${GREEN}✓${NC} Backend ready"

# Frontend
kubectl apply -f "$PROJECT_DIR/k8s/frontend/"
echo -e "  Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n stock-game --timeout=120s
echo -e "  ${GREEN}✓${NC} Frontend ready"

# Ingress
kubectl apply -f "$PROJECT_DIR/k8s/ingress/"
echo -e "  ${GREEN}✓${NC} Ingress configured"

# CronJob
kubectl apply -f "$PROJECT_DIR/k8s/cronjobs/"
echo -e "  ${GREEN}✓${NC} Market refresh CronJob deployed"

# =============================================================================
# STEP 9: Run Data Migration
# =============================================================================
echo -e "\n${YELLOW}[9/11] Running data migration...${NC}"
if [ -f "$PROJECT_DIR/k8s/jobs/data-migration-job.yaml" ]; then
    kubectl apply -f "$PROJECT_DIR/k8s/jobs/data-migration-job.yaml"
    echo -e "  Waiting for migration to complete..."
    kubectl wait --for=condition=complete job/data-migration -n stock-game --timeout=300s || true
    echo -e "  ${GREEN}✓${NC} Data migration completed"
else
    echo -e "  ${YELLOW}!${NC} Migration job not found, skipping..."
fi

# =============================================================================
# STEP 10: Configure Host Entry
# =============================================================================
echo -e "\n${YELLOW}[10/11] Configuring host entry...${NC}"

MINIKUBE_IP=$(minikube ip)
HOST_ENTRY="$MINIKUBE_IP stock-game.local"

if grep -q "stock-game.local" /etc/hosts; then
    echo -e "  ${GREEN}✓${NC} Host entry already exists"
else
    echo -e "  Adding entry to /etc/hosts (requires sudo)..."
    echo "$HOST_ENTRY" | sudo tee -a /etc/hosts > /dev/null
    echo -e "  ${GREEN}✓${NC} Host entry added"
fi

# =============================================================================
# STEP 11: Cleanup
# =============================================================================
echo -e "\n${YELLOW}[11/11] Cleaning up...${NC}"
rm -rf "$TEMP_K8S_DIR"
echo -e "  ${GREEN}✓${NC} Temporary files cleaned"

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SETUP COMPLETE!                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Game Configuration:${NC}"
echo -e "  Start Date:       ${GREEN}$GAME_START_DATE${NC}"
echo -e "  Duration:         ${GREEN}$GAME_DURATION_DAYS days${NC}"
echo -e "  Starting Capital: ${GREEN}\$$STARTING_CAPITAL${NC}"

echo -e "\n${BLUE}Application URLs:${NC}"
echo -e "  Frontend:  ${GREEN}http://stock-game.local${NC}"
echo -e "  API:       ${GREEN}http://stock-game.local/api${NC}"
echo -e "  API Docs:  ${GREEN}http://stock-game.local/api/docs${NC}"

echo -e "\n${BLUE}Database Connection (DBeaver):${NC}"
echo -e "  Run: ${YELLOW}kubectl port-forward svc/postgres-service 5432:5432 -n stock-game${NC}"
echo -e "  Host: localhost | Port: 5432 | DB: stock_game | User: stock_game"
echo -e "  Or use NodePort: Host: $MINIKUBE_IP | Port: 30432"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  View pods:     ${YELLOW}kubectl get pods -n stock-game${NC}"
echo -e "  View logs:     ${YELLOW}kubectl logs -f deployment/backend -n stock-game${NC}"
echo -e "  View HPA:      ${YELLOW}kubectl get hpa -n stock-game${NC}"
echo -e "  Port forward:  ${YELLOW}kubectl port-forward svc/postgres-service 5432:5432 -n stock-game${NC}"

echo -e "\n${BLUE}To start the ingress tunnel (required for http://stock-game.local):${NC}"
echo -e "  ${YELLOW}minikube tunnel${NC}"

echo -e "\n${GREEN}Happy Trading!${NC}\n"
