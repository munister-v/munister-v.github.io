# Poruch operations

## Deployment

The application runs from `/opt/poruch-app` with Docker Compose. The app binds
only to `127.0.0.1:3100`; Nginx is the public TLS boundary.

```sh
cd /opt/poruch-app
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3100/readyz
```

## Backups

`backup.sh` creates one archive containing a PostgreSQL custom-format dump,
uploaded report files, and SHA-256 checksums. Backups are retained for 14 days
by default.

Restore into an empty deployment:

```sh
tar -xzf /var/backups/poruch/poruch-TIMESTAMP.tar.gz -C /tmp/poruch-restore
cd /opt/poruch-app
docker compose exec -T db pg_restore -U poruch -d poruch --clean --if-exists \
  < /tmp/poruch-restore/database.dump
UPLOAD_PATH="$(docker volume inspect poruch-app_poruch_uploads --format '{{.Mountpoint}}')"
tar -xzf /tmp/poruch-restore/uploads.tar.gz -C "$UPLOAD_PATH"
```

Keep an encrypted off-server copy. A backup on the same VPS is operational
convenience, not disaster recovery.

## First administrator

Register the operator through the normal UI, then grant the role directly in
PostgreSQL. Administrative access is never inferred from an unverified email.

```sh
docker compose exec -T db psql -U poruch -d poruch \
  -c "UPDATE users SET is_admin=TRUE WHERE email='operator@example.com';"
```
