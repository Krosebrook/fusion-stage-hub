# Deployment Guide

Complete guide to deploying Fusion Stage Hub to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Frontend Deployment](#frontend-deployment)
4. [Backend Deployment (Supabase)](#backend-deployment-supabase)
5. [DNS & Domain Configuration](#dns--domain-configuration)
6. [SSL/TLS Certificates](#ssltls-certificates)
7. [Environment Variables](#environment-variables)
8. [Database Migrations](#database-migrations)
9. [Monitoring & Logging](#monitoring--logging)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Rollback Procedures](#rollback-procedures)
12. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### Required Accounts

- [ ] **GitHub Account** (for repository and CI/CD)
- [ ] **Supabase Account** (for backend services)
- [ ] **Vercel/Netlify Account** (for frontend hosting)
- [ ] **Domain Registrar** (for custom domain)
- [ ] **Sentry Account** (optional, for error monitoring)

### Required Tools

- [ ] **Git** for version control
- [ ] **Node.js** 18+ and npm
- [ ] **Supabase CLI** (`npm install -g supabase`)
- [ ] **Vercel CLI** (`npm install -g vercel`) or **Netlify CLI**

---

## Environment Setup

### Development Environment

```bash
# .env.development
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:8080
```

### Staging Environment

```bash
# .env.staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
VITE_APP_ENV=staging
VITE_API_BASE_URL=https://staging.fusionstagehub.com
```

### Production Environment

```bash
# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
VITE_APP_ENV=production
VITE_API_BASE_URL=https://fusionstagehub.com
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

**Why Vercel?**
- ✅ Optimized for Vite/React
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Zero-config deployment

#### Initial Setup

1. **Connect Repository**:
   ```bash
   vercel login
   vercel link
   ```

2. **Configure Project**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all `VITE_*` variables from `.env.production`

4. **Deploy**:
   ```bash
   vercel --prod
   ```

#### Automatic Deployments

**GitHub Integration** (automatic):
- Push to `main` → Production deploy
- Push to `develop` → Preview deploy
- Open PR → Preview deploy with unique URL

---

### Option 2: Netlify

#### Initial Setup

1. **Create `netlify.toml`**:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   
   [build.environment]
     NODE_VERSION = "18"
   ```

2. **Deploy**:
   ```bash
   netlify login
   netlify init
   netlify deploy --prod
   ```

3. **Add Environment Variables**:
   - Netlify Dashboard → Site Settings → Environment Variables

---

### Option 3: Self-Hosted (Docker)

#### Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Create `nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### Build and Deploy

```bash
# Build image
docker build -t fusion-stage-hub:latest .

# Run container
docker run -d \
  --name fusion-hub \
  -p 80:80 \
  -e VITE_SUPABASE_URL=$SUPABASE_URL \
  fusion-stage-hub:latest
```

---

## Backend Deployment (Supabase)

### Setting Up Production Database

1. **Create Production Project**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose region (closest to users)
   - Set strong database password

2. **Link Local Project**:
   ```bash
   supabase link --project-ref <production-project-id>
   ```

3. **Run Migrations**:
   ```bash
   supabase db push
   ```

4. **Verify Schema**:
   ```sql
   -- In Supabase SQL Editor
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

### Configuring Row Level Security (RLS)

RLS policies should already be included in migrations, but verify:

```sql
-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies;
```

### Setting Up Edge Functions

1. **Create Functions** (example: job worker):
   ```bash
   supabase functions new job-worker
   ```

2. **Deploy Function**:
   ```bash
   supabase functions deploy job-worker
   ```

3. **Set Function Secrets**:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

4. **Schedule Function** (using pg_cron):
   ```sql
   SELECT cron.schedule(
     'process-jobs',
     '*/10 * * * *', -- Every 10 minutes
     $$
     SELECT net.http_post(
       url:='https://<project-id>.supabase.co/functions/v1/job-worker',
       headers:='{"Authorization": "Bearer <anon-key>"}'
     ) AS request_id;
     $$
   );
   ```

---

## DNS & Domain Configuration

### Configure DNS Records

**For Vercel**:
```
Type    Name    Value                           TTL
A       @       76.76.21.21                     3600
CNAME   www     cname.vercel-dns.com           3600
```

**For Netlify**:
```
Type    Name    Value                           TTL
A       @       75.2.60.5                       3600
CNAME   www     yoursite.netlify.app           3600
```

### Configure in Hosting Platform

1. **Vercel**: Project Settings → Domains → Add Domain
2. **Netlify**: Site Settings → Domain Management → Add Custom Domain

### Verify DNS

```bash
# Check DNS propagation
nslookup fusionstagehub.com
dig fusionstagehub.com

# Online tools
https://dnschecker.org
```

---

## SSL/TLS Certificates

### Automatic SSL (Vercel/Netlify)

- **Vercel**: Automatic Let's Encrypt certificates
- **Netlify**: Automatic Let's Encrypt certificates

### Manual SSL (Self-Hosted)

Using Certbot with Nginx:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d fusionstagehub.com -d www.fusionstagehub.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

---

## Environment Variables

### Secure Storage

**Never commit to Git**:
```bash
# .gitignore
.env
.env.local
.env.production
.env.staging
```

**For CI/CD**:
- GitHub: Settings → Secrets → Actions
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

### Required Variables

```bash
# Frontend
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
VITE_APP_ENV=production

# Backend (Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...  # NEVER expose to frontend
SHOPIFY_CLIENT_ID=abc123
SHOPIFY_CLIENT_SECRET=xyz789
ETSY_API_KEY=def456
```

---

## Database Migrations

### Migration Strategy

**Blue-Green Deployment** (zero downtime):

1. **Create new database** (green)
2. **Run migrations** on green
3. **Replicate data** from blue to green
4. **Switch traffic** to green
5. **Keep blue** as backup for rollback

### Running Migrations

```bash
# Production (careful!)
supabase db push --db-url postgresql://user:pass@host:5432/db

# Verify
supabase db diff --schema public
```

### Rollback Migrations

```bash
# Manual rollback (if needed)
supabase migration down <version>
```

---

## Monitoring & Logging

### Frontend Monitoring (Sentry)

1. **Install Sentry**:
   ```bash
   npm install --save @sentry/react
   ```

2. **Initialize**:
   ```typescript
   // src/main.tsx
   import * as Sentry from "@sentry/react";
   
   Sentry.init({
     dsn: "https://...@sentry.io/...",
     environment: import.meta.env.VITE_APP_ENV,
     tracesSampleRate: 1.0,
   });
   ```

3. **Error Boundaries**:
   ```typescript
   <Sentry.ErrorBoundary fallback={<ErrorPage />}>
     <App />
   </Sentry.ErrorBoundary>
   ```

### Backend Monitoring (Supabase)

1. **View Logs**:
   - Supabase Dashboard → Logs → API / Database / Functions

2. **Set Up Alerts**:
   - Supabase Dashboard → Settings → Alerts
   - Configure email notifications for errors

### Uptime Monitoring

**Options**:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

**Configure**:
- HTTP(S) check every 5 minutes
- Alert on 3 consecutive failures
- Check from multiple locations

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Rollback Procedures

### Frontend Rollback (Vercel)

**Instant Rollback**:
1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

**Via CLI**:
```bash
vercel rollback <deployment-url>
```

### Database Rollback

**Option 1: Point-in-Time Recovery** (Supabase):
1. Dashboard → Settings → Backups
2. Choose backup timestamp
3. Restore (creates new project)

**Option 2: Manual Rollback**:
```bash
# Rollback migration
supabase migration down

# Or restore from SQL backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Performance Optimization

### Frontend Optimizations

**1. Code Splitting**:
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

**2. Asset Optimization**:
- Compress images (WebP format)
- Minify CSS/JS (automatic in Vite)
- Enable gzip/brotli compression

**3. Caching Headers**:
```nginx
# Static assets (1 year)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML (no cache)
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

### Database Optimizations

**1. Indexes**:
```sql
-- Frequently queried columns
CREATE INDEX idx_jobs_org_status ON jobs(org_id, status);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_at) WHERE status = 'pending';
```

**2. Connection Pooling**:
- Enable PgBouncer in Supabase Dashboard
- Use transaction mode for short queries

**3. Query Optimization**:
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE org_id = '...';
```

---

## Post-Deployment Checklist

### Immediately After Deploy

- [ ] Verify site is accessible
- [ ] Test login/signup flow
- [ ] Check all major pages load
- [ ] Test critical user flows
- [ ] Monitor error rates (Sentry)
- [ ] Check performance metrics (Lighthouse)
- [ ] Verify analytics tracking

### Within 24 Hours

- [ ] Monitor user feedback
- [ ] Check server logs for errors
- [ ] Verify database performance
- [ ] Test backup/restore procedures
- [ ] Update status page

### Within 1 Week

- [ ] Review monitoring dashboards
- [ ] Analyze user behavior (analytics)
- [ ] Plan next iteration
- [ ] Document lessons learned

---

## Troubleshooting

### Deployment Fails

**Check**:
- Build logs in CI/CD
- Environment variables set correctly
- Dependencies installed
- TypeScript errors

### Site is Slow

**Check**:
- Lighthouse score
- Bundle size (< 500KB gzipped)
- Number of API calls
- Database query performance

### Database Errors

**Check**:
- RLS policies
- Connection pool limits
- Migration status
- Logs in Supabase Dashboard

---

## Support

For deployment issues:

- **Documentation**: Refer to this guide first
- **Platform Docs**: Vercel/Netlify/Supabase documentation
- **Community**: GitHub Discussions
- **Emergency**: Email infrastructure team

---

**Last Updated**: 2024-12-30  
**Version**: 1.0  
**Next Review**: 2025-03-30
