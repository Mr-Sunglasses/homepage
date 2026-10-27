---
title: "How to give your agent a headless browser on Raspberry PI 5?"
tags: [agents, bash, freedom, hermes, linux, terminal]
date: 2026-09-19
---

Give your AI agents and AI harness a local headless browser so that they can see and validate the website changes and share you screenshots of their changes and a lot more!

Install chromium and check if gpu is available
```
sudo apt update
sudo apt install -y chromium
sudo usermod -aG video,render $USER   # GPU access via /dev/dri; log out/in afterwards
ls -l /dev/dri                        # should show card0 and renderD128
```

Quick check if it is working by capturing the screenshot
```
chromium --headless=new \
  --ozone-platform=headless \
  --use-gl=angle --use-angle=gles-egl \
  --ignore-gpu-blocklist --enable-gpu-rasterization \
  --disable-dev-shm-usage \
  --window-size=1280,1600 \
  --screenshot=$HOME/gpu.png chrome://gpu
```

See if `$HOME/gpu.png` is there and all things are fine or not!

`systemd` script to run it as a systemd service

- use `sudo nano /etc/systemd/system/chromium-headless.service` and paste the below script. 

```
# /etc/systemd/system/chromium-headless.service
[Unit]
Description=Headless Chromium (GPU)
After=network-online.target

[Service]
User=anton
Environment=HOME=/home/anton
ExecStart=/snap/bin/chromium --headless=new \
  --ozone-platform=headless \
  --use-gl=angle --use-angle=gles-egl \
  --ignore-gpu-blocklist --enable-gpu-rasterization \
  --disable-dev-shm-usage \
  --remote-debugging-port=9222 \
  --user-data-dir=/home/anton/chromium-profile \
  about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable the `chrome-headless` service

```
sudo systemctl daemon-reload
sudo systemctl enable --now chromium-headless
```

Run if you want to check the logs:

```
journalctl -u chromium-headless -f
```

Check if it is up or not

```
curl http://127.0.0.1:9222/json/version   # confirms it's up
```

If the browser fails then use this command to check last 50 logs

```
journalctl -u chromium-headless -n 50
```
