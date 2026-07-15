# Phase 4: DevOps, CI/CD, & Production Deployments

This phase outlines details for deploying Survana V3 securely using containerized clusters, automated integration checks, and reverse proxy caching.

---

## 1. Nginx Reverse Proxy Configuration
To optimize stream buffering, manage SSL handshakes via Let's Encrypt, and serve static built React files directly without hitting Node.js.

### Config Template (`/etc/nginx/sites-available/survana`)
```nginx
server {
    listen 80;
    server_name survana.example.com;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name survana.example.com;

    ssl_certificate /etc/letsencrypt/live/survana.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/survana.example.com/privkey.pem;

    # Gzip compression configuration
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Serve built React SPA files directly
    location / {
        root /var/www/survana/frontend/dist;
        try_files $uri /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Proxy API and Stream requests to Express backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Keepalive timeouts for media streams
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        
        # Disable buffering to pipe chunks directly without caching intermediate buffers
        proxy_buffering off;
    }
}
```

---

## 2. Docker Container Security & User Privileges
Running Docker containers as `root` is a security risk. We modify our runtime to run under the restricted native `node` user.

### Action Items
- Update `/opt/venv` permissions to allow the `node` group to execute python.
- Switch to the default non-root `USER node` inside Dockerfile before running the app.

### Config Template (`Dockerfile` snippet)
```dockerfile
# ... previous steps ...
# Setup python venv under node ownership
RUN python3 -m venv /opt/venv && chown -R node:node /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -U yt-dlp

# Change ownership of app directory before build
WORKDIR /app
COPY --chown=node:node . .

# Run build under node user
USER node

# Start backend server
CMD ["npm", "start", "--prefix", "backend"]
```

---

## 3. GitHub Actions CI/CD Pipeline
Automate lint checks, unit tests, and production code deployments on every commit.

### Config Template (`.github/workflows/deploy.yml`)
```yaml
name: Survana V3 CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js 20
      uses: actions/setup-node@v3
      with:
        node-version: 20
        cache: 'npm'

    - name: Install Monorepo Dependencies
      run: npm run install-all

    - name: Linter Checks
      run: |
        npm run lint --prefix frontend --if-present

    - name: Build Frontend Production Assets
      run: npm run build

  deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: SSH Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/survana
          git pull origin main
          npm run install-all
          npm run build
          pm2 restart survana-v3 || pm2 start backend/src/app.js --name "survana-v3"
