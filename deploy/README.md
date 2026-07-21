# TaikoHub Deploy (Synology, Muster TaikoEat)

**GitHub Actions baut das Image (amd64) → GHCR. Die NAS zieht nur.** Kein Build auf
der NAS, kein docker-compose, kein Watchtower. Prod-Port **3007** (3006 = TaikoEat).

## Einmalig einrichten

### 1. Google OAuth (Google Cloud Console → Credentials → OAuth-Client "Web")
- **Authorized redirect URIs** (beide eintragen):
  - `http://localhost:3006/api/auth/login/callback` (lokal, hast du schon)
  - `https://<cloudflare-tunnel-url>/api/auth/login/callback` (prod — kommt aus Schritt 4)
- Client ID + Secret notieren.

### 2. GitHub
- Repo pushen. Der Workflow `.github/workflows/build.yml` laeuft bei push auf `main`
  und pusht `ghcr.io/propman4k/taikohub:latest` (+ SHA-Tag). Keine Extra-Secrets noetig
  (nutzt `GITHUB_TOKEN`).
- Danach unter **Repo → Packages** das Image `taikohub` auf **public** stellen
  (dann braucht die NAS keinen Token) — oder Schritt 3b.

### 3. NAS (`ssh mf@100.90.56.21`)
```bash
mkdir -p /volume1/docker/taikohub-data
nano /volume1/docker/taikohub-data/.env   # siehe server/.env.example
chmod 600 /volume1/docker/taikohub-data/.env
```
`.env` (prod) mindestens:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAILS=@taikonauten.com
SESSION_SECRET=<langer random string>
APP_URL=https://<cloudflare-tunnel-url>   # aus Schritt 4
NODE_ENV=production
PORT=3007
```
**3b (nur falls GHCR-Image privat):** Classic-PAT mit `read:packages` erzeugen und
ablegen: `echo "<pat>" > /volume1/docker/taikohub-data/.ghcr-token && chmod 600 ...`
Das Deploy-Script liest die Datei automatisch.

### 4. Cloudflare-Tunnel (auf der NAS)
```bash
ssh -t mf@100.90.56.21 "sudo /usr/local/bin/docker run -d \
  --name cloudflared-taikohub --restart unless-stopped --network host \
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://127.0.0.1:3007"
ssh mf@100.90.56.21 "sudo /usr/local/bin/docker logs cloudflared-taikohub 2>&1 \
  | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1"
```
Ausgegebene URL → in die `.env` als `APP_URL` eintragen **und** als Redirect-URI in
der Google Console ergaenzen (Schritt 1).

## Deployen
```bash
./deploy/deploy.sh
```
Backup → GHCR-Login/Pull → Container neu → Health-Check gegen `/api/health`.

## Persistenz
DB (`taikohub.db`, `sessions.db`) liegt im Volume `/volume1/docker/taikohub-data`
→ `/app/server/cache`, `.env` read-only gemountet. Rebuild/Restart loeschen nichts.

## ⚠️ Bekannte Schwachstelle: ephemerer Tunnel
Die `trycloudflare.com`-URL **rotiert bei jedem cloudflared-Neustart** — und reisst
dann OAuth (Redirect-URI + `APP_URL`) mit. Fuer eine Login-App wie TaikoHub ist das
laestig: nach jedem Tunnel-Neustart muessen `APP_URL` und die Google-Redirect-URI neu
gesetzt werden. **Empfehlung fuer Dauerbetrieb:** benannter Cloudflare-Tunnel mit fester
Subdomain statt des ephemeren `--url`. (Noch nicht umgesetzt — sag Bescheid.)
