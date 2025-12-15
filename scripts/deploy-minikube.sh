#!/bin/bash
set -e

echo "=========================================="
echo "Stock Game - Minikube Deployment Script"
echo "=========================================="

# Configuration - EDIT THESE VALUES
POSTGRES_USER="stockgame"
POSTGRES_PASSWORD="your-secure-password-here"
JWT_SECRET_KEY="your-jwt-secret-key-here-min-32-chars"
GAME_START_DATE="2025-01-01"
GAME_DURATION_DAYS="180"
STARTING_CAPITAL="100000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Starting Minikube...${NC}"
minikube start --driver=docker --cpus=2 --memory=4096

echo -e "${YELLOW}Step 2: Enabling Minikube addons...${NC}"
minikube addons enable ingress
minikube addons enable metrics-server

echo -e "${YELLOW}Step 3: Setting up Docker environment...${NC}"
eval $(minikube docker-env)

echo -e "${YELLOW}Step 4: Cloning/updating repository...${NC}"
REPO_DIR="$HOME/nextlvl_stockgame"
if [ -d "$REPO_DIR" ]; then
    cd "$REPO_DIR"
    git pull
else
    git clone https://github.com/tempathack/nextlvl_stockgame.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

echo -e "${YELLOW}Step 5: Building Docker images...${NC}"
cd "$REPO_DIR"

# Build backend image
echo "Building backend image..."
docker build -t stock-game-backend:latest ./backend

# Build frontend image
echo "Building frontend image..."
docker build -t stock-game-frontend:latest ./frontend-react

echo -e "${YELLOW}Step 6: Creating secrets file with actual values...${NC}"
cat > "$REPO_DIR/k8s/base/secrets-actual.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: stock-game-secrets
  namespace: stock-game
type: Opaque
stringData:
  DATABASE__POSTGRES_USER: "${POSTGRES_USER}"
  DATABASE__POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
  SECURITY__JWT_SECRET_KEY: "${JWT_SECRET_KEY}"
  SECURITY__JWT_ALGORITHM: "HS256"
  SECURITY__ACCESS_TOKEN_EXPIRE_MINUTES: "60"
  SECURITY__REFRESH_TOKEN_EXPIRE_MINUTES: "20160"
EOF

echo -e "${YELLOW}Step 7: Creating configmap with actual values...${NC}"
cat > "$REPO_DIR/k8s/base/configmap-actual.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: stock-game-config
  namespace: stock-game
data:
  ENVIRONMENT: "production"
  DEBUG: "false"
  PROJECT_NAME: "180-Day Stock Trading Game"
  API_PREFIX: "/api"
  DATABASE__POSTGRES_HOST: "postgres-service"
  DATABASE__POSTGRES_PORT: "5432"
  DATABASE__POSTGRES_DB: "stock_game"
  DATABASE__POOL_SIZE: "10"
  DATABASE__POOL_TIMEOUT: "30"
  DATABASE__REDIS_HOST: "redis-service"
  DATABASE__REDIS_PORT: "6379"
  DATABASE__REDIS_DB: "0"
  GAME__START_DATE: "${GAME_START_DATE}"
  GAME__DURATION_DAYS: "${GAME_DURATION_DAYS}"
  GAME__STARTING_CAPITAL: "${STARTING_CAPITAL}"
  TRADING__STARTING_CAPITAL: "${STARTING_CAPITAL}"
  TRADING__GAME_DURATION_DAYS: "${GAME_DURATION_DAYS}"
  TRADING__ALLOW_SHORT_SELLING: "true"
  TRADING__ALLOW_BORROWING: "false"
  MARKET_DATA__PROVIDER: "yahoo"
  MARKET_DATA__REQUEST_TIMEOUT_SECONDS: "5"
  MARKET_DATA__CACHE_TTL_SECONDS: "15"
EOF

echo -e "${YELLOW}Step 8: Deploying to Kubernetes...${NC}"
cd "$REPO_DIR/k8s"

# Create namespace first
kubectl apply -f base/namespace.yaml

# Apply actual secrets and configmap
kubectl apply -f base/secrets-actual.yaml
kubectl apply -f base/configmap-actual.yaml

# Apply database components
kubectl apply -f database/

# Apply Redis
kubectl apply -f redis/

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n stock-game --timeout=120s

echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n stock-game --timeout=60s

# Apply backend
kubectl apply -f backend/

# Apply frontend
kubectl apply -f frontend/

# Apply ingress
kubectl apply -f ingress/

echo -e "${YELLOW}Step 9: Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available deployment/backend -n stock-game --timeout=180s
kubectl wait --for=condition=available deployment/frontend -n stock-game --timeout=120s

echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"

echo ""
echo "Getting service URLs..."
echo ""

# Get Minikube IP
MINIKUBE_IP=$(minikube ip)
echo -e "Minikube IP: ${GREEN}$MINIKUBE_IP${NC}"

# Get NodePort services
echo ""
echo "Services:"
kubectl get svc -n stock-game

echo ""
echo -e "${YELLOW}To access the application:${NC}"
echo "1. Run: minikube tunnel (in a separate terminal)"
echo "2. Or use NodePort: kubectl get svc -n stock-game"
echo ""
echo "To view all pods:"
echo "  kubectl get pods -n stock-game"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/backend -n stock-game"
echo "  kubectl logs -f deployment/frontend -n stock-game"
echo ""
echo "To access via NodePort from EC2 public IP:"
FRONTEND_NODEPORT=$(kubectl get svc frontend-service -n stock-game -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
BACKEND_NODEPORT=$(kubectl get svc backend-service -n stock-game -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "N/A")
echo "  Frontend: http://<EC2-PUBLIC-IP>:$FRONTEND_NODEPORT"
echo "  Backend API: http://<EC2-PUBLIC-IP>:$BACKEND_NODEPORT"
