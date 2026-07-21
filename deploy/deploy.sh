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
ssh "$SYNOLOGY_HOST" "test -f $DATA_VOL/taikohub.db && \
  cp $DATA_VOL/taikohub.db $DATA_VOL/taikohub-\$(date +%Y%m%d-%H%M%S).db || echo 'keine DB, skip'"

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
