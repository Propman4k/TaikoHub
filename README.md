# TaikoHub

Ein iOS-artiges Dashboard, das die verstreuten Taikonauten-Tools an einem Ort buendelt.
Farbige App-Icons auf heller Flaeche, frei verschiebbar oder am Raster ausgerichtet,
per Klick oeffnet sich die jeweilige App (im Browser-Fenster oder als installierte macOS-PWA).

## Features

- **Google-Login** (nur `@taikonauten.com`), Multi-User.
- **Teilen:** eigene Tools privat halten oder mit Kolleg:innen teilen. Geteilte Icons
  kann der Empfaenger frei anordnen und aus-/einblenden, aber nicht bearbeiten/loeschen.
- **Pro-Person-Layout:** jede:r ordnet die Flaeche unabhaengig an.
- **Lokaler PWA-Launcher** (optional, macOS): oeffnet installierte Web-Apps statt Browser.

## Stack

- Client: Vite + React 19 + Tailwind v4 + lucide-react
- Server: Express 5 + better-sqlite3 + express-session, Google OAuth (googleapis)
- Deploy: Docker-Image via GHCR → Synology, Cloudflare Tunnel

## Entwicklung

```bash
npm install && npm --prefix server install
cp server/.env.example server/.env   # Google-Credentials eintragen
npm run dev                           # Client :3005, Server :3006
```

## Deploy

Siehe [deploy/README.md](deploy/README.md).

## Tools als installierte App oeffnen (optional, macOS)

In den **Einstellungen** den **TaikoHub Opener** herunterladen und installieren. Er
registriert das `taikohub://`-Schema und oeffnet Tools als installierte macOS-App
(funktioniert auch im Safari-PWA). Danach bei einer App die "macOS-App"
(Bundle-Name aus `~/Applications`) setzen.
