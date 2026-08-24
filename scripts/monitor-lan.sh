#!/usr/bin/env bash
# Ranime LAN Monitoring helper — prints LAN URL and ensures dev is reachable
WIFI_IP=$(ipconfig.exe 2>/dev/null | grep -A 2 "Wi-Fi" | grep "IPv4" | head -1 | awk '{print $NF}' | tr -d '\r')
if [ -z "$WIFI_IP" ]; then WIFI_IP=$(hostname -I | awk '{print $1}'); fi
echo "────────────────────────────────────────"
echo " Ranime Monitoring"
echo " Local : http://localhost:3000/admin"
if [ -n "$WIFI_IP" ]; then
  echo " LAN   : http://$WIFI_IP:3000/admin"
fi
echo " API   : http://localhost:4000/api/health"
echo "────────────────────────────────────────"
# Check if dev is running
if ! curl -sf http://localhost:3000 >/dev/null 2>&1; then
  echo " Dev server not running — starting 'npm run dev'..."
  (cd /mnt/d/WSL/Project/Ranime && npm run dev > /tmp/ranime-dev.log 2>&1 &)
  echo " Started (log: /tmp/ranime-dev.log)"
else
  echo " Dev server is UP"
fi
