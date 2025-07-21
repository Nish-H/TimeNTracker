#!/bin/bash

# Deploy frontend to S3 and invalidate CloudFront
# Usage: ./scripts/deploy-to-s3.sh <bucket-name> <cloudfront-distribution-id>

BUCKET_NAME=$1
DISTRIBUTION_ID=$2

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
  echo "Usage: ./scripts/deploy-to-s3.sh <bucket-name> <cloudfront-distribution-id>"
  exit 1
fi

echo "🏗️  Building frontend..."
cd frontend
npm run build

echo "📦 Syncing to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME --delete

echo "♻️  Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ Deployment complete!"
echo "🌐 Your app should be live at: https://$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text)"