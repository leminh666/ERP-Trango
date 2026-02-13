# Docker Deployment Guide - ERP Trango v3.0

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Development Environment](#development-environment)
3. [Production Environment](#production-environment)
4. [Database Migration](#database-migration)
5. [Backup & Restore](#backup--restore)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop for Windows/Mac
- Docker Engine + Docker Compose for Linux
- Minimum 4GB RAM available for containers

### Check Docker Installation

```bash
docker --version        # Should be 20.x+
docker compose version  # Should be 2.x+
```

---

## 🖥️ Development Environment

### 1. Start All Services

```bash
# Navigate to project root
cd E:\tran-go-hoang-gia-erp

# Start all services (db, api, web)
docker compose up -d --build

# View logs
docker compose logs -f

# Or view logs for specific service
docker compose logs -f api
docker compose logs -f web
```

### 2. Access Development Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js Web Application |
| Backend API | http://localhost:4000 | NestJS API |
| API Docs | http://localhost:4000/docs | Swagger Documentation |
| Health Check | http://localhost:4000/health | Backend Health Status |

### 3. Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v
```

---

## 🏭 Production Environment

### 1. Prepare Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production values
# IMPORTANT: Change JWT_SECRET to a strong random value
nano .env.production
```

### 2. Start Production Services

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services (keep data)
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes all data)
docker compose -f docker-compose.prod.yml down -v
```

### 3. Access Production Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://your-domain.com | Web Application |
| API | http://your-domain.com/api | Backend API |
| Docs | http://your-domain.com/docs | Swagger Documentation |

---

## 🗄️ Database Migration

### Run Migrations (Development)

```bash
# Run migrations in api container
docker compose exec api npx prisma migrate deploy

# Or for fresh database
docker compose exec api npx prisma migrate dev --name init
```

### Run Migrations (Production)

```bash
# Deploy migrations (non-destructive)
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Check migration status
docker compose -f docker-compose.prod.yml exec api npx prisma migrate status
```

### Seed Database (Development Only)

```bash
# Run seed script
docker compose exec api npx prisma db seed
```

### Open Prisma Studio (Development)

```bash
# Open Prisma Studio in browser
docker compose exec api npx prisma studio
```

---

## 💾 Backup & Restore

### Backup Database

```bash
# Create backup
docker compose exec db pg_dump -U postgres tran_go_hoang_gia_erp > backup_$(date +%Y%m%d_%H%M%S).sql

# Or with compression
docker compose exec db pg_dump -U postgres tran_go_hoang_gia_erp | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# Restore from backup
docker compose exec -T db psql -U postgres -d tran_go_hoang_gia_erp < backup_file.sql

# Restore from compressed backup
gunzip -c backup_file.sql.gz | docker compose exec -T db psql -U postgres -d tran_go_hoang_gia_erp
```

### Backup with Docker Volume

```bash
# Backup volume to tarball
docker run --rm -v erp-network-prod_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore from tarball
docker run --rm -v erp-network-prod_postgres_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/postgres_backup_20240101.tar.gz --strip-components=1"
```

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :5432

# Kill process (replace PID with actual process ID)
taskkill /PID 12345 /F
```

### Container Won't Start

```bash
# Check container logs
docker compose logs api
docker compose logs web
docker compose logs db

# Check container status
docker compose ps

# Restart specific service
docker compose restart api
docker compose restart web
```

### Database Connection Failed

```bash
# Check database health
docker compose exec db pg_isready -U postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Recreate containers
docker compose down
docker compose up -d
```

### Reset Everything (Development)

```bash
# Stop all containers
docker compose down

# Remove all volumes
docker compose down -v

# Remove all images (optional)
docker rmi erp-api-dev erp-web-dev nginx:alpine

# Rebuild and start
docker compose up -d --build
```

### View Container Resources

```bash
# View running containers
docker stats

# View container details
docker inspect erp-api-dev
docker inspect erp-web-dev
```

---

## 📦 Build & Deploy to VPS

### Option 1: Build on VPS

```bash
# On VPS, clone the repository
git clone <your-repo-url>
cd erp-trango-v3

# Copy environment file
cp .env.production.example .env.production
# Edit .env.production with production values

# Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

### Option 2: Build Locally and Push

```bash
# Build images locally
docker build -t erp-api ./apps/api
docker build -t erp-web ./apps/web

# Save images to tarball
docker save erp-api | gzip > erp-api.tar.gz
docker save erp-web | gzip > erp-web.tar.gz

# Transfer to VPS (using scp or similar)
scp erp-api.tar.gz erp-web.tar.gz user@vps:/path/to/project/

# On VPS
docker load < erp-api.tar.gz
docker load < erp-web.tar.gz

# Update docker-compose to use loaded images
# Change "build:" to "image: erp-api" in docker-compose.prod.yml
```

---

## 🔒 Security Checklist for Production

- [ ] Change `JWT_SECRET` to a strong random value (32+ characters)
- [ ] Change PostgreSQL password
- [ ] Enable HTTPS with SSL certificates
- [ ] Restrict `WEB_CORS_ORIGINS` to your frontend domain
- [ ] Disable `ENABLE_LOGGING` in production
- [ ] Use secrets management (Docker Swarm, Kubernetes, or external vault)
- [ ] Regular database backups
- [ ] Keep Docker images updated

---

## 📞 Useful Commands

```bash
# View all containers
docker ps -a

# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes (WARNING: deletes data)
docker volume prune -f

# Full system cleanup
docker system prune -a -f --volumes
```

---

## 📁 File Structure

```
erp-trango-v3/
├── apps/
│   ├── api/
│   │   ├── Dockerfile          # Multi-stage build
│   │   ├── prisma/
│   │   └── src/
│   └── web/
│       ├── Dockerfile          # Multi-stage build (standalone)
│       ├── next.config.js
│       └── src/
├── nginx.conf                  # Reverse proxy config
├── docker-compose.yml          # Development
├── docker-compose.prod.yml      # Production
├── .dockerignore
├── .env.production.example     # Template for production env
└── README-DOCKER.md            # This file
```

