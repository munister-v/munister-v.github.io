#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/poruch-app}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/poruch}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$BACKUP_DIR/.tmp-$STAMP"

mkdir -p "$WORK_DIR"
cd "$APP_DIR"

docker compose exec -T db pg_dump -U poruch -d poruch --format=custom > "$WORK_DIR/database.dump"
UPLOAD_PATH="$(docker volume inspect poruch-app_poruch_uploads --format '{{.Mountpoint}}')"
tar -C "$UPLOAD_PATH" -czf "$WORK_DIR/uploads.tar.gz" .

(cd "$WORK_DIR" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
tar -C "$WORK_DIR" -czf "$BACKUP_DIR/poruch-$STAMP.tar.gz" .
rm -rf "$WORK_DIR"

find "$BACKUP_DIR" -type f -name 'poruch-*.tar.gz' -mtime "+$KEEP_DAYS" -delete
echo "Created $BACKUP_DIR/poruch-$STAMP.tar.gz"
