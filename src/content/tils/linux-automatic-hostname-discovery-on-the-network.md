---
title: "Linux automatic hostname discovery on the network"
tags: [linux, networking]
date: 2025-12-04
---

# How to setup automatic hostname discovery on the network

- Installation (Debian/Ubuntu)

```
sudo apt update
sudo apt install avahi-daemon libnss-mdns
```

- Installation (Fedora/RHEL)

```
sudo dnf install avahi avahi-tools nss-mdns
```

- Start the service

```
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

- Check the hostname

By default, your device’s mDNS name is:

```
<hostname>.local
```

You can verify your hostname:

```
hostnamectl
```

Example output:

```
Static hostname: anton
```

So `anton` is your hostname

So the mDNS name will be:

```
anton.local
```

- If you want to change it:

```
sudo hostnamectl set-hostname <your new hostname>
```

- Then restart Avahi:

```
sudo systemctl restart avahi-daemon
```

- Firewall Setup (Fedora/RHEL)

```
sudo firewall-cmd --add-service=mdns --permanent
sudo firewall-cmd --reload
```

- To Verify if it is setuo correctly

Run From another machine on the same network (Linux/macOS):

```
ping <hostname>.local
```
