#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         STOCK TRADING GAME - SHUTDOWN                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# =============================================================================
# Delete all resources
# =============================================================================
echo -e "\n${YELLOW}Deleting Kubernetes resources...${NC}"

# Delete using kustomize
if [ -f "$PROJECT_DIR/k8s/kustomization.yaml" ]; then
    kubectl delete -k "$PROJECT_DIR/k8s/" --ignore-not-found=true
else
    # Delete individually if kustomization doesn't exist
    kubectl delete -f "$PROJECT_DIR/k8s/ingress/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/cronjobs/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/frontend/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/backend/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/redis/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/database/" --ignore-not-found=true 2>/dev/null || true
    kubectl delete -f "$PROJECT_DIR/k8s/base/" --ignore-not-found=true 2>/dev/null || true
fi

echo -e "  ${GREEN}✓${NC} Resources deleted"

# =============================================================================
# Optional: Stop Minikube
# =============================================================================
echo -e "\n${YELLOW}Do you want to stop Minikube? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    minikube stop
    echo -e "  ${GREEN}✓${NC} Minikube stopped"
fi

echo -e "\n${GREEN}Shutdown complete!${NC}\n"
