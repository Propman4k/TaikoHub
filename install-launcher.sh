#!/bin/zsh
# TaikoHub-Launcher als LaunchAgent installieren (Autostart beim Login).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="com.taikonauten.taikohub-launcher.plist"
DEST="$HOME/Library/LaunchAgents/$PLIST"

# Alten manuellen Launcher auf Port 7890 beenden (falls laeuft)
lsof -ti tcp:7890 | xargs kill 2>/dev/null || true

cp "$DIR/$PLIST" "$DEST"
launchctl bootout "gui/$(id -u)/com.taikonauten.taikohub-launcher" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
sleep 1

echo "Status:"
curl -s http://127.0.0.1:7890/ && echo "  <- Launcher laeuft" || echo "  Launcher NICHT erreichbar (siehe $DIR/launcher.log)"
echo
echo "Deinstallieren: launchctl bootout gui/$(id -u)/com.taikonauten.taikohub-launcher && rm \"$DEST\""
