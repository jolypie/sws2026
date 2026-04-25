#!/bin/sh
# Watches httpd-vhosts.conf and automatically adds new domains to /etc/hosts.
# Must run as root (started via sudo from setup.sh).

VHOSTS="$(cd "$(dirname "$0")" && pwd)/apache-config/httpd-vhosts.conf"

echo "[auto-hosts] Watching for new domains..."

while true; do
    domains=$(grep "^# AUTO-GENERATED:" "$VHOSTS" 2>/dev/null | sed 's/^# AUTO-GENERATED: //')
    for domain in $domains; do
        [ -z "$domain" ] && continue
        if ! grep -q "127\.0\.0\.1.*${domain}" /etc/hosts 2>/dev/null; then
            echo "127.0.0.1 $domain" >> /etc/hosts
            dscacheutil -flushcache 2>/dev/null || true
            killall -HUP mDNSResponder 2>/dev/null || true
            echo "[auto-hosts] Added: $domain"
        fi
    done
    sleep 3
done
