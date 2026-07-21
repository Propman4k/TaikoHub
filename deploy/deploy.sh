#!/usr/bin/env bash
# TaikoHub -> Synology deployen (Muster TaikoEat): GitHub Actions baut das Image
# und pusht nach GHCR, die NAS zieht nur das fertige Image. Kein Build auf der NAS.
set -euo pipefail

# ── Konfiguration ────────────────────────────────────────────────────────────
SYNOLOGY_HOST="mf@100.90.56.21"                       # Tailscale-IP
DOCKER="sudo /usr/local/bin/docker"
IMAGE="ghcr.io/propman4k/taikohub:latest"
CONTAINER="taikohub"
PORT=3007                                              # 3006 ist von TaikoEat belegt
DATA_VOL="/volume1/docker/taikohub-data"              # Persistenz: DB + .env

echo "==> Pre-Deploy-Backup der DB (falls vorhanden)"
# WAL-Modus: blosses cp der .db verliert uncommittete WAL-Inhalte. Laeuft der
# Container, nutzen wir die SQLite-Backup-API (konsistent); sonst cp inkl. -wal/-shm.
TS=$(date +%Y%m%d-%H%M%S)
ssh "$SYNOLOGY_HOST" "
  if $DOCKER ps --format '{{.Names}}' | grep -qx $CONTAINER; then
    $DOCKER exec $CONTAINER node -e \"require('better-sqlite3')('/app/server/cache/taikohub.db').backup('/app/server/cache/taikohub-$TS.db').then(()=>process.exit(0),(e)=>{console.error(e);process.exit(1)})\"
  elif [ -f $DATA_VOL/taikohub.db ]; then
    cp $DATA_VOL/taikohub.db $DATA_VOL/taikohub-$TS.db
    [ -f $DATA_VOL/taikohub.db-wal ] && cp $DATA_VOL/taikohub.db-wal $DATA_VOL/taikohub-$TS.db-wal || true
    [ -f $DATA_VOL/taikohub.db-shm ] && cp $DATA_VOL/taikohub.db-shm $DATA_VOL/taikohub-$TS.db-shm || true
  else
    echo 'keine DB, skip'
  fi
  # Rotation: nur die letzten 10 Backups behalten (gezielte Dateipfade, nie Ordner)
  cd $DATA_VOL && ls -t taikohub-*.db 2>/dev/null | tail -n +11 | while read f; do rm -f \"\$f\" \"\$f-wal\" \"\$f-shm\"; done
"

echo "==> GHCR-Login (falls Token hinterlegt) + Image ziehen"
ssh "$SYNOLOGY_HOST" "
  if [ -f $DATA_VOL/.ghcr-token ]; then
    cat $DATA_VOL/.ghcr-token | $DOCKER login ghcr.io -u propman4k --password-stdin
  fi
  $DOCKER pull $IMAGE
"

echo "==> Container neu starten"
ssh "$SYNOLOGY_HOST" "
  $DOCKER stop $CONTAINER 2>/dev/null || true
  $DOCKER rm $CONTAINER 2>/dev/null || true
  $DOCKER run -d --name $CONTAINER --restart unless-stopped \
    -p 127.0.0.1:${PORT}:${PORT} \
    -v ${DATA_VOL}:/app/server/cache \
    -v ${DATA_VOL}/.env:/app/server/.env:ro \
    $IMAGE
  $DOCKER image prune -f
"

echo "==> Health-Check"
for i in $(seq 1 12); do
  if ssh "$SYNOLOGY_HOST" "curl -sf http://127.0.0.1:$PORT/api/health >/dev/null"; then
    echo "OK — laeuft."; exit 0
  fi
  sleep 5
done
echo "WARN: Health-Check nicht bestanden — Logs: $DOCKER logs $CONTAINER"; exit 1
