# Deployment Guide

This guide covers deploying FlashFusion to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:

- ✅ Repository cloned locally
- ✅ Dependencies installed (`npm install`)
- ✅ Build tested locally (`npm run build`)
- ✅ Supabase project created
- ✅ Environment variables configured

---

## Environment Variables

All deployment platforms need these environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Vercel Deployment (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

```bash
# First deployment (follow prompts)
vercel

# Production deployment
vercel --prod
```

### Step 4: Configure Environment Variables

In the Vercel dashboard:

1. Go to Project Settings
2. Navigate to Environment Variables
3. Add all required variables
4. Redeploy for changes to take effect

### Vercel Configuration File

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## Netlify Deployment

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Initialize and Deploy

```bash
# Initialize
netlify init

# Deploy to production
netlify deploy --prod --dir=dist
```

### Netlify Configuration

Create `netlify.toml`:

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

---

## AWS Amplify

### Step 1: Install Amplify CLI

```bash
npm install -g @aws-amplify/cli
```

### Step 2: Initialize Amplify

```bash
amplify init
```

### Step 3: Add Hosting

```bash
amplify add hosting
```

### Step 4: Deploy

```bash
amplify publish
```

### Amplify Configuration

The CLI will create `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing
    location / {
      try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
  }
}
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
      - VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t flashfusion .

# Run container
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=your-url \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=your-key \
  -e VITE_SUPABASE_PROJECT_ID=your-id \
  flashfusion

# Or use Docker Compose
docker-compose up -d
```

---

## GitHub Pages

### Step 1: Update vite.config.ts

```typescript
export default defineConfig({
  base: '/fusion-stage-hub/', // Your repo name
  // ... rest of config
});
```

### Step 2: Build for GitHub Pages

```bash
npm run build
```

### Step 3: Deploy

Using `gh-pages` package:

```bash
npm install -D gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

Or manually:
```bash
# Create gh-pages branch
git checkout -b gh-pages

# Copy dist contents
cp -r dist/* .

# Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

---

## Custom Server (VPS/Dedicated)

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Build the project
npm run build

# Serve with PM2
pm2 serve dist 8080 --spa --name flashfusion

# Save PM2 configuration
pm2 save

# Set up auto-start on reboot
pm2 startup
```

### Using Systemd

Create `/etc/systemd/system/flashfusion.service`:

```ini
[Unit]
Description=FlashFusion
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/flashfusion
ExecStart=/usr/bin/npm run preview
Restart=on-failure
Environment="VITE_SUPABASE_URL=your-url"
Environment="VITE_SUPABASE_PUBLISHABLE_KEY=your-key"
Environment="VITE_SUPABASE_PROJECT_ID=your-id"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable flashfusion
sudo systemctl start flashfusion
sudo systemctl status flashfusion
```

---

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx SSL Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  # ... rest of config
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}
```

---

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build -- --analyze

# Optimize images
npm install -D vite-plugin-imagemin
```

### CDN Configuration

Use Cloudflare or similar CDN:

1. Point DNS to CDN
2. Enable caching for static assets
3. Configure cache rules:
   - HTML: No cache or short TTL (5 min)
   - JS/CSS: Long TTL (1 year)
   - Images: Long TTL (1 year)

### Caching Headers

```nginx
# In nginx.conf
location ~* \.(html)$ {
  expires 5m;
  add_header Cache-Control "public, must-revalidate";
}

location ~* \.(js|css)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

---

## Monitoring

### Health Check Endpoint

Create `public/health.json`:

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- Better Uptime
- StatusCake

Configure to check:
- Homepage (/)
- Health endpoint (/health.json)
- API endpoints

---

## Rollback Procedures

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### Docker

```bash
# Tag versions
docker tag flashfusion:latest flashfusion:v1.0.0

# Rollback
docker-compose down
docker-compose up -d flashfusion:v1.0.0
```

### Git-based

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset (destructive)
git reset --hard <commit-hash>
git push --force origin main
```

---

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules dist .vite
npm install
npm run build
```

### Environment Variables Not Working

- Ensure variables start with `VITE_`
- Rebuild after changing variables
- Check .env is not in .gitignore for deployment

### Routing Issues (404 on Refresh)

- Ensure server is configured for SPA routing
- Check redirects/rewrites configuration
- Verify nginx try_files directive

### Performance Issues

- Enable gzip compression
- Use CDN
- Optimize images
- Enable caching
- Check bundle size

---

## Deployment Checklist

- [ ] Code is tested locally
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Supabase project set up
- [ ] SSL certificate configured
- [ ] DNS records updated
- [ ] Monitoring enabled
- [ ] Backup strategy in place
- [ ] Rollback procedure tested
- [ ] Documentation updated

---

## Post-Deployment

1. **Test the deployment**
   - Check all pages load
   - Test core workflows
   - Verify API connectivity

2. **Monitor for issues**
   - Check error logs
   - Monitor performance
   - Watch for alerts

3. **Update DNS** (if needed)
   - Update A/CNAME records
   - Wait for propagation

4. **Announce deployment**
   - Notify team
   - Update status page
   - Document changes

---

For deployment support, open a GitHub issue or discussion.
