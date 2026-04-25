# XeroBase-Budgets
This is for the CS coding challnge 2026SP. To create a website for a online budgeting software.

# Idea
Create a zero base budgeting software so I can access it anywhere. And easily be able to add data and to budget properly.

How to setup the repo for production:

### First setup cloudflare and setup tunnels to the service. Then add this docker-config.yml file:

services:
  db:
    image: postgres:18.3
    container_name: postgres_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: "<password>"
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    networks:
      - pg_network

  pgadmin:
    image: dpage/pgadmin4
    container_name: pgadmin_container
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: <email>
      PGADMIN_DEFAULT_PASSWORD: "<password>"
    ports:
      - "5050:80"
    networks:
      - pg_network

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared_tunnel
    restart: always
    command: tunnel run --token <token>
    networks:
      - pg_network

networks:
  pg_network:
    driver: bridge


### Afterwards clone the code to your home directory or /var/<project> #reccomended
### Then create your .env file in the root of the project

# .env
DB_NAME=mydb
DB_USER=admin
DB_PWD=<password>
DB_HOST=localhost
DB_PORT=5432

### Then start docker with: docker compose up -d where your docker-compose.yml file lives

### Then start Django:

cd XeroBase-Budgets/backend

# First time only
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Every time
source venv/bin/activate
python3 manage.py migrate

### Then start react with:

cd XeroBase-Budgets/xerobase-project
npm install                        # first time only
npm run build

### Install Gunicorn and Nginx
bash# Gunicorn (inside your venv)
cd XeroBase-Budgets/backend
source venv/bin/activate
pip install gunicorn

# Nginx
sudo apt install nginx -y

### Create a Gunicorn systemd service
bash

sudo nano /etc/systemd/system/xerobase-django.service

ini[Unit]
Description=XeroBase Django (Gunicorn)
After=network.target

[Service]
User=pitlug
WorkingDirectory=/home/pitlug/XeroBase-Budgets/backend
EnvironmentFile=/home/pitlug/XeroBase-Budgets/.env
ExecStart=/home/pitlug/XeroBase-Budgets/backend/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
bashsudo systemctl daemon-reload
sudo systemctl enable --now xerobase-django
sudo systemctl status xerobase-django   # confirm it's running

### Configure Nginx
bash

sudo nano /etc/nginx/sites-available/xerobase

nginxserver {
    listen 80;
    server_name _;   # accept any hostname/IP

    # Serve React static files
    root /home/pitlug/XeroBase-Budgets/xerobase-project/dist;
    index index.html;

    # React Router — serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Django/Gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy auth endpoints
    location /api-auth/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    #Django static files (admin CSS etc.)
    location /static/ {
        alias /home/pitlug/XeroBase-Budgets/backend/staticfiles/;
    }
}

bash
### Enable the site
sudo ln -s /etc/nginx/sites-available/xerobase /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # remove default placeholder

### Test config and reload
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

### Collect Django static files:

cd XeroBase-Budgets/backend

source venv/bin/activate

### Add to settings.py if not already there
### STATIC_ROOT = BASE_DIR / "staticfiles"

python manage.py collectstatic --no-input

- When you make code changes

### After React changes — rebuild
cd xerobase-project && npm run build

### After Django changes — restart gunicorn
sudo systemctl restart xerobase-django

- If having problems with NGINX:

Check Nginx has permission to read the folder:
sudo chmod o+x /home/pitlug
sudo chmod o+x /home/pitlug/XeroBase-Budgets
sudo chmod o+x /home/pitlug/XeroBase-Budgets/xerobase-project
sudo chmod o+x /home/pitlug/XeroBase-Budgets/xerobase-project/dist

Test and reload Nginx:
sudo nginx -t
sudo systemctl reload nginx

Confirm what Nginx is actually serving:
### Should show your dist folder contents
ls /home/pitlug/XeroBase-Budgets/xerobase-project/dist

### Rebuild React with the fix
cd ~/XeroBase-Budgets/xerobase-project
npm run build

### Restart Django/Gunicorn
sudo systemctl restart xerobase-django

### Reload Nginx
sudo systemctl reload nginx