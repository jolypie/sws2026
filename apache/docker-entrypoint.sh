#!/bin/sh
set -e

CONF="/usr/local/apache2/conf/extra/httpd-vhosts.conf"

# Background watcher — polls httpd-vhosts.conf every 3s, graceful-reloads Apache on change
(
    sleep 5
    LAST_SUM=$(md5sum "$CONF" 2>/dev/null | cut -d' ' -f1)
    while true; do
        sleep 3
        CURRENT_SUM=$(md5sum "$CONF" 2>/dev/null | cut -d' ' -f1)
        if [ -n "$CURRENT_SUM" ] && [ "$CURRENT_SUM" != "$LAST_SUM" ]; then
            LAST_SUM="$CURRENT_SUM"
            echo "[apache-watcher] Config changed — graceful reload"
            httpd -k graceful 2>/dev/null || true
        fi
    done
) &

exec httpd-foreground
