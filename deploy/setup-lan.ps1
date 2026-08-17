# One-shot setup: exposes the WSL app on the Windows LAN so the phone can reach it.
# Run this in PowerShell AS ADMINISTRATOR, after starting the app in WSL (npm run dev + docker-compose up -d nginx).
$ErrorActionPreference = 'Stop'

# 1) Get the WSL (NAT) IP
$wslip = (wsl.exe -e sh -c "hostname -I" 2>$null | Select-Object -First 1).Trim().Split(' ')[0]
if (-not $wslip) { throw 'Could not get WSL IP. Is the WSL app running?' }
Write-Host "WSL IP: $wslip"

# 2) Firewall inbound rules (idempotent)
netsh advfirewall firewall add rule name="AnimeRate 80" dir=in action=allow protocol=TCP localport=80 profile=any | Out-Null
netsh advfirewall firewall add rule name="AnimeRate 3000" dir=in action=allow protocol=TCP localport=3000 profile=any | Out-Null

# 3) Portproxy LAN -> WSL
foreach ($p in 80,3000,4000) {
  netsh interface portproxy delete v4tov4 listenport=$p listenaddress=0.0.0.0 2>$null | Out-Null
  netsh interface portproxy add v4tov4 listenport=$p listenaddress=0.0.0.0 connectport=$p connectaddress=$wslip | Out-Null
}

Write-Host "Done. From your phone (same Wi-Fi): http://10.10.3.222"
