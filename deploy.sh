#!/bin/bash

# Define colors for better visibility
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN} Launching Update...${NC}"

# Backend
echo "Syncing backend..."
cd ~/social-network-prod/backend
./venv/bin/python manage.py migrate
./venv/bin/python manage.py collectstatic --noinput

#Frontend
echo "Building frontend..."
cd ~/social-network-prod/frontend
rm -rf dist
npm run build

# Nginx sync
echo "Refreshing Nginx webroot..."
sudo rm -rf /var/www/social-network-frontend/*
sudo cp -r ~/social-network-prod/frontend/dist/* /var/www/social-network-frontend/

# Restart services
echo "Restarting Gunicorn and Nginx..."
sudo systemctl daemon-reload
sudo systemctl restart gunicorn
sudo systemctl restart nginx
 
echo -e "${GREEN} Deploy complete!${NC}"
