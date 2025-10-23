#!/usr/bin/env bash
set -euo pipefail

### ─────────────────────────────────────────────────────────────────────────────
### Vars you may customize
### ─────────────────────────────────────────────────────────────────────────────
APP_DIR="/opt/mazzlabs-mail"
REPO_URL="https://github.com/J-mazz/Mazzlabs.works.git"
SERVICE_NAME="mazzlabs-mail"
RUN_USER="azureuser"   # or a dedicated app user if you prefer

DOMAIN="mazzlabs.works"
HOSTNAME_FQDN="mail.mazzlabs.works"

NODE_MAJOR="20"        # Debian 12 + Node 20 LTS is a good default
### ─────────────────────────────────────────────────────────────────────────────

echo "[1/9] OS & packages"
. /etc/os-release; echo "OS: $PRETTY_NAME"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git ufw openssl sqlite3 \
                        build-essential pkg-config python3 make g++ \
                        certbot

echo "[2/9] Node.js LTS via NodeSource"
if ! command -v node >/dev/null || ! node -v | grep -qE "v${NODE_MAJOR}\."; then
  # NodeSource repo (clean + repeatable)
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
npm -v

echo "[3/9] Directory & ownership"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"

echo "[4/9] Git clone or update"
if [ -n "$REPO_URL" ] && [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$RUN_USER" git clone "$REPO_URL" "$APP_DIR"
else
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    sudo -u "$RUN_USER" git config --global --add safe.directory "$APP_DIR" || true
    sudo -u "$RUN_USER" git fetch --all --prune || true
    sudo -u "$RUN_USER" git pull --ff-only || true
  else
    echo "No REPO_URL set and no .git present at $APP_DIR — assuming sources already copied."
  fi
fi

echo "[5/9] Install Node deps (production)"
cd "$APP_DIR"
if [ -f package-lock.json ]; then
  sudo -u "$RUN_USER" npm ci --omit=dev
else
  sudo -u "$RUN_USER" npm install --omit=dev
fi

# Optional: build client if present and script exists
if grep -q '"build:client"' package.json 2>/dev/null && [ -d client ]; then
  sudo -u "$RUN_USER" npm run build:client
fi

echo "[6/9] .env bootstrap (only creates if missing)"
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  sudo -u "$RUN_USER" bash -c "cat > '$ENV_FILE' <<'EOF'
PORT=3000
SMTP_PORT=25
SMTP_PORT_SECURE=465
IMAP_PORT=993
DOMAIN=${DOMAIN}
HOSTNAME=${HOSTNAME_FQDN}
TLS_KEY_PATH=/etc/letsencrypt/live/${HOSTNAME_FQDN}/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/${HOSTNAME_FQDN}/fullchain.pem
DB_PATH=${APP_DIR}/data/mail.db
JWT_SECRET=$(head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 48)
ADMIN_EMAIL=admin@${DOMAIN}
ADMIN_PASSWORD=$(head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 20)
EOF"
fi

echo "[7/9] Allow low ports for Node (bind 25/465/587/993 without root)"
NODEBIN=$(readlink -f "$(command -v node)")
sudo setcap 'cap_net_bind_service=+ep' "$NODEBIN"
getcap "$NODEBIN" || true

echo "[8/9] Systemd unit"
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sudo bash -c "cat > '$UNIT_FILE' <<'EOF'
[Unit]
Description=MazzLabs Mail (SMTP/IMAP/Web)
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/opt/mazzlabs-mail/.env
User=azureuser
WorkingDirectory=/opt/mazzlabs-mail
ExecStart=/usr/bin/node /opt/mazzlabs-mail/src/index.js
Restart=always
RestartSec=5
# Hardening (tune if the app needs more access)
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
EOF"
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager -l || true

echo "[9/9] Open host firewall (UFW) if in use"
if command -v ufw >/dev/null; then
  sudo ufw allow 25,465,587,993,3000/tcp
  sudo ufw allow 80,443/tcp
  sudo ufw --force enable
  sudo ufw status verbose || true
fi

echo "Bootstrap complete."
echo "Next: obtain TLS (once DNS resolves):"
echo "  sudo systemctl stop ${SERVICE_NAME}"
echo "  sudo certbot certonly --standalone -d ${HOSTNAME_FQDN} --non-interactive --agree-tos --email admin@${DOMAIN}"
echo "  sudo systemctl start ${SERVICE_NAME}"
echo "Check listeners:  sudo ss -ltnp | grep -E ':(25|465|587|993|3000)\\b'"
echo "Tail logs:        sudo journalctl -u ${SERVICE_NAME} -f"

