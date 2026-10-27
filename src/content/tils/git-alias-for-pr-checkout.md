---
title: "Git alias for PR checkout"
tags: [git, github, alias]
date: 2026-05-04
---

I was attending the django PR review session organized by Lilian today on [djangonaut] discord server, and I came across an alias that she uses to checkout a pull request locally and it is quite amazing.

```
[alias]
    pr = !sh -c \"git fetch upstream pull/${1}/head:pr/${1} && git checkout pr/${1}\"

```

You need to set this alias to `~/.gitconfig` and the upstream repo, to the same repo which you want to checkout the PR of.

and then just use :-

```
git pr <pr-number>
```

and whooa! 🎉 you checkout to that PR in your local repo.

ref: [Django Docs]

[djangonaut]: https://djangonaut.space/

[Django Docs]: https://docs.djangoproject.com/en/6.0/internals/contributing/committing-code/#:~:text=git
