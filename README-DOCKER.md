# Docker Deployment Guide - ERP Trango v3.0

## Overview

This guide covers deploying ERP Trango v3.0 using Docker Compose.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                    │
│                    (Public Entry Point)                  │
│                         :80/:443                          │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌──────────────┐      ┌──────────────┐
   │   Frontend   │      │    Backend   │
   │  Next.js    │      │   NestJS    │
   │   :3000     │      │    :4000    │
   └──────┬───────┘      └──────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
              ┌──────────────┐
              │  PostgreSQL  │
              │    :5432     │
              └──────────────┘
```

---

## Quick Start

### 1. Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- At least 4GB RAM
- 20GB disk space

### 2. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/leminh666/ERP-Trango.git
cd ERP-Trango

# Create production environment file
cp .env.prod.example .env.prod

# Edit the .env.prod file with your values
nano .env.prod
```

### 3. Start Production

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

### 4. Database Migration

```bash
# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# (Optional) Seed database
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

### 5. Access Application

- **Frontend**: http://your-server-ip or http://your-domain.com
- **API**: http://your-server-ip/api or http://your-domain.com/api
- **API Docs**: http://your-server-ip/docs or http://your-domain.com/docs

---

## Development Mode

### Start Development Environment

```bash
# Build and start dev services
docker compose up -d --build

# Access via:
# - Frontend: http://localhost
# - Backend: http://localhost/api
```

### For Mobile/LAN Testing

1. Find your computer's LAN IP:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`

2. Access from mobile:
   ```
   http://<YOUR_LAN_IP>
   ```

---

## Environment Variables

### Production (.env.prod)

| Variable | Description | Example |
|----------|-------------|---------|
| POSTGRES_USER | Database username | postgres |
| POSTGRES_PASSWORD | Database password | securepassword123 |
| POSTGRES_DB | Database name | tran_go_hoang_gia_erp |
| JWT_SECRET | JWT signing secret | random-256-bit-string |
| JWT_EXPIRES_IN | Token expiration | 7d |
| FRONTEND_URL | Frontend URL for CORS | https://domain.com |

---

## Database Management

### Backup Database

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres tran_go_hoang_gia_erp > backup.sql

# Restore backup
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres tran_go_hoang_gia_erp
```

### Reset Database

```bash
# WARNING: This will delete all data!
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## Troubleshooting

### Check Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs web
docker compose -f docker-compose.prod.yml logs nginx
```

### Common Issues

#### 1. "Connection refused" to API

- Check if nginx is running: `docker compose ps`
- Check nginx logs: `docker compose logs nginx`
- Verify backend is healthy: `curl http://localhost:4000/health`

#### 2. CORS Errors

- Verify FRONTEND_URL in .env.prod
- Check backend logs for CORS configuration

#### 3. Database Connection Failed

- Wait for PostgreSQL to be ready (check health)
- Verify DATABASE_URL in backend logs

#### 4. Uploaded Files Not Showing

- Check api_uploads volume is mounted
- Verify file permissions

---

## SSL/HTTPS Setup (Optional)

### Using Certbot

```bash
# Initial setup with SSL
# 1. Start services first
docker compose -f docker-compose.prod.yml up -d --build

# 2. Get initial SSL certificate
docker compose -f docker-compose.prod.yml run --rm certbot certonly -v

# 3. Edit nginx.conf to include SSL configuration
# 4. Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Ports Reference

| Service | Internal Port | External (Prod) |
|---------|---------------|------------------|
| Nginx | 80, 443 | 80, 443 |
| PostgreSQL | 5432 | - (internal) |
| API | 4000 | - (internal) |
| Frontend | 3000 | - (internal) |

---

## Security Notes

1. Change default JWT_SECRET in production
2. Use strong PostgreSQL password
3. Enable SSL/HTTPS in production
4. Keep Docker images updated
5. Configure firewall to only allow ports 80/443

---

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations if needed
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Stop Services

```bash
# Stop (keep data)
docker compose -f docker-compose.prod.yml stop

# Stop (remove containers, keep data)
docker compose -f docker-compose.prod.yml down

# Stop (remove everything including data)
docker compose -f docker-compose.prod.yml down -v
```
