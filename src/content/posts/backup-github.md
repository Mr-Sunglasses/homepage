---
title: Your GitHub Repos Aren't Safe
date: 2026-05-28
description: 'Your code is one outage or ban away from being gone forever. Here''s how to back up your GitHub repos on your selfhosted machine before it''s too late.'
image: './assets/images/gitbackup-cover.png'
tags: ['github', 'selfhosting', 'homelab', 'backups']
kind: article
---

Recently, a lot of chaos has been going on with GitHub. Their uptime has reduced significantly, possibly because a lot of non-coders are jumping into coding with the help of AI agents and GitHub is their first choice for hosting code and the platform isn't ready for this scale of traffic. Another reason for this chaos is the growing number of supply chain attacks on GitHub, targeting the platform's infrastructure and stealing data from many private repos.

<iframe width="560" height="315" src="https://www.youtube.com/embed/m5t08CREHcE?si=9y4NtcRSda_Gb3V5" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

<iframe width="560" height="315" src="https://www.youtube.com/embed/ykRP5a71l4U?si=t9z4ct4bsb849lAJ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

In one of these recent supply chain attacks, a friend of mine had his GitHub account compromised [^1]. GitHub then flagged his account as a potential security risk and banned him [^2]. During our discussion about the incident, we talked about the importance of local backups and how dependent we've become on these providers and why we need to reclaim our freedom by reducing that dependency.

That conversation gave me the idea to create a project:

::github{repo="homelabshq/gitea-gh-mirror"}

It provides a simple way to back up your GitHub repos on your self-hosted machine by wrapping up [Gitea](https://about.gitea.com/) and [gitea-mirror](https://github.com/RayLabsHQ/gitea-mirror) in a single curated `docker-compose` file which is very easy to set up and use, so you can always have a local copy of your work and avoid being locked out if something happens to your account.

This post is not a rant against GitHub, and I'm not discouraging you from using it. In fact, I strongly believe we should give the GitHub team some time to address all of this. They are, after all, the platform that provides developers (and especially open source projects) a tremendous amount of free resources and compute.

![shadcn twitter post](./assets/images/shadcn-post.jpg)

> I fully agree with what shadcn says here. Source: [X post](https://x.com/shadcn/status/2049638947370709052)

That said, I also believe we should control our own data and maintain a local backup of our work. Having a local mirror of your GitHub repos is simply good practice to save from shooting yourself in the foot.

[^1]: [X post](https://x.com/jatinkrmalik/status/2059183745283047900?s=20) - My friend's GitHub account getting compromised
[^2]: [X post](https://x.com/jatinkrmalik/status/2059213260973625597?s=20) - My friend explaining the supply chain attack and GitHub banning his account
