# Deploy on AWS EC2

The site runs as one Node.js process (Next.js) behind **nginx** (HTTPS) and is kept alive by **PM2**. A **cron job** expires unpaid orders every 15 minutes.

```
Customer ──HTTPS──> nginx :443 ──> Next.js :3000 (PM2) ──> PostgreSQL (Supabase, RDS or same server)
                                        └──> uploads: Supabase Storage or local disk (.data/)
Android app ──HTTPS──> same domain /api/mobile/*
Payment gateways ──HTTPS callbacks──> /api/payments/*/callback
```

Files used: `deploy/ec2/server-setup.sh`, `deploy/ec2/deploy.sh`, `deploy/ec2/ecosystem.config.cjs`, `deploy/ec2/nginx.conf`, `deploy/ec2/store-proxy.conf`, `deploy/ec2/crontab.txt`.

---

## 1. Decide where the database and images live

| | Option A (recommended) | Option B (everything on one server) |
|---|---|---|
| Database | Supabase Postgres (free tier, automatic backups) | PostgreSQL on the EC2 machine (`LOCAL_DB=1`) |
| Images and payment screenshots | Supabase Storage | Local disk in `~/store/.data` (`ALLOW_LOCAL_STORAGE=1`) |
| Backups | Handled by Supabase | **You** must back up the database and `.data/` (section 9) |

You can also mix them, e.g. Supabase for the database and local disk for images.

## 2. Create the EC2 instance

1. AWS console → EC2 → **Launch instance**.
   - **Name:** `store`
   - **Image:** **Ubuntu Server 24.04 LTS** (64-bit x86)
   - **Instance type:** `t3.small` (2 GB RAM) is the minimum; `t3.medium` is more comfortable. The setup script adds 2 GB of swap for builds.
   - **Key pair:** create one and download the `.pem` file.
   - **Network:** allow **SSH (22) from My IP**, **HTTP (80)** and **HTTPS (443) from anywhere**.
   - **Storage:** 20–30 GB gp3.
   - **Region:** Mumbai (`ap-south-1`) or Bahrain (`me-south-1`) are closest to Pakistan.
2. EC2 → **Elastic IPs** → *Allocate*, then *Associate* it with the instance (so the IP never changes).
3. At your domain registrar, create DNS records:
   - `A  yourstore.pk  → <Elastic IP>`
   - `A  www          → <Elastic IP>`

## 3. Connect and prepare the server

From your computer:

```bash
chmod 400 store-key.pem
```

```bash
ssh -i store-key.pem ubuntu@<Elastic IP>
```

On the server, get the code. The repository is private, so create a read-only **deploy key**:

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
```

```bash
cat ~/.ssh/id_ed25519.pub
```

Add that key in GitHub → `rafey581/store` → Settings → **Deploy keys** → *Add deploy key* (read-only), then:

```bash
git clone git@github.com:rafey581/store.git ~/store
```

Run the one-time setup. It installs Node 22, PM2, nginx, certbot and the firewall, and adds swap. Use `LOCAL_DB=1` only for option B:

```bash
cd ~/store && bash deploy/ec2/server-setup.sh
```

```bash
cd ~/store && LOCAL_DB=1 bash deploy/ec2/server-setup.sh
```

The last line it prints is a `sudo env PATH=... pm2 startup ...` command. Run it if it asks you to.

## 4. Create the `.env` file

```bash
cd ~/store && cp .env.example .env && nano .env
```

Fill in at least these values. Generate secrets with `openssl rand -base64 32`.

```env
DATABASE_URL="..."                 # Supabase pooled URL (port 6543, ?pgbouncer=true) or local from ~/db-credentials.txt
DIRECT_URL="..."                   # Supabase direct URL (port 5432) or the same local URL
NEXT_PUBLIC_SITE_URL="https://yourstore.pk"
AUTH_SECRET="<random>"
CRON_SECRET="<random>"
MOBILE_JWT_SECRET="<random, 32+ characters>"

# Option A: Supabase Storage
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
# Option B: local disk instead
# ALLOW_LOCAL_STORAGE="1"

RESEND_API_KEY="..."
EMAIL_FROM="My Store <orders@yourstore.pk>"
NEXT_PUBLIC_DEVELOPER_SOLANA_ADDRESS="..."
# Payment gateway keys: see docs/PAYMENTS.md
```

`NEXT_PUBLIC_*` values are baked in at build time. If you change them, run `./deploy/ec2/deploy.sh` again.

Protect the file:

```bash
chmod 600 .env
```

For Supabase Storage, create a **public** bucket `product-images` and a **private** bucket `payment-proofs` in the Supabase dashboard.

## 5. First deploy

Create the tables, then create the owner account. Use your own email and a strong password:

```bash
cd ~/store && npm ci && npx prisma migrate deploy
```

```bash
SEED_OWNER_EMAIL="you@yourstore.pk" SEED_OWNER_PASSWORD='Use-A-Strong-Password-1' SEED_STORE_NAME="My Store" SEED_DEMO=false npm run db:seed
```

Build and start (installs, migrates, builds, starts PM2 and runs a health check):

```bash
./deploy/ec2/deploy.sh
```

It should end with `Site is up: {"ok":true,"db":"up",...}`.

## 6. nginx and HTTPS

```bash
sudo cp deploy/ec2/store-proxy.conf /etc/nginx/snippets/store-proxy.conf
```

```bash
sudo cp deploy/ec2/nginx.conf /etc/nginx/sites-available/store
```

Replace the example domain with yours:

```bash
sudo sed -i 's/yourstore.pk/YOURDOMAIN.COM/g' /etc/nginx/sites-available/store
```

```bash
sudo ln -sf /etc/nginx/sites-available/store /etc/nginx/sites-enabled/store && sudo rm -f /etc/nginx/sites-enabled/default
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Get a free SSL certificate. It renews automatically, and certbot also redirects HTTP to HTTPS:

```bash
sudo certbot --nginx -d yourstore.pk -d www.yourstore.pk --redirect -m you@yourstore.pk --agree-tos -n
```

Open `https://yourstore.pk` and `https://yourstore.pk/admin`.

## 7. Cron job (order expiry)

```bash
crontab -e
```

Paste the line from `deploy/ec2/crontab.txt`, then check it works:

```bash
. ~/store/.env; curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/expire-orders
```

Expected output: `{"expired":0,"reconciled":0,"cartsCleaned":0}`.

## 8. Updating the site later

> Until the pull request is merged into `main`, the latest code is on the `website-build` branch: clone with `git clone -b website-build ...` or run `./deploy/ec2/deploy.sh website-build`.


After pushing new code to GitHub:

```bash
ssh -i store-key.pem ubuntu@<Elastic IP>
```

```bash
cd ~/store && ./deploy/ec2/deploy.sh main
```

Useful commands:

```bash
pm2 status
```

```bash
pm2 logs store --lines 100
```

```bash
pm2 restart store
```

## 9. Backups (option B only)

Daily database dump and uploads archive, kept 14 days. Add to `crontab -e`:

```
30 2 * * * mkdir -p ~/backups && pg_dump "$(grep ^DIRECT_URL ~/store/.env | cut -d'"' -f2)" | gzip > ~/backups/db-$(date +\%F).sql.gz && tar czf ~/backups/uploads-$(date +\%F).tgz -C ~/store .data && find ~/backups -mtime +14 -delete
```

Copy backups off the server regularly, for example to S3 with `aws s3 sync ~/backups s3://your-bucket/store-backups`. Also enable EBS snapshots (EC2 → Lifecycle Manager).

## 10. Go-live checklist

- [ ] `https://yourstore.pk/api/health` returns `{"ok":true,"db":"up"}`
- [ ] The owner can sign in at `/admin`, and the demo owner/staff accounts are not present (`SEED_DEMO=false`)
- [ ] Store settings: name, phone, WhatsApp, address, bank accounts, shipping rates, payment methods
- [ ] Pages: review About / Contact / policies
- [ ] A test order with bank transfer: upload proof, approve, ship. Emails arrive (Resend domain verified).
- [ ] Payment gateways: register the callback URLs and do one sandbox payment each (docs/PAYMENTS.md)
- [ ] Cron job runs (check `/var/log/store/cron.log` after 15 minutes)
- [ ] The Android app's `apiUrl` points to `https://yourstore.pk` (docs/MOBILE.md)
- [ ] Backups are set up (option B) or Supabase backups are enabled (option A)

## Troubleshooting

| Problem | Fix |
|---|---|
| `502 Bad Gateway` | The app isn't running: `pm2 logs store`, then `./deploy/ec2/deploy.sh` |
| Build killed / out of memory | Use t3.small or larger; check swap with `free -h` |
| Image upload fails with "Storage is not configured" | Set the Supabase variables or `ALLOW_LOCAL_STORAGE="1"`, then `pm2 restart store --update-env` |
| `413 Request Entity Too Large` | `client_max_body_size 10m;` must be in the nginx server block |
| Logged out immediately / CSRF errors | `NEXT_PUBLIC_SITE_URL` must be the exact https domain; rebuild after changing it |
| Payment callbacks not arriving | The site must be reachable over HTTPS from the internet; check `pm2 logs store \| grep payments` |
