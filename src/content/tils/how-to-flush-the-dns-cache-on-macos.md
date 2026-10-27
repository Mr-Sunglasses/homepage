---
title: "How to flush the DNS cache on macOS"
tags: [macos, terminal, bash, dns]
date: 2026-07-13
---

`sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`

mDNSResponder handles DNS caching in modern macOS, so the killall -HUP restarts it without actually killing your network connection.
