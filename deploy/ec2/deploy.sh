#!/usr/bin/env bash
# Update the live site to the latest code on the branch. Run on the server:
#   cd ~/store && ./deploy/ec2/deploy.sh            (defaults to the current branch)
#   ./deploy/ec2/deploy.sh main
set -euo pipefail
cd "$(dirname "$0")/../.."
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

echo "==> Fetching $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Applying database migrations"
npx prisma migrate deploy

echo "==> Building"
npm run build

echo "==> Restarting"
if pm2 describe store >/dev/null 2>&1; then
  pm2 reload store --update-env
else
  pm2 start deploy/ec2/ecosystem.config.cjs
fi
pm2 save >/dev/null

echo "==> Health check"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    echo "Site is up: $(curl -fsS http://127.0.0.1:3000/api/health)"
    exit 0
  fi
  sleep 2
done
echo "Health check failed. Logs: pm2 logs store --lines 100" >&2
exit 1
