#!/bin/sh
set -e

PASSWD_FILE="/etc/pure-ftpd/pureftpd.passwd"
PDB_FILE="/etc/pure-ftpd/pureftpd.pdb"

mkdir -p /etc/pure-ftpd /home/ftpusers

# Create the shared system user that virtual users map to
if ! id ftpvirtual >/dev/null 2>&1; then
  adduser -D -h /home/ftpusers -s /sbin/nologin ftpvirtual
fi

# Init empty passwd file if missing
touch "$PASSWD_FILE"
pure-pw mkdb "$PDB_FILE" -f "$PASSWD_FILE" 2>/dev/null || true

# First sync before starting
/sync.sh || true

# Background sync loop (every 30 seconds)
(while true; do sleep 30; /sync.sh || true; done) &

exec pure-ftpd \
  -l puredb:"$PDB_FILE" \
  -p 30000:30009 \
  -P "${PUBLICHOST:-localhost}" \
  -j \
  -R
