#!/bin/bash
set -e  # Exit immediately if a command fails

# Colors for readability
GREEN='\033[0;32m'
NC='\033[0m' # No color

echo -e "${GREEN}🚀 Starting redeploy script...${NC}"

# --- FRONTEND BUILD ---
echo -e "${GREEN}🧱 Building frontend Docker image...${NC}"
cd frontend
docker build -t syllabus-scanner-frontend:release -f Dockerfile.release .
cd ..

# --- BACKEND BUILD ---
echo -e "${GREEN}🧱 Building backend Docker image...${NC}"
cd backend
docker build -t syllabus-scanner-backend:release -f Dockerfile.release .
cd ..

# --- LOAD IMAGES INTO KIND ---
echo -e "${GREEN}📦 Loading images into kind cluster...${NC}"
kind load docker-image syllabus-scanner-frontend:release
kind load docker-image syllabus-scanner-backend:release

# --- APPLY DEPLOYMENTS ---
echo -e "${GREEN}🗂️  Applying Kubernetes deployment file...${NC}"
kubectl apply -f k8s/deployment.yaml

# --- RESTART DEPLOYMENTS ---
echo -e "${GREEN}🔁 Restarting deployments to use new images...${NC}"
kubectl rollout restart deployment

# --- VERIFY STATUS ---
echo -e "${GREEN}🔍 Checking deployment status...${NC}"
kubectl get pods -o wide

echo -e "${GREEN}✅ Redeploy complete!${NC}"
