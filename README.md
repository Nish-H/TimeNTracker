# TimeNTracker

A professional task management and time tracking application with Halo integration capabilities. Features bulletproof data reliability with automated daily backups and zero data loss.

## 🎯 Features

- **⏱️ Time Tracking**: Intuitive timer with green START / red STOP buttons
- **📋 Task Management**: Full CRUD operations with Halo ticket correlation
- **🏢 Client & Project Management**: Organize tasks by clients and projects
- **📊 Categories**: Admin, Automation, L4 Escalations, Projects, Client Support
- **📈 Reporting**: Daily, weekly, and custom range reports
- **💾 Automated Backups**: Daily backups at 5pm with 30-day retention
- **🔒 Security**: JWT authentication with rate limiting
- **📄 Halo Export**: CSV export format ready for Halo ticket system
- **🛡️ Zero Data Loss**: Bulletproof system with transaction logging

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (recommended)
- **Node.js 18+** (for development mode)
- **PostgreSQL 15+** (if running without Docker)

### Option 1: Docker (Recommended)

```bash
# Clone and navigate to project
cd TimeNTracker

# Start all services
docker compose up

# Or run in background
docker compose up -d
```

**Access the application:**
- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432

### Option 2: Development Mode

```bash
# Terminal 1 - Start database
docker compose up postgres

# Terminal 2 - Backend
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
```

## 🔑 Demo Credentials

- **Email**: `admin@tasktracker.com`
- **Password**: `admin123`

## 📁 Project Structure

```
TimeNTracker/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Authentication & security
│   │   ├── scripts/        # Backup automation
│   │   └── index.ts        # Main server file
│   ├── prisma/             # Database schema & migrations
│   ├── Dockerfile          # Backend container
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   ├── Dockerfile          # Frontend container
│   └── package.json
├── docker-compose.yml      # Multi-container setup
└── README.md
```

## 🛠️ Commands Reference

### Docker Commands
```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs

# Rebuild containers
docker compose build --no-cache
```

### Backend Commands
```bash
cd backend

# Install dependencies
npm install

# Database operations
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed         # Seed initial data

# Development
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Backup operations
npm run backup          # Manual backup
npm run backup list     # List all backups
npm run backup restore <id>  # Restore specific backup

# Code quality
npm run lint           # Run ESLint
npm run typecheck      # TypeScript check
npm run test           # Run tests
```

### Frontend Commands
```bash
cd frontend

# Install dependencies
npm install

# Development
npm run dev            # Start development server (port 4000)
npm run build          # Build for production
npm run preview        # Preview production build

# Code quality
npm run lint           # Run ESLint
npm run typecheck      # TypeScript check
npm run test           # Run tests
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/halo/:ticketId` - Get tasks by Halo ticket

### Time Tracking
- `GET /api/time-logs` - Get time logs
- `GET /api/time-logs/active` - Get active time log
- `POST /api/time-logs/start` - Start timer
- `POST /api/time-logs/stop` - Stop timer
- `PUT /api/time-logs/:id` - Update time log
- `DELETE /api/time-logs/:id` - Delete time log

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/weekly` - Weekly report
- `GET /api/reports/range` - Custom date range
- `GET /api/reports/halo-export` - Halo CSV export

## 📊 Database Schema

### Core Tables
- **users** - User authentication and profiles
- **tasks** - Task management with Halo ticket correlation
- **time_logs** - Time tracking entries
- **clients** - Client information
- **categories** - Task categories
- **backups** - Backup metadata and verification

## 🔒 Security Features

- **JWT Authentication** with 7-day expiration
- **Rate Limiting** (100 requests per 15 minutes)
- **Input Validation** using Zod schemas
- **CORS Protection** with configurable origins
- **SQL Injection Prevention** via Prisma ORM
- **Password Hashing** with bcrypt

## 💾 Backup System

### Automated Backups
- **Schedule**: Daily at 5:00 PM
- **Method**: PostgreSQL pg_dump with compression
- **Retention**: 30 days (configurable)
- **Verification**: Automatic integrity checks
- **Storage**: Local filesystem with cloud-ready structure

### Manual Backup Operations
```bash
# Create backup
npm run backup

# List all backups
npm run backup list

# Restore from backup
npm run backup restore <backup_id>
```

## 🔧 Environment Configuration

### Backend (.env)
```env
DATABASE_URL="postgresql://tasktracker:tasktracker123@localhost:5432/task_tracker"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NODE_ENV="development"
PORT=5000
BACKUP_SCHEDULE="0 17 * * *"  # Daily at 5pm
BACKUP_RETENTION_DAYS=30
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

## 📱 Usage Guide

### 1. Time Tracking
1. Login to the application
2. Navigate to Dashboard
3. Select a task from the dropdown
4. Click the green **START** button
5. Work on your task
6. Click the red **STOP** button when done
7. Add description of work completed

### 2. Task Management
1. Go to Tasks page
2. Click **Add Task** to create new tasks
3. Fill in task details including:
   - Title and description
   - Halo ticket ID (optional)
   - Client assignment
   - Category (Admin, Automation, L4, etc.)
   - Priority level
   - Due date

### 3. Reporting
1. Visit Reports page
2. Select date range for reports
3. Generate daily summaries
4. Export to CSV for Halo integration
5. View time breakdown by client/category

### 4. Halo Integration
1. Add Halo ticket IDs to tasks
2. Use Reports → Halo Export
3. Select date range
4. Download CSV file
5. Import into Halo system

## 🚨 Troubleshooting

### Windows PowerShell Issues
```powershell
# Use correct Docker command
docker compose up

# Check Docker installation
docker --version
docker compose version

# Start Docker Desktop first
```

### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :4000
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <process_id> /F
```

### Database Connection Issues
```bash
# Reset database
docker compose down
docker volume prune
docker compose up
```

### Permission Issues (Linux/Mac)
```bash
# Fix file permissions
chmod +x docker-compose.yml
sudo chown -R $USER:$USER .
```

## 🔮 Future Enhancements (Phase 2)

- [ ] **Direct Halo API Integration** - Real-time sync with Halo
- [ ] **Mobile Application** - iOS/Android apps
- [ ] **Advanced Analytics** - Detailed productivity insights
- [ ] **Team Management** - Multi-user support
- [ ] **Integration Hub** - Connect with other tools
- [ ] **Performance Optimization** - Faster loading times
- [ ] **Offline Support** - Work without internet
- [ ] **Custom Workflows** - Configurable business processes

## 📝 License

This project is licensed under the MIT License.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs: `docker compose logs`
3. Verify all services are running: `docker compose ps`
4. Check environment configuration

## 🏗️ Development

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### Code Style
- **Backend**: ESLint + Prettier
- **Frontend**: ESLint + Prettier + TypeScript strict mode
- **Database**: Prisma naming conventions

---

**Built with ❤️ for bulletproof task tracking and time management**