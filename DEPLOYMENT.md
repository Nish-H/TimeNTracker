# Task Tracker - Production Deployment Guide

⚠️ **Railway is 30-day trial only! Check [FREE-DEPLOYMENT.md](./FREE-DEPLOYMENT.md) for always-free alternatives.**

## Architecture Overview
- **Frontend**: Vercel (React SPA)
- **Backend**: Railway (Node.js + Express API) - 30 day trial
- **Database**: Railway PostgreSQL - 30 day trial

## Prerequisites
1. Railway account (free tier available)
2. Vercel account (free tier available)
3. Git repository pushed to GitHub

## Step 1: Deploy Database & Backend to Railway

### 1.1 Create Railway Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Link to existing repo
railway link
```

### 1.2 Add PostgreSQL Database
1. Go to Railway dashboard
2. Click "Add Service" → "Database" → "PostgreSQL"
3. Copy the DATABASE_URL from the PostgreSQL service

### 1.3 Deploy Backend
1. In Railway dashboard, click "Add Service" → "GitHub Repo"
2. Select your task-tracker repository
3. Set the following environment variables:
   ```
   DATABASE_URL=<your-postgresql-url>
   JWT_SECRET=<generate-a-secure-random-string>
   PORT=5000
   NODE_ENV=production
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   ```
4. Set custom start command: `cd backend && npm start`
5. Set root directory: `/backend`

## Step 2: Deploy Frontend to Vercel

### 2.1 Connect Repository
1. Go to Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository

### 2.2 Configure Build Settings
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `cd frontend && npm install`

### 2.3 Set Environment Variables
```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

## Step 3: Configure Database

### 3.1 Run Database Migrations
```bash
# Connect to Railway project
railway link

# Run migrations on Railway database
railway run --service=<backend-service-name> npm run db:migrate

# Seed initial data
railway run --service=<backend-service-name> npm run db:seed
```

## Step 4: Update CORS Configuration

Update your backend's CORS_ORIGINS environment variable in Railway:
```
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:4000
```

## Step 5: Test Deployment

### 5.1 Backend Health Check
Visit: `https://your-railway-backend.up.railway.app/api/health`

### 5.2 Frontend Application
Visit: `https://your-vercel-app.vercel.app`

### 5.3 Login Test
Use demo credentials:
- Email: admin@tasktracker.com
- Password: admin123

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Update CORS_ORIGINS in Railway backend
2. **Database Connection**: Verify DATABASE_URL in Railway
3. **API 404 Errors**: Check VITE_API_URL in Vercel
4. **Build Failures**: Ensure Node.js version compatibility

### Checking Logs:

**Railway Backend Logs:**
```bash
railway logs --service=<backend-service-name>
```

**Vercel Build Logs:**
Available in Vercel dashboard under "Functions" → "View Logs"

## Environment Variables Reference

### Railway Backend:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `PORT`: Server port (5000)
- `NODE_ENV`: production
- `CORS_ORIGINS`: Comma-separated allowed origins

### Vercel Frontend:
- `VITE_API_URL`: Backend API URL from Railway

## Monitoring & Maintenance

### Database Backups:
- Automatic daily backups at 5pm (configured via cron)
- Manual backup: `railway run npm run backup`

### Updating Deployments:
- **Backend**: Push to main branch → Railway auto-deploys
- **Frontend**: Push to main branch → Vercel auto-deploys

## Security Notes:
- All environment variables are encrypted at rest
- HTTPS enforced on both platforms
- JWT tokens for secure authentication
- CORS properly configured for cross-origin requests