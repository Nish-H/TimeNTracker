# ☁️ Task Tracker - AWS Complete Deployment Guide

## 🏗️ AWS Architecture Options

### **Option 1: CloudFormation All-in-One (Recommended)**
- **Frontend**: S3 + CloudFront (Static hosting)
- **Backend**: ECS Fargate (Containerized)
- **Database**: RDS PostgreSQL
- **Load Balancer**: Application Load Balancer

### **Option 2: Serverless with Lambda**
- **Frontend**: S3 + CloudFront
- **Backend**: AWS Lambda + API Gateway
- **Database**: RDS PostgreSQL (or Aurora Serverless)

---

## 💰 AWS Free Tier Eligibility

### **Always Free Services:**
- **Lambda**: 1M free requests/month
- **API Gateway**: 1M API calls/month
- **S3**: 5GB storage
- **CloudFront**: 1TB data transfer/month

### **12-Month Free Tier:**
- **RDS**: 750 hours db.t3.micro (PostgreSQL)
- **ECS**: 750 hours Fargate (vCPU + memory)
- **EC2**: 750 hours t3.micro (if needed)

---

## 🚀 Option 1: CloudFormation Deployment

### Step 1: Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output format (json)

# Verify setup
aws sts get-caller-identity
```

### Step 2: Setup ECR (for Docker images)
```bash
# Make script executable
chmod +x scripts/setup-ecr.sh

# Setup ECR and push Docker image
./scripts/setup-ecr.sh timentracker us-east-1
```

### Step 3: Deploy Infrastructure
```bash
# Deploy CloudFormation stack
aws cloudformation create-stack \
  --stack-name timentracker-infrastructure \
  --template-body file://aws-cloudformation.yml \
  --parameters ParameterKey=DBPassword,ParameterValue=YourSecurePassword123! \
  --capabilities CAPABILITY_IAM

# Monitor deployment
aws cloudformation describe-stacks --stack-name timentracker-infrastructure
```

### Step 4: Deploy Frontend to S3
```bash
# Get S3 bucket name from CloudFormation outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name timentracker-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name timentracker-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text | cut -d'/' -f3)

# Deploy frontend
chmod +x scripts/deploy-to-s3.sh
./scripts/deploy-to-s3.sh $BUCKET_NAME $DISTRIBUTION_ID
```

### Step 5: Update Frontend API URL
```bash
# Get backend URL
BACKEND_URL=$(aws cloudformation describe-stacks \
  --stack-name timentracker-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text)

# Update frontend environment
echo "VITE_API_URL=$BACKEND_URL" > frontend/.env.production

# Rebuild and redeploy frontend
cd frontend && npm run build
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

---

## 🔥 Option 2: Serverless Deployment

### Step 1: Install Serverless Framework
```bash
npm install -g serverless
npm install -g @codegenie/serverless-express

# Install plugins
cd backend
npm install @codegenie/serverless-express
```

### Step 2: Setup RDS Database
```bash
# Create RDS instance (free tier)
aws rds create-db-instance \
  --db-instance-identifier timentracker-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username tasktracker_user \
  --master-user-password YourPassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --no-publicly-accessible \
  --backup-retention-period 7
```

### Step 3: Deploy Serverless Backend
```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/tasktracker"
export JWT_SECRET="your-super-secret-jwt-key"

# Deploy serverless backend
serverless deploy --stage prod

# Get API Gateway URL
serverless info --stage prod
```

### Step 4: Deploy Frontend
```bash
# Get S3 bucket from serverless outputs
BUCKET_NAME=$(serverless info --stage prod --verbose | grep S3BucketName | cut -d':' -f2 | xargs)

# Deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

---

## 📊 Cost Estimation (Monthly)

### **Free Tier Usage:**
- **RDS PostgreSQL**: $0 (750 hours free)
- **ECS Fargate**: $0 (750 hours free)
- **Lambda**: $0 (1M requests free)
- **S3 + CloudFront**: $0 (5GB + 1TB free)
- **API Gateway**: $0 (1M calls free)

### **Beyond Free Tier:**
- **RDS db.t3.micro**: ~$13/month
- **ECS Fargate**: ~$5-15/month
- **Data Transfer**: ~$5-10/month
- **Total Estimated**: $25-40/month

---

## 🔧 Management Commands

### Database Management:
```bash
# Connect to RDS
PGPASSWORD=YourPassword123! psql -h your-rds-endpoint -U tasktracker_user -d tasktracker

# Run migrations
DATABASE_URL="postgresql://user:pass@host:5432/tasktracker" npx prisma db push

# Seed database
DATABASE_URL="postgresql://user:pass@host:5432/tasktracker" npm run db:seed
```

### Application Updates:
```bash
# Update backend (ECS)
./scripts/setup-ecr.sh  # Builds and pushes new image
aws ecs update-service --cluster timentracker-cluster --service timentracker-backend-service --force-new-deployment

# Update backend (Lambda)
serverless deploy --stage prod

# Update frontend
./scripts/deploy-to-s3.sh $BUCKET_NAME $DISTRIBUTION_ID
```

### Monitoring:
```bash
# View ECS logs
aws logs tail /ecs/timentracker-backend --follow

# View Lambda logs  
serverless logs -f app --stage prod --tail

# Check RDS performance
aws rds describe-db-instances --db-instance-identifier timentracker-db
```

---

## 🔒 Security Best Practices

### **Network Security:**
- ✅ RDS in private subnets
- ✅ Security groups with minimal access
- ✅ HTTPS enforced via CloudFront
- ✅ WAF rules for API protection

### **Access Control:**
- ✅ IAM roles with least privilege
- ✅ RDS encryption at rest
- ✅ VPC flow logs enabled
- ✅ CloudTrail for audit logging

### **Application Security:**
- ✅ JWT token authentication
- ✅ CORS properly configured
- ✅ Rate limiting on API Gateway
- ✅ Input validation and sanitization

---

## 🚨 Troubleshooting

### Common Issues:

1. **ECS Task Won't Start:**
   ```bash
   # Check task definition and logs
   aws ecs describe-tasks --cluster timentracker-cluster --tasks <task-arn>
   ```

2. **RDS Connection Issues:**
   ```bash
   # Verify security groups and network ACLs
   aws rds describe-db-instances --db-instance-identifier timentracker-db
   ```

3. **Lambda Cold Starts:**
   - Use provisioned concurrency for critical functions
   - Optimize bundle size and dependencies

4. **CloudFront Caching:**
   ```bash
   # Invalidate cache after deployments
   aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
   ```

### Health Check URLs:
- **Backend**: `https://your-alb-url/health`
- **Frontend**: `https://your-cloudfront-url`
- **API**: `https://your-api-gateway-url/health`

---

## 📈 Scaling Recommendations

### **Performance Optimization:**
1. Enable RDS Read Replicas for read-heavy workloads
2. Use ElastiCache for session storage and caching
3. Implement CloudWatch auto-scaling for ECS
4. Use Lambda@Edge for global API responses

### **Cost Optimization:**
1. Use Spot instances for development environments
2. Schedule auto-scaling based on usage patterns
3. Implement lifecycle policies for S3 storage
4. Use Reserved Instances for predictable workloads

---

## 🎯 Demo Credentials
- **Email**: admin@tasktracker.com
- **Password**: admin123

## ✅ Deployment Checklist

- [ ] AWS CLI configured with proper credentials
- [ ] ECR repository created and Docker image pushed
- [ ] CloudFormation stack deployed successfully
- [ ] RDS database accessible and migrated
- [ ] Frontend deployed to S3 with correct API URL
- [ ] CloudFront distribution active
- [ ] Health checks passing
- [ ] SSL certificates configured
- [ ] Monitoring and logging enabled

Your Task Tracker is now running on AWS! 🚀☁️