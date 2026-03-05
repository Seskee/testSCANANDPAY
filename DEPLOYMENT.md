# QuickPay - Deployment Guide

This guide provides step-by-step instructions for deploying QuickPay to various hosting platforms.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
   - [Option 1: Heroku (Easiest)](#option-1-heroku-easiest)
   - [Option 2: DigitalOcean/AWS/VPS](#option-2-digitaloceanawsvps)
   - [Option 3: Vercel + Railway](#option-3-vercel--railway)
   - [Option 4: Docker](#option-4-docker)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] **MongoDB Atlas Account** (or other managed MongoDB)
- [ ] **Stripe Account** with API keys (live mode for production)
- [ ] **Email Service** credentials (Gmail, SendGrid, etc.)
- [ ] **Domain Name** (optional but recommended)
- [ ] **SSL Certificate** (Let's Encrypt or provider)
- [ ] All code committed to Git repository

---

## Environment Setup

### 1. MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create database user with password
4. Whitelist IP addresses (0.0.0.0/0 for any IP, or specific IPs)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/QuickPay?retryWrites=true&w=majority
   ```

### 2. Stripe Setup

1. Create account at [Stripe](https://stripe.com)
2. Enable Stripe Connect in dashboard
3. Get API keys from Dashboard > Developers > API keys
4. For production, use **live** keys (sk_live_...)
5. Configure webhook endpoints (if needed)

### 3. Email Service Setup

**Option A: Gmail**
1. Enable 2-factor authentication on Google account
2. Generate App Password: Account > Security > App passwords
3. Use credentials in environment variables

**Option B: SendGrid**
1. Create account at [SendGrid](https://sendgrid.com)
2. Verify sender email
3. Create API key
4. Use in environment variables

---

## Deployment Options

## Option 1: Heroku (Easiest)

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create quickpay-production
   ```

4. **Add MongoDB Atlas Add-on** (or configure manually)
   ```bash
   # Option 1: Use add-on
   heroku addons:create mongolab:sandbox

   # Option 2: Set manually
   heroku config:set DATABASE_URL="mongodb+srv://..."
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set JWT_SECRET="your_jwt_secret"
   heroku config:set REFRESH_TOKEN_SECRET="your_refresh_secret"
   heroku config:set STRIPE_SECRET_KEY="sk_live_your_key"
   heroku config:set EMAIL_HOST="smtp.gmail.com"
   heroku config:set EMAIL_PORT="587"
   heroku config:set EMAIL_USER="your-email@gmail.com"
   heroku config:set EMAIL_PASSWORD="your-app-password"
   heroku config:set EMAIL_FROM="noreply@yourdomain.com"
   ```

6. **Create Procfile** (in root directory)
   ```
   web: node server/server.js
   ```

7. **Configure package.json** (in root)
   ```json
   {
     "scripts": {
       "start": "node server/server.js",
       "heroku-postbuild": "cd client && npm install && npm run build"
     }
   }
   ```

8. **Serve Frontend from Backend** (update server/server.js)
   ```javascript
   // Add after other middleware
   const path = require('path');

   // Serve static files from React app
   app.use(express.static(path.join(__dirname, '../client/dist')));

   // Handle React routing, return all requests to React app
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../client/dist/index.html'));
   });
   ```

9. **Deploy**
   ```bash
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku main
   ```

10. **Open App**
    ```bash
    heroku open
    ```

---

## Option 2: DigitalOcean/AWS/VPS

### Prerequisites
- VPS with Ubuntu 20.04+ (or similar)
- Domain name (optional)
- SSH access

### Steps

1. **Connect to Server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Update System**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt install -y nodejs
   ```

4. **Install MongoDB** (optional if using Atlas)
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   apt update
   apt install -y mongodb-org
   systemctl start mongod
   systemctl enable mongod
   ```

5. **Install Git**
   ```bash
   apt install -y git
   ```

6. **Clone Repository**
   ```bash
   cd /var/www
   git clone <your-repo-url> quickpay
   cd quickpay
   ```

7. **Install Dependencies**
   ```bash
   npm install
   cd client && npm install && npm run build
   cd ../server && npm install
   cd ..
   ```

8. **Create Environment File**
   ```bash
   cd server
   nano .env
   # Add all environment variables
   # Save with Ctrl+X, Y, Enter
   ```

9. **Install PM2** (Process Manager)
   ```bash
   npm install -g pm2
   ```

10. **Start Application**
    ```bash
    cd /var/www/quickpay
    pm2 start server/server.js --name quickpay
    pm2 save
    pm2 startup
    ```

11. **Install Nginx**
    ```bash
    apt install -y nginx
    ```

12. **Configure Nginx**
    ```bash
    nano /etc/nginx/sites-available/quickpay
    ```

    Add configuration:
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

    Enable site:
    ```bash
    ln -s /etc/nginx/sites-available/quickpay /etc/nginx/sites-enabled/
    nginx -t
    systemctl restart nginx
    ```

13. **Install SSL with Let's Encrypt**
    ```bash
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```

14. **Configure Firewall**
    ```bash
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    ufw enable
    ```

---

## Option 3: Vercel + Railway

This option separates frontend (Vercel) and backend (Railway).

### Frontend (Vercel)

1. **Push code to GitHub**

2. **Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Connect GitHub account

3. **Import Project**
   - Click "New Project"
   - Select your repository
   - Configure:
     - Framework: Vite
     - Root Directory: `client`
     - Build Command: `npm run build`
     - Output Directory: `dist`

4. **Add Environment Variables**
   - Add `VITE_API_URL` with Railway backend URL

5. **Deploy**
   - Click "Deploy"
   - Get deployment URL

### Backend (Railway)

1. **Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Connect GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**
   - Root Directory: `server`
   - Start Command: `node server.js`

4. **Add Variables**
   - Add all environment variables from `.env`

5. **Add MongoDB**
   - Click "New" > "Database" > "Add MongoDB"
   - Copy connection string to `DATABASE_URL`

6. **Deploy**
   - Railway auto-deploys on git push
   - Get deployment URL

7. **Update Frontend**
   - Update `VITE_API_URL` in Vercel with Railway URL
   - Redeploy Vercel

---

## Option 4: Docker

### Prerequisites
- Docker installed
- Docker Compose installed

### Steps

1. **Create Dockerfile** (root directory)
   ```dockerfile
   # Frontend build
   FROM node:18-alpine AS frontend-build
   WORKDIR /app/client
   COPY client/package*.json ./
   RUN npm install
   COPY client/ ./
   RUN npm run build

   # Backend
   FROM node:18-alpine
   WORKDIR /app
   COPY server/package*.json ./
   RUN npm install --production
   COPY server/ ./
   COPY --from=frontend-build /app/client/dist ./public

   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'

   services:
     mongodb:
       image: mongo:6
       restart: always
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db
       environment:
         MONGO_INITDB_DATABASE: QuickPay

     app:
       build: .
       restart: always
       ports:
         - "3000:3000"
       depends_on:
         - mongodb
       environment:
         - PORT=3000
         - DATABASE_URL=mongodb://mongodb:27017/QuickPay
         - JWT_SECRET=${JWT_SECRET}
         - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
         - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
         - EMAIL_HOST=${EMAIL_HOST}
         - EMAIL_PORT=${EMAIL_PORT}
         - EMAIL_USER=${EMAIL_USER}
         - EMAIL_PASSWORD=${EMAIL_PASSWORD}
         - EMAIL_FROM=${EMAIL_FROM}

   volumes:
     mongodb_data:
   ```

3. **Create .env file** (for docker-compose)
   ```env
   JWT_SECRET=your_jwt_secret
   REFRESH_TOKEN_SECRET=your_refresh_secret
   STRIPE_SECRET_KEY=sk_live_your_key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Build and Run**
   ```bash
   docker-compose up -d
   ```

5. **View Logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop**
   ```bash
   docker-compose down
   ```

---

## Post-Deployment

### 1. Verify Deployment

1. **Check Application**
   - Visit your domain/URL
   - Test homepage loads

2. **Test Authentication**
   - Try registering a new account
   - Login with credentials
   - Verify JWT token works

3. **Test Payment Flow**
   - Create a test bill
   - Generate QR code
   - Scan and pay
   - Verify Stripe payment

4. **Test Email**
   - Complete a payment
   - Check receipt email delivery

### 2. Monitor Application

**Set up monitoring:**
- Application logs
- Error tracking (Sentry, Rollbar)
- Uptime monitoring (UptimeRobot, Pingdom)
- Performance monitoring (New Relic, DataDog)

**PM2 Monitoring:**
```bash
pm2 monit
pm2 logs quickpay
```

### 3. Set Up Backups

**MongoDB Backups:**
```bash
# Manual backup
mongodump --uri="mongodb://..." --out=/backups/$(date +%Y%m%d)

# Automated with cron
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

### 4. Configure Domain

1. **Update DNS Records**
   - A Record: Point to server IP
   - CNAME: www to domain
   - MX Records: Email (if applicable)

2. **SSL Certificate**
   - Already configured with Let's Encrypt
   - Auto-renewal enabled

### 5. Security Hardening

```bash
# Update firewall
ufw status

# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd

# Set up fail2ban
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
# PM2
pm2 logs quickpay

# Heroku
heroku logs --tail

# Docker
docker-compose logs
```

**Common issues:**
- Missing environment variables
- Database connection failed
- Port already in use
- Node version mismatch

### Database Connection Issues

**MongoDB Atlas:**
- Check IP whitelist
- Verify connection string
- Check credentials
- Ensure database user exists

**Local MongoDB:**
```bash
# Check status
systemctl status mongod

# Restart
systemctl restart mongod
```

### Stripe Payment Errors

- Verify API keys are correct
- Check test vs live mode
- Ensure Stripe Connect is enabled
- Verify webhook configuration

### Email Not Sending

- Check email credentials
- Verify SMTP settings
- Check spam folder
- Review nodemailer logs
- Test with simple send

### SSL Certificate Issues

```bash
# Renew certificate
certbot renew

# Test renewal
certbot renew --dry-run
```

### High Memory Usage

```bash
# Check PM2 processes
pm2 status

# Restart application
pm2 restart quickpay

# Set memory limit
pm2 start server.js --max-memory-restart 500M
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor logs for errors
- Check application uptime

**Weekly:**
- Review database performance
- Check disk space
- Monitor payment success rate

**Monthly:**
- Update dependencies
- Review security logs
- Backup database
- Test disaster recovery

### Updates

**Update Application:**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install
cd client && npm install && npm run build
cd ../server && npm install

# Restart
pm2 restart quickpay
```

**Update Dependencies:**
```bash
# Check outdated
npm outdated

# Update
npm update

# Or use npm-check-updates
npm install -g npm-check-updates
ncu -u
npm install
```

---

## Scaling

### Horizontal Scaling

**Load Balancer + Multiple Instances:**
```bash
# Start multiple instances with PM2
pm2 start server.js -i max --name quickpay
```

**Nginx Load Balancing:**
```nginx
upstream quickpay {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://quickpay;
    }
}
```

### Vertical Scaling

- Upgrade server resources (CPU, RAM)
- Optimize database queries
- Add caching (Redis)
- CDN for static assets

---

## Rollback

**In case of issues:**

```bash
# PM2
pm2 stop quickpay
git reset --hard HEAD~1
npm install
pm2 start quickpay

# Heroku
heroku rollback

# Docker
docker-compose down
git reset --hard HEAD~1
docker-compose up -d --build
```

---

## Support

For deployment assistance:
- Review logs first
- Check this guide
- Consult `PROJECT_EXPORT.md`
- Contact development team

---

*Last Updated: December 27, 2024*
