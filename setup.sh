#!/bin/sh
# NovaHost — one-command setup
# Usage: ./setup.sh

set -e

DOMAINS="
  mojefirma.cz
  www.mojefirma.cz
  novahost.local
  test1.cz
  test2.cz
  test3.cz
  test2026.com
  random.cz
  testtest.com
  testtc.cz
  testsws.cz
"

echo "=============================="
echo "  NovaHost Setup"
echo "=============================="

# --- /etc/hosts ---
echo ""
echo "[1/2] Adding test domains to /etc/hosts (needs sudo)..."
ADDED=0
for domain in $DOMAINS; do
  domain=$(echo "$domain" | tr -d ' ')
  [ -z "$domain" ] && continue
  if grep -q "$domain" /etc/hosts 2>/dev/null; then
    echo "  skip  $domain (already present)"
  else
    echo "127.0.0.1 $domain" | sudo tee -a /etc/hosts > /dev/null
    echo "  added $domain"
    ADDED=$((ADDED + 1))
  fi
done

# Flush DNS cache on macOS so changes take effect immediately
if [ "$(uname)" = "Darwin" ]; then
  sudo dscacheutil -flushcache 2>/dev/null || true
  sudo killall -HUP mDNSResponder 2>/dev/null || true
  echo "  DNS cache flushed"
fi

# --- Docker Compose ---
echo ""
echo "[2/3] Starting Docker containers (build if needed)..."
docker compose up --build -d

# --- Auto-hosts watcher ---
echo ""
echo "[3/3] Starting auto-hosts watcher..."
# Kill any existing watcher first
sudo pkill -f auto-hosts.sh 2>/dev/null || true
sudo sh -c "nohup '$(pwd)/auto-hosts.sh' >> /tmp/novahost-hosts.log 2>&1 &"
echo "  Watcher running — new domains will appear in /etc/hosts within 3s automatically."
echo "  Logs: /tmp/novahost-hosts.log"

echo ""
echo "=============================="
echo "  All done!"
echo "=============================="
echo ""
echo "  Frontend  →  http://localhost:5274"
echo "  Backend   →  http://localhost:8765"
echo "  Apache    →  http://localhost:8080"
echo "  FTP       →  localhost:21"
echo ""
echo "  FileZilla settings:"
echo "    Host:       localhost"
echo "    Port:       21"
echo "    Protocol:   FTP - File Transfer Protocol"
echo "    Encryption: Only use plain FTP (insecure)"
echo "    Login type: Normal"
echo "    (credentials shown in dashboard after adding a domain)"
echo ""
echo "  Test domains (add them in the UI first, then open here):"
for domain in $DOMAINS; do
  domain=$(echo "$domain" | tr -d ' ')
  [ -z "$domain" ] && continue
  echo "    http://$domain:8080"
done
echo ""
echo "  To watch logs:  docker compose logs -f"
echo "  To stop:        docker compose down"
echo ""
