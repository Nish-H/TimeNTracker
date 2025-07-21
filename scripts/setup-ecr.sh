#!/bin/bash

# Setup ECR repository for Docker images
# Usage: ./scripts/setup-ecr.sh <project-name> <aws-region>

PROJECT_NAME=${1:-timentracker}
AWS_REGION=${2:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🐳 Setting up ECR for $PROJECT_NAME..."

# Create ECR repository
aws ecr create-repository \
  --repository-name "$PROJECT_NAME-backend" \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true \
  || echo "Repository might already exist"

# Get login token
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

echo "✅ ECR setup complete!"
echo "📦 Repository URI: $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend"

# Build and push Docker image
echo "🔨 Building Docker image..."
docker build -f backend/Dockerfile -t "$PROJECT_NAME-backend" .

# Tag for ECR
docker tag "$PROJECT_NAME-backend:latest" "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest"

# Push to ECR
echo "📤 Pushing to ECR..."
docker push "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest"

echo "🚀 Docker image pushed successfully!"