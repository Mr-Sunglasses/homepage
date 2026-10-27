---
title: "Setup atuin.sh in android termux"
tags: [tools, android, termux, shell]
date: 2026-05-20
---

Today I setup [termux](https://github.com/termux/termux-app) in my android tablet and I want to setup my favourite shell history manager [atuin.sh](https://atuin.sh)

Here are the steps:

```
# update the packages
pkg update

# install atuin
pkg install atuin

# config shell mine: bash

curl https://raw.githubusercontent.com/rcaloras/bash-preexec/master/bash-preexec.sh -o ~/.bash-preexec.sh
echo '[[ -f ~/.bash-preexec.sh ]] && source ~/.bash-preexec.sh' >> ~/.bashrc

echo 'eval "$(atuin init bash)"' >> ~/.bashrc

```
