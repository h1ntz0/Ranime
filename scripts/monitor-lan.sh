#!/usr/bin/env bash
WIFI_IP=$(ipconfig.exe 2>/dev/null | grep -A 2 "Wi-Fi" | grep "IPv4" | head -1 | awk '{print $NF}' | tr -d '\r')
WSL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$WIFI_IP" ]; then WIFI_IP=$WSL_IP; fi
echo "────────────────────────────────────────"
echo " Ranime Monitoring"
echo " Local : http://localhost:3000/admin"
if [ -n "$WIFI_IP" ]; then
  echo " LAN   : http://$WIFI_IP:3000/admin"
  echo " WSL   : http://$WSL_IP:3000/admin"
fi
echo " API   : http://localhost:4000/api/health"
echo "────────────────────────────────────────"
if ! curl -sf http://localhost:3000 >/dev/null 2>&1; then
  echo " Dev server not running — starting 'npm run dev'..."
  (cd /mnt/d/WSL/Project/Ranime && npm run dev > /tmp/ranime-dev.log 2>&1 &)
  sleep 2
  echo " Started (log: /tmp/ranime-dev.log)"
else
  echo " Dev server is UP — http://localhost:3000 + http://$WIFI_IP:3000"
fi
# Try to ensure Windows port forwarding for LAN (requires admin, best-effort)
if [ -n "$WIFI_IP" ] && [ -n "$WSL_IP" ] && [ "$WIFI_IP" != "$WSL_IP" ]; then
  powershell.exe -Command "netsh interface portproxy add v4tov4 listenaddress=$WIFI_IP listenport=3000 connectaddress=$WSL_IP connectport=3000 2>&1 | Out-Null; netsh interface portproxy add v4tov4 listenaddress=$WIFI_IP listenport=4000 connectaddress=$WSL_IP connectport=4000 2>&1 | Out-Null; Write-Host 'PortProxy ensured'" 2>/dev/null | tr -d '\r'
fi
