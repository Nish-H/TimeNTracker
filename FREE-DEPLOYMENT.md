# 🆓 Task Tracker - Free Tier Deployment Guide

## Best Free Combinations (Always Free)

### 🥇 **Option 1: Supabase + Render** (Recommended)
- ✅ **Database**: Supabase (500MB, 50K MAU, Real-time features)
- ✅ **Backend**: Render (750 hours/month, auto-sleep)
- ✅ **Frontend**: Vercel (100GB bandwidth, global CDN)

### 🥈 **Option 2: Neon + Fly.io**
- ✅ **Database**: Neon (3GB storage, 0.25 CPU 24/7)
- ✅ **Backend**: Fly.io (2 shared CPU + 256MB RAM)
- ✅ **Frontend**: Vercel (same as above)

---

## 🚀 Deploy with Supabase + Render

### Step 1: Setup Supabase Database

1. **Create Supabase Account**: [supabase.com](https://supabase.com)
2. **Create New Project**
3. **Copy Database URL** from Settings → Database → Connection string (URI)
4. **Run Database Schema**:
   ```sql
   -- Copy your Prisma schema SQL and run in Supabase SQL Editor
   -- Or use Prisma migrate: npx prisma db push
   ```

### Step 2: Deploy Backend to Render

1. **Connect GitHub**: [render.com](https://render.com) → New Web Service
2. **Configure Build**:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
3. **Environment Variables**:
   ```
   DATABASE_URL=your-supabase-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   CORS_ORIGINS=https://your-app.vercel.app
   PORT=10000
   ```

### Step 3: Deploy Frontend to Vercel
1. **Import Repository**: [vercel.com](https://vercel.com)
2. **Environment Variables**:
   ```
   VITE_API_URL=https://your-app.onrender.com
   ```

---

## 🐳 Deploy with Neon + Fly.io

### Step 1: Setup Neon Database

1. **Create Neon Account**: [neon.tech](https://neon.tech)
2. **Create Database** → Copy connection string
3. **Update Environment**:
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   cd backend && npx prisma db push
   ```

### Step 2: Deploy Backend to Fly.io

1. **Install Fly CLI**:
   ```bash
   # macOS
   brew install flyctl
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy**:
   ```bash
   fly auth login
   fly launch --copy-config
   
   # Set environment variables
   fly secrets set DATABASE_URL="your-neon-connection-string"
   fly secrets set JWT_SECRET="your-secret-key"
   fly secrets set CORS_ORIGINS="https://your-app.vercel.app"
   
   fly deploy
   ```

---

## 📊 Free Tier Limits Comparison

| Service | Database | Compute | Bandwidth | Sleep Mode |
|---------|----------|---------|-----------|------------|
| **Supabase** | 500MB | Always-on | 5GB/month | ❌ No |
| **Render** | - | 750 hours | 100GB | ✅ After 15min |
| **Neon** | 3GB | 0.25 CPU | - | ❌ No |
| **Fly.io** | - | 2 shared CPU | - | ✅ Scales to zero |
| **Vercel** | - | 100GB bandwidth | Global CDN | ❌ No |

---

## 🔧 Quick Setup Commands

### For Supabase + Render:
```bash
# 1. Push to GitHub
git push origin main

# 2. Create Supabase project & copy DATABASE_URL
# 3. Create Render service with render.yaml
# 4. Deploy to Vercel

# 5. Run database setup
DATABASE_URL="your-supabase-url" npx prisma db push
DATABASE_URL="your-supabase-url" npm run db:seed
```

### For Neon + Fly.io:
```bash
# 1. Create Neon database
# 2. Setup database
export DATABASE_URL="your-neon-url"
cd backend && npx prisma db push && npm run db:seed

# 3. Deploy backend
fly launch
fly secrets set DATABASE_URL="your-neon-url"
fly secrets set JWT_SECRET="random-secret-key"
fly deploy

# 4. Deploy frontend to Vercel
```

---

## 🛠️ Environment Variables Reference

### Backend Environment Variables:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
PORT=10000  # Render, 8080 for Fly.io
CORS_ORIGINS=https://your-frontend-url.vercel.app
BACKUP_SCHEDULE=0 17 * * *
```

### Frontend Environment Variables:
```env
VITE_API_URL=https://your-backend-url
VITE_APP_NAME=Task Tracker
```

---

## 🚨 Important Notes

### Render Limitations:
- ⏰ **Auto-sleep**: Apps sleep after 15 minutes of inactivity
- 🔄 **Cold starts**: ~10-30 seconds to wake up
- ⏱️ **750 hours/month**: ~25 hours/day limit

### Fly.io Limitations:  
- 💾 **Storage**: No persistent disk on free tier
- 🔄 **Scale to zero**: Apps can shut down when idle
- 📊 **Monitoring**: Limited logs on free tier

### Supabase Benefits:
- 🔄 **Real-time**: WebSocket subscriptions included
- 🔐 **Auth**: Built-in authentication system
- 📁 **Storage**: File uploads included
- 🚀 **Always-on**: No sleep mode

---

## 🔍 Troubleshooting

### Common Issues:

1. **Cold Starts on Render**: Use uptimerobot.com to ping your app
2. **CORS Errors**: Update CORS_ORIGINS environment variable
3. **Database Connection**: Ensure DATABASE_URL includes `?sslmode=require`
4. **Build Failures**: Check Node.js version compatibility

### Health Check URLs:
- Backend: `https://your-backend/health`
- Frontend: `https://your-frontend.vercel.app`

---

## 💡 Pro Tips

1. **Keep Apps Awake**: Use [UptimeRobot](https://uptimerobot.com) (free) to ping Render every 5 minutes
2. **Database Backups**: Both Supabase and Neon handle automatic backups
3. **Monitoring**: Use Supabase dashboard for real-time metrics
4. **Scaling**: Upgrade to paid tiers when you outgrow limits

---

## 🎯 Demo Credentials
- **Email**: admin@tasktracker.com
- **Password**: admin123

Ready to deploy your Task Tracker for free! 🚀