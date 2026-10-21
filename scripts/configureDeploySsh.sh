#!/usr/bin/env bash
set -euo pipefail
install -m 700 -d ~/.ssh
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519
printf '%s\n' "$VPS_KNOWN_HOSTS" > ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
