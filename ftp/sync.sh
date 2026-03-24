#!/bin/sh
# Syncs ftp_users from PostgreSQL → Pure-FTPd virtual users

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
PDB_FILE="/etc/pure-ftpd/pureftpd.pdb"
PASSWD_FILE="/etc/pure-ftpd/pureftpd.passwd"

ROWS=$(psql "$DB_URL" -t -A -F'|' -c \
  "SELECT ftp_login, ftp_password, ftp_dir FROM ftp_users" 2>/dev/null)

if [ -z "$ROWS" ]; then
  exit 0
fi

changed=0

echo "$ROWS" | while IFS='|' read -r login password dir; do
  [ -z "$login" ] && continue

  mkdir -p "$dir"

  if pure-pw show "$login" -f "$PASSWD_FILE" >/dev/null 2>&1; then
    printf "%s\n%s\n" "$password" "$password" | \
      pure-pw passwd "$login" -f "$PASSWD_FILE" >/dev/null 2>&1
  else
    printf "%s\n%s\n" "$password" "$password" | \
      pure-pw useradd "$login" -u ftpvirtual -d "$dir" -f "$PASSWD_FILE" >/dev/null 2>&1
    changed=1
  fi
done

pure-pw mkdb "$PDB_FILE" -f "$PASSWD_FILE" >/dev/null 2>&1
