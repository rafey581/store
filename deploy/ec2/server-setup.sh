#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 EC2 instance. Run as the "ubuntu" user from the cloned repo:
#   cd ~/store && bash deploy/ec2/server-setup.sh
# Pass LOCAL_DB=1 to also install PostgreSQL on this machine.
set -euo pipefail

echo "==> System packages"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y git curl nginx certbot python3-certbot-nginx ufw

echo "==> 2 GB swap (Next.js builds need memory on small instances)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Node.js 22 LTS + PM2"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pm2@7

echo "==> Log folder"
sudo mkdir -p /var/log/store
sudo chown "$USER":"$USER" /var/log/store

if [ "${LOCAL_DB:-0}" = "1" ]; then
  echo "==> PostgreSQL 16 on this server"
  sudo apt-get install -y postgresql
  DB_PASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER store WITH PASSWORD '$DB_PASS';" -c "CREATE DATABASE store OWNER store;"
  echo "DATABASE_URL=\"postgresql://store:$DB_PASS@127.0.0.1:5432/store\"" > ~/db-credentials.txt
  echo "DIRECT_URL=\"postgresql://store:$DB_PASS@127.0.0.1:5432/store\"" >> ~/db-credentials.txt
  chmod 600 ~/db-credentials.txt
  echo "Database created. Connection strings saved in ~/db-credentials.txt"
fi

echo "==> Firewall: SSH + HTTP + HTTPS only"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "==> PM2 starts on boot"
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1

echo
echo "Done. Next: clone the repo, create .env, run ./deploy/ec2/deploy.sh (see docs/DEPLOY-EC2.md)."
